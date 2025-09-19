import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

import { db } from "./db";
import { images, consultations, insertChatbotSettingsSchema } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { ChatbotSettingsData } from "./storage";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated, skipAuthForWebhook } from "./simpleAuth";
import cors from "cors";
import { exportConsultationsToCSV } from "./services/csvExport";

// Enhanced image processing function with security and thumbnail generation
async function processConsultationImage(consultationId: number, imagePath: string, hasImage: string) {
  try {
    console.log("🖼️ Processing image for consultation:", consultationId);

    // Only process if has_image is "true"
    if (hasImage !== "true") {
      console.log("ℹ️ Skipping image processing: has_image is not 'true'");
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const THUMBNAIL_SIZE = 256;

    let sourceType: "upload" | "link" = "link";
    let finalImageUrl = imagePath;
    let finalThumbnailUrl: string | null = null;
    let mimeType = "image/jpeg"; // default
    let originalBuffer: Buffer | null = null;

    // Check if it's base64 data:image
    if (imagePath.startsWith("data:image")) {
      const match = imagePath.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) {
        console.warn("⚠️ Invalid base64 image format");
        return;
      }

      mimeType = match[1];
      const base64Data = match[2];

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        console.warn(`⚠️ Unsupported MIME type: ${mimeType}`);
        return;
      }

      // Decode base64 data
      try {
        originalBuffer = Buffer.from(base64Data, "base64");
      } catch (decodeError) {
        console.warn("⚠️ Invalid base64 data:", decodeError);
        return;
      }

      // Check file size
      if (originalBuffer.length > MAX_FILE_SIZE) {
        console.warn(`⚠️ Image too large: ${originalBuffer.length} bytes (max: ${MAX_FILE_SIZE})`);
        return;
      }

      // Process image with Sharp
      try {
        // Create directory structure /uploads/YYYY/MM/
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const uploadDir = path.join(process.cwd(), "uploads", year, month);

        // Ensure directory exists
        fs.mkdirSync(uploadDir, { recursive: true });

        // Generate secure random filename (32 bytes = 64 hex chars)
        const randomBytes = crypto.randomBytes(32);
        const filename = randomBytes.toString('hex');
        const thumbnailFilename = `${filename}_thumb`;

        // Process original image - strip EXIF and convert to WebP if beneficial
        const originalSharp = sharp(originalBuffer);
        const metadata = await originalSharp.metadata();

        let originalFormat = 'webp'; // Default to WebP for better compression
        let originalPath = path.join(uploadDir, `${filename}.webp`);

        // Keep original format if it's already WebP or if it's small
        if (metadata.format === 'webp' || originalBuffer.length < 100 * 1024) {
          originalFormat = metadata.format || 'jpeg';
          originalPath = path.join(uploadDir, `${filename}.${originalFormat}`);
        }

        // Strip EXIF metadata and save original
        await originalSharp
          .rotate() // Auto-rotate based on EXIF
          .toFormat(originalFormat as any, { quality: 85 })
          .toFile(originalPath);

        finalImageUrl = `/uploads/${year}/${month}/${filename}.${originalFormat}`;
        sourceType = "upload";

        // Generate 256px thumbnail
        const thumbnailPath = path.join(uploadDir, `${thumbnailFilename}.webp`);
        await originalSharp
          .rotate()
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
            fit: 'cover',
            position: 'center'
          })
          .toFormat('webp', { quality: 80 })
          .toFile(thumbnailPath);

        finalThumbnailUrl = `/uploads/${year}/${month}/${thumbnailFilename}.webp`;

        console.log("✅ Processed and saved image:", {
          original: originalPath,
          thumbnail: thumbnailPath,
          size: originalBuffer.length,
          format: originalFormat
        });

      } catch (sharpError) {
        console.warn("⚠️ Error processing image with Sharp:", sharpError);
        return;
      }

    } else if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      // Validate URL format
      try {
        const url = new URL(imagePath);

        // For external URLs, we'll store the URL but not process it
        // In a production system, you'd want to fetch and validate the image
        sourceType = "link";
        finalImageUrl = imagePath;
        finalThumbnailUrl = null; // No thumbnail for external URLs

        console.log("✅ Using external image URL:", imagePath);
      } catch (urlError) {
        console.warn("⚠️ Invalid image URL:", imagePath, urlError);
        return;
      }
    } else {
      console.warn("⚠️ Unsupported image path format:", imagePath);
      return;
    }

    // Create image record with thumbnail URL
    const imageRecord = await db.insert(images).values({
      consultationId,
      url: finalImageUrl,
      thumbnailUrl: finalThumbnailUrl,
      sourceType,
      meta: {
        mimeType,
        originalPath: imagePath,
        processedAt: new Date().toISOString(),
        fileSize: originalBuffer?.length || null,
        thumbnailGenerated: finalThumbnailUrl !== null,
      },
    }).returning();

    console.log("✅ Created image record:", imageRecord[0].id);

    // Update consultation with processed image path
    await db.update(consultations)
      .set({ image_path: finalImageUrl })
      .where(eq(consultations.id, consultationId));

    console.log("✅ Updated consultation image_path to:", finalImageUrl);

  } catch (error) {
    console.error("❌ Error processing consultation image:", error);
    // Don't throw - just log and continue
  }
}

// Flexible Zod schema for consultation payload that accepts any field structure
const ConsultationSchema = z
  .object({
    name: z.string().optional(),
    email: z.union([z.string(), z.null(), z.undefined()]).optional(),
    phone: z.union([z.string(), z.null(), z.undefined()]).optional(),
    preferred_clinic: z.string().optional(),
    preferredClinic: z.string().optional(),
    issueCategory: z.string().optional(),
    issue_category: z.string().optional(),
    nailSpecifics: z.string().optional(),
    painSpecifics: z.string().optional(),
    skinSpecifics: z.string().optional(),
    structuralSpecifics: z.string().optional(),
    symptomDescription: z.string().optional(),
    previousTreatment: z.string().optional(),
    hasImage: z.string().optional(),
    imagePath: z.string().optional(),
    imageAnalysis: z.any().optional(),
    calendarBooking: z.any().optional(),
    bookingConfirmation: z.any().optional(),
    finalQuestion: z.string().optional(),
    additionalHelp: z.string().optional(),
    emojiSurvey: z.string().optional(),
    surveyResponse: z.string().optional(),
    createdAt: z.string().datetime().optional(),
    conversationLog: z.array(z.any()).optional(),
    completedSteps: z.array(z.string()).optional(),
  })
  .passthrough(); // Allow additional fields from chatbot

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Add CORS support for chatbot webhook
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Body parsers (safe even if already registered earlier)
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Serve uploaded images with security headers
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders: (res, path) => {
      // Security headers for uploaded files
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      // Content Security Policy for images
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
    },
    // Disable directory listing for security
    index: false,
    redirect: false
  }));

  // NOTE: Do NOT register /api/health here to preserve the instance added in server/index.ts

  // Auth status route is provided by simple auth (registered in server/index.ts).
  // Avoid redefining here to prevent conflicts.

  const ENABLE_CHATBOT_SETTINGS =
    (process.env.VITE_ENABLE_CHATBOT_SETTINGS === "1" ||
     process.env.VITE_ENABLE_CHATBOT_SETTINGS === "true" ||
     process.env.ENABLE_CHATBOT_SETTINGS === "1" ||
     process.env.ENABLE_CHATBOT_SETTINGS === "true") ||
    (process.env.NODE_ENV === "development");

  if (ENABLE_CHATBOT_SETTINGS) {
    app.get(
      "/api/chatbot-settings/:clinic_group",
      isAuthenticated,
      async (req: Request, res: Response) => {
        // Always set JSON content type first
        res.setHeader("Content-Type", "application/json");

        try {
          const { clinic_group } = req.params;

          // Validate clinic_group parameter
          if (!clinic_group || typeof clinic_group !== 'string' || clinic_group.trim() === '') {
            return res.status(422).json({
              error: "Validation Error",
              issues: [{ field: "clinic_group", message: "Clinic group is required and must be a non-empty string" }]
            });
          }

          const settings = await storage.getChatbotSettings(clinic_group.trim());

          // Return only the 4 specified fields
          const responseData = settings ? {
            welcome_message: settings.welcomeMessage,
            bot_name: settings.botDisplayName,
            cta_label: settings.ctaButtonLabel,
            tone: settings.chatbotTone
          } : {
            welcome_message: null,
            bot_name: null,
            cta_label: null,
            tone: null
          };

          res.status(200).json(responseData);
        } catch (error) {
          console.error("Error fetching chatbot settings:", error);
          res.status(500).json({
            success: false,
            message: "Failed to fetch chatbot settings",
            error: (error as Error).message,
          });
        }
      }
    );

    app.post(
      "/api/chatbot-settings/:clinic_group",
      isAuthenticated,
      async (req: Request, res: Response) => {
        // Always set JSON content type first
        res.setHeader("Content-Type", "application/json");

        try {
          const { clinic_group } = req.params;
          const updates = req.body;

          // Validate clinic_group parameter
          if (!clinic_group || typeof clinic_group !== 'string' || clinic_group.trim() === '') {
            return res.status(422).json({
              error: "Validation Error",
              issues: [{ field: "clinic_group", message: "Clinic group is required and must be a non-empty string" }]
            });
          }

          console.log("Received chatbot settings update for clinic:", clinic_group, updates);

          // Validate input - only allow the 4 specified fields
          const allowedFields = ['welcome_message', 'bot_name', 'cta_label', 'tone'];
          const receivedFields = Object.keys(updates);

          // Check for invalid fields
          const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
          if (invalidFields.length > 0) {
            return res.status(422).json({
              error: "Validation Error",
              issues: invalidFields.map(field => ({
                field,
                message: `Field '${field}' is not allowed. Only ${allowedFields.join(', ')} are permitted.`
              }))
            });
          }

          // Validate field types and values
          const validationIssues: Array<{ field: string; message: string }> = [];

          if (updates.welcome_message !== undefined) {
            if (typeof updates.welcome_message !== 'string') {
              validationIssues.push({ field: "welcome_message", message: "Must be a string" });
            } else if (updates.welcome_message.length < 10) {
              validationIssues.push({ field: "welcome_message", message: "Must be at least 10 characters long" });
            }
          }

          if (updates.bot_name !== undefined) {
            if (typeof updates.bot_name !== 'string') {
              validationIssues.push({ field: "bot_name", message: "Must be a string" });
            } else if (updates.bot_name.length < 3) {
              validationIssues.push({ field: "bot_name", message: "Must be at least 3 characters long" });
            }
          }

          if (updates.cta_label !== undefined) {
            if (typeof updates.cta_label !== 'string') {
              validationIssues.push({ field: "cta_label", message: "Must be a string" });
            } else if (updates.cta_label.length < 3) {
              validationIssues.push({ field: "cta_label", message: "Must be at least 3 characters long" });
            }
          }

          if (updates.tone !== undefined) {
            const validTones = ['Friendly', 'Professional', 'Clinical', 'Casual'];
            if (typeof updates.tone !== 'string' || !validTones.includes(updates.tone)) {
              validationIssues.push({
                field: "tone",
                message: `Must be one of: ${validTones.join(', ')}`
              });
            }
          }

          if (validationIssues.length > 0) {
            return res.status(422).json({
              error: "Validation Error",
              issues: validationIssues
            });
          }

          // Prepare updates for storage (map field names)
          const storageUpdates: Partial<ChatbotSettingsData> = {};

          if (updates.welcome_message !== undefined) {
            storageUpdates.welcomeMessage = updates.welcome_message;
          }
          if (updates.bot_name !== undefined) {
            storageUpdates.botDisplayName = updates.bot_name;
          }
          if (updates.cta_label !== undefined) {
            storageUpdates.ctaButtonLabel = updates.cta_label;
          }
          if (updates.tone !== undefined) {
            storageUpdates.chatbotTone = updates.tone;
          }

          const updatedSettings = await storage.updateChatbotSettings(clinic_group.trim(), storageUpdates);
          console.log("Updated chatbot settings for clinic:", clinic_group, updatedSettings);

          // Return only the 4 specified fields in response
          const responseData = {
            welcome_message: updatedSettings.welcomeMessage,
            bot_name: updatedSettings.botDisplayName,
            cta_label: updatedSettings.ctaButtonLabel,
            tone: updatedSettings.chatbotTone
          };

          res.status(200).json(responseData);
        } catch (error) {
          console.error("Error updating chatbot settings:", error);
          res.status(500).json({
            success: false,
            message: "Failed to update chatbot settings",
            error: (error as Error).message,
          });
        }
      }
    );
  }

  app.get("/api/dashboard/stats", async (_req: Request, res: Response) => {
    try {
      const stats = await Promise.all([
        storage.getCompletedAssessmentsCount(),
        storage.getWeeklyAssessmentsCount(),
        storage.getFlaggedResponsesCount(),
        storage.getPatientsCount(),
      ]);

      res.json({
        completedAssessments: stats[0],
        weeklyAssessments: stats[1],
        flaggedResponses: stats[2],
        totalPatients: stats[3],
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post(
    "/api/webhooks/footcare",
    skipAuthForWebhook,
    async (req: Request, res: Response) => {
      try {
        // Authorization header check
        const secret = req.header("X-Footcare-Secret");
        if (!secret || secret !== process.env.FOOTCARE_WEBHOOK_SECRET) {
          console.warn(
            `Unauthorized webhook attempt with secret: ${
              secret ? "[REDACTED]" : "missing"
            }`
          );
          return res.status(401).json({ error: "Unauthorized" });
        }

        console.log("🔔 WEBHOOK RECEIVED!");
        console.log("📥 Full webhook payload:", JSON.stringify(req.body, null, 2));
        console.log("📊 Data size:", JSON.stringify(req.body).length, "characters");

        const result = ConsultationSchema.safeParse(req.body);
        if (!result.success) {
          console.warn(
            "⚠️ Schema validation failed, but continuing:",
            result.error.errors
          );
          return res
            .status(400)
            .json({ ok: false, errors: result.error.errors });
        }

        // Use raw body data to handle any field structure
        const rawData = req.body;

        // Skip duplicate check for now to work around raw_json column issue
        console.log("🔍 Skipping duplicate check due to database schema issue");

        console.log("✅ Processing consultation with raw data");

        // Extract email and phone with multiple possible field names
        const email =
          rawData.email ||
          rawData.patient_email ||
          rawData.userEmail ||
          null;
        const phone =
          rawData.phone ||
          rawData.patient_phone ||
          rawData.userPhone ||
          null;

        console.log("📧 Extracted email:", email);
        console.log("📞 Extracted phone:", phone);

        // Enhanced duplicate check - both consultations AND assessments
        if (email && email !== "no-email@provided.com") {
          try {
            // Check recent consultations (within 60 seconds)
            const recentConsultations = await storage.getConsultations();
            const sixtySecondsAgo = new Date(Date.now() - 60000);
            const recentConsultationDuplicate = recentConsultations.find(
              (c) =>
                c.email === email &&
                c.createdAt !== null &&
                new Date(c.createdAt) > sixtySecondsAgo &&
                c.name === (rawData.name || rawData.patient_name)
            );

            if (recentConsultationDuplicate) {
              console.log(
                "⚠️ Recent consultation duplicate detected within 60 seconds for email:",
                email
              );
              return res.status(200).json({
                ok: true,
                id: recentConsultationDuplicate.id.toString(),
              });
            }

            // Check recent assessments to prevent multiple assessments for same patient
            const recentAssessments = await storage.getAssessments({});
            const recentAssessmentDuplicate = recentAssessments.find(
              (a) =>
                a.patient?.email === email &&
                a.createdAt !== null &&
                new Date(a.createdAt) > sixtySecondsAgo &&
                a.patient?.name === (rawData.name || rawData.patient_name)
            );

            if (recentAssessmentDuplicate) {
              console.log(
                "⚠️ Recent assessment duplicate detected within 60 seconds for email:",
                email
              );
              return res.status(200).json({
                ok: true,
                id: recentAssessmentDuplicate.id.toString(),
              });
            }
          } catch (error) {
            console.log(
              "⚠️ Error checking for recent duplicates, continuing:",
              error
            );
          }
        }

        // Comprehensive field mapping for all consultation data
        const consultationData: any = {
          name:
            rawData.name ||
            rawData.patient_name ||
            rawData.userName ||
            "Unknown Patient",
          email: email || "no-email@provided.com",
          phone: phone || "no-phone-provided",
          preferred_clinic:
            rawData.preferredClinic ||
            rawData.preferred_clinic ||
            rawData.clinic_location ||
            rawData.clinicLocation ||
            null,
          issue_category:
            rawData.issueCategory ||
            rawData.issue_category ||
            rawData.issue_type ||
            rawData.primaryConcern ||
            "General consultation",

          // Core medical fields - HIGH PRIORITY
          issue_specifics:
            rawData.issue_specifics ||
            rawData.issueSpecifics ||
            rawData.nailSpecifics ||
            rawData.painSpecifics ||
            rawData.skinSpecifics ||
            rawData.structuralSpecifics ||
            null,
          symptom_description:
            rawData.symptom_description ||
            rawData.symptomDescription ||
            rawData.symptoms ||
            rawData.description ||
            null,
          previous_treatment:
            rawData.previous_treatment ||
            rawData.previousTreatment ||
            rawData.treatmentHistory ||
            rawData.treatment_history ||
            null,
          image_analysis:
            rawData.image_analysis ||
            rawData.imageAnalysis ||
            rawData.aiAnalysis ||
            rawData.ai_analysis ||
            null,

          // Image handling
          has_image:
            rawData.has_image ||
            rawData.hasImage ||
            rawData.imageUploaded ||
            (rawData.image_path || rawData.imagePath || rawData.imageUrl
              ? "true"
              : "false"),
          image_path:
            rawData.image_path ||
            rawData.imagePath ||
            rawData.imageUrl ||
            rawData.image_url ||
            null,

          // Booking and scheduling - MEDIUM PRIORITY
          calendar_booking:
            rawData.calendar_booking ||
            rawData.calendarBooking ||
            rawData.appointmentSlot ||
            rawData.bookingSlot ||
            rawData.appointment_booking ||
            null,
          booking_confirmation:
            rawData.booking_confirmation ||
            rawData.bookingConfirmation ||
            rawData.appointmentConfirmation ||
            rawData.appointment_confirmation ||
            null,

          // Survey and feedback - MEDIUM PRIORITY
          emoji_survey:
            rawData.emoji_survey ||
            rawData.emojiSurvey ||
            rawData.rating ||
            rawData.satisfaction_rating ||
            null,
          survey_response:
            rawData.survey_response ||
            rawData.surveyResponse ||
            rawData.feedback ||
            rawData.user_feedback ||
            null,

          // Additional support - LOW PRIORITY
          final_question:
            rawData.final_question ||
            rawData.finalQuestion ||
            rawData.additionalQuestions ||
            rawData.additional_questions ||
            null,
          additional_help:
            rawData.additional_help ||
            rawData.additionalHelp ||
            rawData.needsHelp ||
            rawData.needs_help ||
            null,

          // System fields
          created_at: rawData.createdAt ? new Date(rawData.createdAt) : new Date(),
          conversation_log:
            rawData.conversation_log ||
            rawData.conversationLog ||
            rawData.chatHistory ||
            [],
          completed_steps:
            rawData.completed_steps ||
            rawData.completedSteps ||
            rawData.stepsCompleted ||
            [],
          // Temporarily exclude raw_json to work around database schema issue
          // raw_json: rawData, // Store full untouched payload
        };

        // Ensure string fields for JSON storage
        if (
          consultationData.image_analysis &&
          typeof consultationData.image_analysis !== "string"
        ) {
          consultationData.image_analysis = JSON.stringify(
            consultationData.image_analysis
          );
        }
        if (
          consultationData.calendar_booking &&
          typeof consultationData.calendar_booking !== "string"
        ) {
          consultationData.calendar_booking = JSON.stringify(
            consultationData.calendar_booking
          );
        }
        if (
          consultationData.booking_confirmation &&
          typeof consultationData.booking_confirmation !== "string"
        ) {
          consultationData.booking_confirmation = JSON.stringify(
            consultationData.booking_confirmation
          );
        }

        console.log("🧾 Final consultation data to store:", consultationData);

        // Store ALL consultation fields properly
        // Temporarily exclude raw_json to work around database schema issue
        const { raw_json, ...consultationDataWithoutRawJson } = consultationData;
        const consultationRecord = await storage.createConsultation(
          consultationDataWithoutRawJson
        );

        // Process image if present
        if (consultationData.image_path) {
          try {
            await processConsultationImage(consultationRecord.id, consultationData.image_path, consultationData.has_image);
          } catch (imageError) {
            console.error("⚠️ Error processing consultation image:", imageError);
            // Don't fail the entire webhook for image processing errors
          }
        }

        let patient = null;
        if (email && email !== "no-email@provided.com") {
          try {
            patient = await storage.getPatientByEmail(email);
            console.log("👤 Found existing patient:", patient?.name ?? "unknown");
          } catch (e) {
            console.log("⚠️ Patient not found, will create new");
          }
        }

        if (!patient) {
          const patientName =
            rawData.name || rawData.patient_name || "Unknown Patient";
          console.log("⚠️ Creating new patient with data:", {
            name: patientName,
            email,
            phone,
          });
          patient = await storage.createPatient({
            name: patientName,
            email: email || "no-email@provided.com",
            phone: phone || "no-phone-provided",
          });
          console.log(
            "✅ Created new patient:",
            patient?.name ?? "unknown",
            "with ID:",
            patient?.id ?? "unknown",
            "email:",
            email
          );
        } else {
          console.log(
            "👤 Found existing patient:",
            patient?.name ?? "unknown",
            "with ID:",
            patient?.id ?? "unknown"
          );
        }

        const primaryConcern =
          rawData.issueCategory ||
          rawData.issue_category ||
          rawData.issue_type ||
          rawData.primaryConcern ||
          rawData.symptom_description ||
          rawData.symptomDescription ||
          "General consultation";

        // Final check: ensure no assessment already exists for this patient in the last 60 seconds
        try {
          const existingAssessments = await storage.getAssessments({});
          const sixtySecondsAgo = new Date(Date.now() - 60000);
          const existingAssessment = existingAssessments.find(
            (a) => a.patientId === patient.id && new Date(a.createdAt) > sixtySecondsAgo
          );

          if (existingAssessment) {
            console.log(
              "⚠️ Assessment already exists for patient within 60 seconds, using existing:",
              existingAssessment.id
            );
            return res.status(200).json({
              ok: true,
              id: consultationRecord.id.toString(),
            });
          }
        } catch (error) {
          console.log("⚠️ Error checking existing assessments:", error);
        }

        const assessment = await storage.createAssessment({
          patientId: patient.id,
          primaryConcern: primaryConcern,
          riskLevel: "medium",
          status: "completed",
          completedAt: new Date(),
          clinicLocation:
            rawData.preferredClinic || rawData.preferred_clinic || null,
        });

        if (rawData.issueCategory) {
          const conditions = await storage.getConditions();
          const exists = conditions.find(
            (c) => c.name.toLowerCase() === rawData.issueCategory!.toLowerCase()
          );
          if (!exists) {
            await storage.createCondition({
              name: rawData.issueCategory!,
              description:
                rawData.nailSpecifics ||
                rawData.painSpecifics ||
                rawData.skinSpecifics ||
                rawData.structuralSpecifics ||
                "",
            });
          }
        }

        console.log("✅ Created consultation ID:", consultationRecord.id);
        console.log(
          "👤 Patient created/found - ID:",
          patient.id,
          "Name:",
          patient.name
        );
        console.log(
          "📋 Assessment created - ID:",
          assessment.id,
          "Risk:",
          assessment.riskLevel
        );

        // Verify what was actually stored in the database
        try {
          const storedConsultation = await storage.getConsultationById(
            consultationRecord.id
          );
          console.log("✅ Verified stored consultation data:", {
            id: storedConsultation.id,
            name: storedConsultation.name,
            issue_category: storedConsultation.issue_category,
            issue_specifics: storedConsultation.issue_specifics,
            symptom_description: storedConsultation.symptom_description,
            previous_treatment: storedConsultation.previous_treatment,
            has_image: storedConsultation.has_image,
            image_path: storedConsultation.image_path,
            image_analysis: storedConsultation.image_analysis ? "Present" : "Null",
            calendar_booking: storedConsultation.calendar_booking ? "Present" : "Null",
            booking_confirmation: storedConsultation.booking_confirmation
              ? "Present"
              : "Null",
            final_question: storedConsultation.final_question,
            additional_help: storedConsultation.additional_help,
            emoji_survey: storedConsultation.emoji_survey,
            survey_response: storedConsultation.survey_response,
          });
        } catch (verifyError) {
          console.log("⚠️ Could not verify stored consultation:", verifyError);
        }

        if (typeof (globalThis as any).broadcastToClients === "function") {
          (globalThis as any).broadcastToClients({
            type: "new_assessment",
            data: {
              patientId: patient.id,
              patientName: patient.name,
              assessmentId: assessment.id,
              riskLevel: assessment.riskLevel,
              timestamp: new Date().toISOString(),
            },
          });
          console.log("📢 WebSocket broadcast sent to clients");
        } else {
          console.log("⚠️ WebSocket broadcast function not available");
        }

        // Debug: Check what's actually in the database now
        try {
          const allAssessments = await storage.getAssessments({});
          const allPatients = await storage.getPatients({});
          console.log("📊 DATABASE STATE AFTER WEBHOOK:");
          console.log("   Total assessments:", allAssessments.length);
          console.log("   Total patients:", allPatients.length);
          console.log(
            "   Latest assessment:",
            allAssessments[0]?.id,
            allAssessments[0]?.primaryConcern
          );
        } catch (dbError) {
          console.log("❌ Error checking database state:", dbError);
        }

        res.status(200).json({
          ok: true,
          id: consultationRecord.id.toString(),
        });
      } catch (error) {
        console.error("❌ Error processing consultation:", error);
        res.status(500).json({ success: false, message: "Internal error" });
      }
    }
  );

// --- Restored non-auth routes to preserve existing functionality ---

app.get('/api/assessments/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const assessments = await storage.getRecentAssessments(limit);
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching recent assessments:', error);
    res.status(500).json({ message: 'Failed to fetch recent assessments' });
  }
});

app.get('/api/assessments/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const responses = await storage.getAssessmentResponsesByAssessmentId(id);
    res.json({ responses });
  } catch (error) {
    console.error(`Failed to fetch responses for assessment ${id}`, error);
    res.status(500).json({ message: 'Failed to fetch responses' });
  }
});

app.get('/api/consultations', async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    const clinic_group = req.query.clinic_group as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const q = req.query.q as string | undefined;

    const options: any = {};
    if (limit !== undefined) options.limit = limit;
    if (offset !== undefined) options.offset = offset;
    if (clinic_group) options.clinic_group = clinic_group;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (q) options.q = q;

    const consultations = await storage.getConsultations(options);
    res.json(consultations);
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ message: 'Failed to fetch consultations' });
  }
});

app.get('/api/consultations/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid consultation ID' });
  }

  try {
    const consultation = await storage.getConsultationById(id);
    res.json(consultation);
  } catch (error) {
    console.error(`Failed to fetch consultation ${id}:`, error);
    res.status(500).json({ message: 'Failed to fetch consultation details' });
  }
});

app.get('/api/patients', skipAuthForWebhook, async (_req: Request, res: Response) => {
  try {
    const assessments = await storage.getAssessments({});
    res.json({
      assessments,
      pagination: {
        total: assessments.length,
        page: 1,
        limit: 50,
        totalPages: Math.ceil(assessments.length / 50),
      },
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Failed to fetch patients' });
  }
});

app.get('/api/assessments', async (_req: Request, res: Response) => {
  try {
    const assessments = await storage.getAssessments();
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ message: 'Failed to fetch assessments' });
  }
});

app.get('/api/dashboard/trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const assessments = await storage.getAssessments({});

    const trends: Array<{ date: string; assessments: number; completed: number; flagged: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayAssessments = assessments.filter((a: any) => {
        const d = new Date(a.completedAt || a.createdAt).toISOString().split('T')[0];
        return d === dateStr;
      });

      trends.push({
        date: dateStr,
        assessments: dayAssessments.length,
        completed: dayAssessments.filter((a: any) => a.status === 'completed').length,
        flagged: dayAssessments.filter((a: any) => a.status === 'flagged').length,
      });
    }

    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ message: 'Failed to fetch trends' });
  }
});

app.get('/api/dashboard/conditions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const conditions = await storage.getConditions();
    const limited = conditions.slice(0, limit);
    res.json(limited);
  } catch (error) {
    console.error('Error fetching conditions:', error);
    res.status(500).json({ message: 'Failed to fetch conditions' });
  }
});

// Analytics export endpoint
app.get('/api/export/analytics', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    const assessments = await storage.getAssessments({});
    const consultations = await storage.getConsultations();

    const analyticsData = {
      totalAssessments: assessments.length,
      totalConsultations: consultations.length,
      assessments,
      consultations,
      exportedAt: new Date().toISOString(),
      imageUrls: consultations
        .filter(c => c.image_path)
        .map(c => ({
          consultationId: c.id,
          imageUrl: c.image_path,
          hasImage: c.has_image
        }))
    };

    if (format === 'csv') {
      // Use the CSV export service
      const csvContent = await exportConsultationsToCSV(consultations);


    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.json"');
      res.json(analyticsData);
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ message: 'Failed to export analytics data' });
  }
});

// Export all data endpoint
app.get('/api/export/all', async (_req: Request, res: Response) => {
  try {
    const assessments = await storage.getAssessments({});
    const consultations = await storage.getConsultations();

    const exportData = {
      assessments,
      consultations,
      exportedAt: new Date().toISOString(),
      totalRecords: assessments.length + consultations.length,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="foot-care-data-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting all data:', error);
    res.status(500).json({ message: 'Failed to export data' });
  }
});

// --- WebSocket server for real-time updates (restored) ---
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket connected');
  clients.add(ws);

  ws.on('close', () => clients.delete(ws));
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

(globalThis as any).broadcastToClients = (message: any) => {
  const str = JSON.stringify(message);
  clients.forEach((client) => {
    if ((client as any).readyState === WebSocket.OPEN) {
      try {
        client.send(str);
      } catch {
        /* ignore send errors */
      }
    }
  });
};
  return httpServer;
}
