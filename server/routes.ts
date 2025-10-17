import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import multer from "multer";
import nodemailer from "nodemailer";
import axios from "axios";

import { db } from "./db";
import { supabaseAdmin, uploadConsultationImage as supabaseUploadConsultationImage } from "./supabase";
import { images, consultations, insertChatbotSettingsSchema, treatmentPlans, insertTreatmentPlanSchema, clinicEmailSettings, insertClinicEmailSettingsSchema, patients } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { ChatbotSettingsData } from "./storage";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated, skipAuthForWebhook } from "./simpleAuth";
import cors from "cors";
import { exportConsultationsToCSV } from "./services/csvExport";
import { sendEmail as mailSendEmail } from "./services/mail";

// Upload image to Supabase Storage and create database records
// Return type for the Supabase upload function
type SupabaseUploadResult = {
  success: boolean;
  data?: {
    path?: string;
    publicUrl: string;
  };
  error?: any;
};

async function uploadConsultationImage(consultationId: number, file: Express.Multer.File, clinic: string) {
  try {
    console.log("🖼️ Uploading image for consultation:", consultationId);

    // Use the Supabase client to upload the image
    const result = await supabaseUploadConsultationImage(consultationId, file, clinic) as SupabaseUploadResult;
    
    if (!result.success || !result.data?.publicUrl) {
      console.error("❌ Failed to upload image to Supabase:", result.error);
      return null;
    }
    
    const publicUrl = result.data.publicUrl;
    
    // Create image record
    const imageRecord = await db.insert(images).values({
      consultationId,
      url: publicUrl,
      sourceType: "upload",
      meta: {
        mimeType: file.mimetype,
        originalPath: file.originalname,
        processedAt: new Date().toISOString(),
        fileSize: file.buffer.length,
      },
    }).returning();

    console.log("✅ Created image record:", imageRecord[0].id);

    // Update consultation with image URL
    await db.update(consultations)
      .set({ image_url: publicUrl })
      .where(eq(consultations.id, consultationId));

    console.log("✅ Updated consultation image_url to:", publicUrl);

    return publicUrl;

  } catch (error) {
    console.error("❌ Error uploading consultation image:", error);
    return null;
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
  console.log('Registering routes...');
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

  // Multer setup for file uploads
  const upload = multer({
    storage: multer.memoryStorage(), // Store in memory for processing
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

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

  // Clinic Email Settings endpoints
  app.get("/api/clinic-email-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const settings = await db.select().from(clinicEmailSettings);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching clinic email settings:", error);
      res.status(500).json({ message: "Failed to fetch clinic email settings" });
    }
  });

  app.get("/api/clinic-email-settings/:clinic_group", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinic_group } = req.params;
      const settings = await db.select().from(clinicEmailSettings).where(eq(clinicEmailSettings.clinicGroup, clinic_group)).limit(1);

      if (!settings.length) {
        return res.status(404).json({ message: "Clinic email settings not found" });
      }

      res.json(settings[0]);
    } catch (error) {
      console.error("Error fetching clinic email settings:", error);
      res.status(500).json({ message: "Failed to fetch clinic email settings" });
    }
  });

  app.post("/api/clinic-email-settings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertClinicEmailSettingsSchema.parse(req.body);
      const newSettings = await db.insert(clinicEmailSettings).values(validatedData).returning();
      res.status(201).json(newSettings[0]);
    } catch (error) {
      console.error("Error creating clinic email settings:", error);
      res.status(500).json({ message: "Failed to create clinic email settings" });
    }
  });

  app.put("/api/clinic-email-settings/:clinic_group", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clinic_group } = req.params;
      const updateData = { ...req.body, updatedAt: new Date() };

      const updatedSettings = await db
        .update(clinicEmailSettings)
        .set(updateData)
        .where(eq(clinicEmailSettings.clinicGroup, clinic_group))
        .returning();

      if (!updatedSettings.length) {
        return res.status(404).json({ message: "Clinic email settings not found" });
      }

      res.json(updatedSettings[0]);
    } catch (error) {
      console.error("Error updating clinic email settings:", error);
      res.status(500).json({ message: "Failed to update clinic email settings" });
    }
  });

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

  // Specific nail surgery webhook endpoint
  app.post(
    "/api/webhooks/nailsurgery",
    skipAuthForWebhook,
    upload.any(),
    async (req: Request, res: Response) => {
      try {
        console.log('\n🔔 NAIL SURGERY WEBHOOK PROCESSING START -', new Date().toISOString());
        console.log('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
        console.log('📥 Files:', req.files);

        // Read webhook secret header case-insensitively
        const webhookSecret = req.get('x-webhook-secret') || req.get('X-Webhook-Secret');
        console.log('🔑 Webhook secret received:', webhookSecret ? '***' : 'missing');

        // Compare against process.env.NAIL_WEBHOOK_SECRET
        const expectedSecret = process.env.NAIL_WEBHOOK_SECRET;
        if (!expectedSecret) {
          console.error('❌ NAIL_WEBHOOK_SECRET not configured in environment');
          return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!webhookSecret || webhookSecret !== expectedSecret) {
          console.warn('❌ Unauthorized webhook attempt - secret mismatch');
          return res.status(401).json({ error: 'Unauthorized' });
        }
        console.log('✅ Webhook secret validated');

        // Parse JSON payload from req.body.data if present (FormData 'data'), fallback to req.body
        let formData: any;
        if (req.body.data) {
          try {
            formData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
            console.log('📋 Parsed data from req.body.data field');
          } catch (parseError) {
            console.error('❌ Failed to parse req.body.data:', parseError);
            return res.status(400).json({ error: 'Invalid JSON in data field' });
          }
        } else {
          formData = req.body;
          console.log('📋 Using req.body directly');
        }

        // Normalize fields for Nail Surgery submissions
        formData.source = 'nail_surgery_clinic';
        formData.clinic_group = 'The Nail Surgery Clinic';
        formData.preferred_clinic = null;

        console.log('📋 Normalized formData:', JSON.stringify(formData, null, 2));

        // Extract patient information
        const patientName = formData.name || formData.patient_name || 'Unknown Patient';
        const patientEmail = formData.email || formData.patient_email || 'no-email@provided.com';
        const patientPhone = formData.phone || formData.patient_phone || 'no-phone-provided';

        // Persist using Supabase client
        // Insert into 'consultations' table with these columns:
        // form_data (JSON), source, clinic_group, patient_name, patient_email, patient_phone, status, created_at
        const consultationData = {
          form_data: formData,
          source: 'nail_surgery_clinic',
          clinic_group: 'The Nail Surgery Clinic',
          patient_name: patientName,
          patient_email: patientEmail,
          patient_phone: patientPhone,
          status: 'new',
          created_at: new Date().toISOString()
        };

        console.log('💾 Inserting consultation into Supabase...');
        const { data, error } = await supabaseAdmin
          .from('consultations')
          .insert(consultationData)
          .select('id')
          .single();

        if (error) {
          console.error('❌ Supabase insert error:', error);
          return res.status(500).json({ error: 'Database insert failed', details: error.message });
        }

        console.log('✅ Consultation inserted successfully with ID:', data?.id);

        // On success, return { success: true, id: data?.id } (always that shape on success)
        return res.status(201).json({ success: true, id: data?.id });

      } catch (error: any) {
        console.error('❌ NAIL SURGERY WEBHOOK ERROR:', error);
        console.error('Stack trace:', error.stack);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
      }
    }
  );

  // Generic webhook endpoint for footcare, lasercare (keep existing)
  app.post(
    "/api/webhooks/:clinic",
    skipAuthForWebhook,
    upload.single('image'),
    async (req: Request, res: Response) => {
      try {
        const { clinic } = req.params;
        console.log(`\n🔔 WEBHOOK PROCESSING START for ${clinic.toUpperCase()} - ${new Date().toISOString()}`);
        console.log("🔍 Request headers:", JSON.stringify(req.headers, null, 2));

        // Validate clinic slug
        const validClinics = ['footcare', 'nailsurgery', 'lasercare'];
        if (!validClinics.includes(clinic)) {
          console.error(`❌ Invalid clinic: ${clinic}`);
          return res.status(400).json({ error: "Invalid clinic" });
        }

        // Auth via per-clinic secret
        // Validate clinic-specific secret
        const secretHeader = `X-${clinic.charAt(0).toUpperCase() + clinic.slice(1)}-Secret`;
        const secret = req.get(secretHeader);
        console.log(`🔑 Checking auth header: ${secretHeader}`);
        
        // Define the clinic secrets based on requirements
        const CLINIC_SECRETS: Record<string, string> = {
          'footcare': 'footcare_secret_2025',
          'nailsurgery': 'nailsurgery_secret_2025',
          'lasercare': 'lasercare_secret_2025'
        };
        
        // Get the expected secret for this clinic
        const envSecretKey = `${clinic.toUpperCase()}_WEBHOOK_SECRET`;
        const expectedSecret = CLINIC_SECRETS[clinic] || process.env[envSecretKey];
        console.log(`🔐 Using secret from: ${CLINIC_SECRETS[clinic] ? 'hardcoded values' : `env var ${envSecretKey}`}`);

        if (!secret || secret !== expectedSecret) {
          console.warn(
            `❌ Unauthorized webhook attempt for ${clinic} with secret: ${
              secret ? `${secret.substring(0, 5)}...` : "missing"
            }, expected: ${expectedSecret ? `${expectedSecret.substring(0, 5)}...` : "undefined"}`
          );
          return res.status(401).json({ error: "Unauthorized" });
        }
        console.log(`✅ Authentication successful for ${clinic}`);

        console.log("📥 Form fields:", JSON.stringify(req.body, null, 2));
        console.log("📥 File:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "No file");

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
        console.log("✅ Schema validation passed");

        const rawData = req.body;

        // Extract email and phone
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

        // Insert base row with has_image as boolean
        const consultationData: any = {
          name:
            rawData.name ||
            rawData.patient_name ||
            rawData.userName ||
            "Unknown Patient",
          email: email || "no-email@provided.com",
          phone: phone || "no-phone-provided",
          preferred_clinic: clinic,
          clinic: clinic, // Also set the required 'clinic' field that's needed for database constraint
          issue_category:
            rawData.issueCategory ||
            rawData.issue_category ||
            rawData.issue_type ||
            rawData.primaryConcern ||
            "General consultation",
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
          has_image: !!req.file, // Boolean
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

        // Insert consultation
        console.log("💾 Calling storage.createConsultation...");
        let consultationRecord;
        let imageUrl = null;
        let patientRecord = null;
        let assessmentRecord = null;

        try {
          // Create consultation
          consultationRecord = await storage.createConsultation(consultationData);
          console.log("✅ Inserted consultation ID:", consultationRecord.id, "in database");
          
          // Log database record details
          console.log("📊 Created consultation record fields:");
          console.log(`  - ID: ${consultationRecord.id}`);
          console.log(`  - Name: ${consultationRecord.name}`);
          console.log(`  - Email: ${consultationRecord.email}`);
          console.log(`  - Clinic: ${consultationRecord.preferred_clinic}`);
          console.log(`  - Created: ${consultationRecord.createdAt}`);

          // Upload to Supabase if file present
          if (req.file) {
            console.log("📤 Uploading image to Supabase storage...");
            console.log(`📋 Image details: ${req.file.originalname}, ${req.file.mimetype}, ${req.file.buffer.length} bytes`);
            console.log(`📋 Using consultation ID: ${consultationRecord.id} and clinic: ${clinic}`);
            try {
              imageUrl = await uploadConsultationImage(consultationRecord.id, req.file, clinic);
              console.log("📤 Image upload result:", imageUrl ? `Success: ${imageUrl}` : "Failed");
            } catch (imageError: any) {
              console.error("❌ Image upload error:", imageError);
              console.error("❌ Error stack:", imageError.stack || 'No stack trace available');
            }
          } else {
            console.log("ℹ️ No image file present in the request");
          }

          // Create patient and assessment (simplified - keeping core logic)
          console.log(`🔍 Looking up patient by email: ${email}`);
          if (email && email !== "no-email@provided.com") {
            try {
              patientRecord = await storage.getPatientByEmail(email);
              if (patientRecord) {
                console.log(`✅ Found existing patient: ${patientRecord.id} (${patientRecord.name})`);
              } else {
                console.log("ℹ️ No existing patient found with this email");
              }
            } catch (e) {
              console.error("❌ Error looking up patient:", e);
            }
          }

          if (!patientRecord) {
            const patientName = rawData.name || rawData.patient_name || "Unknown Patient";
            console.log(`👤 Creating new patient: ${patientName}`);
            try {
              patientRecord = await storage.createPatient({
                name: patientName,
                email: email || "no-email@provided.com",
                phone: phone || "no-phone-provided",
              });
              console.log(`✅ Created new patient with ID: ${patientRecord.id}`);
            } catch (patientError) {
              console.error("❌ Patient creation error:", patientError);
              // Continue with a fallback patient object if creation fails
              patientRecord = {
                id: -1,
                name: patientName,
                email: email || "no-email@provided.com",
                phone: phone || "no-phone-provided",
                createdAt: new Date()
              };
              console.log("⚠️ Using fallback patient object");
            }
          }

          const primaryConcern =
            rawData.issueCategory ||
            rawData.issue_category ||
            rawData.issue_type ||
            rawData.primaryConcern ||
            rawData.symptom_description ||
            rawData.symptomDescription ||
            "General consultation";

          console.log(`📝 Creating assessment for patient ${patientRecord.id} with concern: ${primaryConcern}`);
          try {
            assessmentRecord = await storage.createAssessment({
              patientId: patientRecord.id,
              primaryConcern: primaryConcern,
              riskLevel: "medium",
              status: "completed",
              completedAt: new Date(),
              clinicLocation: clinic,
            });
            console.log(`✅ Created assessment with ID: ${assessmentRecord.id}`);
          } catch (assessmentError) {
            console.error("❌ Assessment creation error:", assessmentError);
          }
        } catch (consultationError) {
          console.error("❌ CRITICAL - Consultation creation failed:", consultationError);
          throw consultationError;
        }

        // Broadcast to WebSocket clients if we have both patient and assessment
        if (typeof (globalThis as any).broadcastToClients === "function" && patientRecord && assessmentRecord) {
          console.log(`📡 Broadcasting new assessment to WebSocket clients`);
          (globalThis as any).broadcastToClients({
            type: "new_assessment",
            data: {
              patientId: patientRecord.id,
              patientName: patientRecord.name,
              assessmentId: assessmentRecord.id,
              riskLevel: assessmentRecord.riskLevel,
              timestamp: new Date().toISOString(),
            },
          });
        }

        // Respond once with 201
        if (consultationRecord) {
          const responseData = {
            ok: true,
            id: consultationRecord.id.toString(),
            clinic,
            image_url: imageUrl,
          };
          console.log(`✅ WEBHOOK PROCESSING COMPLETE - Responding with success:`, responseData);
          res.status(201).json(responseData);
        } else {
          throw new Error("Failed to create consultation record");
        }
      } catch (error: any) { // Type the error as any to access properties
        console.error("❌ WEBHOOK ERROR:", error);
        console.error("Stack trace:", error.stack);
        res.status(500).json({
          success: false,
          message: "Internal error",
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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

app.get('/api/consultations.csv', async (req: Request, res: Response) => {
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
    const csvContent = await exportConsultationsToCSV(consultations);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="consultations.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting consultations to CSV:', error);
    res.status(500).json({ message: 'Failed to export consultations' });
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
        .filter(c => c.image_url)
        .map(c => ({
          consultationId: c.id,
          imageUrl: c.image_url,
          hasImage: c.has_image
        }))
    };

    if (format === 'csv') {
      // Use the CSV export service
      const csvContent = await exportConsultationsToCSV(consultations);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-consultations.csv"');
      res.send(csvContent);
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

// Treatment Plans routes
app.get('/api/treatment-plans', async (req: Request, res: Response) => {
  try {
    const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;

    const plans = await db.select().from(treatmentPlans)
      .where(patientId ? eq(treatmentPlans.patientId, patientId) : undefined);
    res.json(plans);
  } catch (error) {
    console.error('Error fetching treatment plans:', error);
    res.status(500).json({ message: 'Failed to fetch treatment plans' });
  }
});

app.get('/api/treatment-plans/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid treatment plan ID' });
  }

  try {
    const plan = await db.select().from(treatmentPlans).where(eq(treatmentPlans.id, id)).limit(1);
    if (!plan.length) {
      return res.status(404).json({ message: 'Treatment plan not found' });
    }
    res.json(plan[0]);
  } catch (error) {
    console.error(`Failed to fetch treatment plan ${id}:`, error);
    res.status(500).json({ message: 'Failed to fetch treatment plan' });
  }
});

app.post('/api/treatment-plans', async (req: Request, res: Response) => {
  try {
    const validatedData = insertTreatmentPlanSchema.parse(req.body);
    const newPlan = await db.insert(treatmentPlans).values({
      ...validatedData,
      treatments: validatedData.treatments as any
    }).returning();
    res.status(201).json(newPlan[0]);
  } catch (error) {
    console.error('Error creating treatment plan:', error);
    res.status(500).json({ message: 'Failed to create treatment plan' });
  }
});

app.put('/api/treatment-plans/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid treatment plan ID' });
  }

  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    const updatedPlan = await db.update(treatmentPlans)
      .set(updateData)
      .where(eq(treatmentPlans.id, id))
      .returning();
    if (!updatedPlan.length) {
      return res.status(404).json({ message: 'Treatment plan not found' });
    }
    res.json(updatedPlan[0]);
  } catch (error) {
    console.error(`Failed to update treatment plan ${id}:`, error);
    res.status(500).json({ message: 'Failed to update treatment plan' });
  }
});

app.delete('/api/treatment-plans/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid treatment plan ID' });
  }

  try {
    await db.delete(treatmentPlans).where(eq(treatmentPlans.id, id));
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete treatment plan ${id}:`, error);
    res.status(500).json({ message: 'Failed to delete treatment plan' });
  }
});

// Communications API endpoint
app.post('/api/communications', async (req: Request, res: Response) => {
  try {
    const { patientId, sentBy, type, subject, message, clinicGroup } = req.body;

    // Validate required fields
    if (!patientId || !type || !message) {
      console.log('Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: patientId, type, message'
      });
    }

    // Get patient details from database
    console.log('Looking up patient:', patientId);
    const patientRecord = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);

    if (!patientRecord.length) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = patientRecord[0];
    console.log('Found patient:', patient);

    // Determine clinic group - use provided clinicGroup or fallback to patient's clinic_group
    const clinic = clinicGroup || patient.clinic_group || 'footcare';
    console.log('Using clinic:', clinic);

    // Get clinic email settings
    const emailSettings = await db.select().from(clinicEmailSettings).where(eq(clinicEmailSettings.clinicGroup, clinic)).limit(1);
    const clinicSettings = emailSettings.length > 0 ? emailSettings[0] : null;

    let result;

    switch (type) {
      case 'email':
        if (!patient.email) {
          return res.status(400).json({ error: 'Patient has no email address' });
        }
        result = await sendEmail(patient.email, subject, message, clinicSettings);
        break;

      case 'sms':
        if (!patient.phone) {
          return res.status(400).json({ error: 'Patient has no phone number' });
        }
        result = await sendSMS(patient.phone, message);
        break;

      case 'message':
      case 'portal':
        // For now, portal messages are logged but not actually sent
        // In a real implementation, this might integrate with a patient portal system
        console.log(`Portal message to ${patient.name}: ${message}`);
        result = { success: true, method: 'portal', message: 'Portal message logged' };
        break;

      default:
        return res.status(400).json({ error: 'Invalid message type. Supported: email, sms, message, portal' });
    }

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to send message', details: result.error });
    }

    // Log the communication (optional - could be stored in database)
    console.log(`📧 Communication sent: ${type} to ${patient.name} (${patient.email || patient.phone})`);

    res.json({
      success: true,
      message: 'Message sent successfully',
      type,
      recipient: patient.name,
      method: result.method || type
    });

  } catch (error) {
    console.error('Error sending communication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Communications Hub email sending route
app.post('/api/communications/send', async (req: Request, res: Response) => {
  const { to, subject, text, html, templateId, variables, from, fromName, replyTo } = req.body;

  const emailResult = await mailSendEmail({ to, subject, text, html, templateId, variables, from, fromName, replyTo });

  return emailResult.ok
    ? res.status(200).json({ ok: true, provider: 'mailersend', id: emailResult.id })
    : res.status(502).json({ ok: false, provider: 'mailersend', error: emailResult.error, status: emailResult.status });
});

// Self-test route for communications
app.post('/api/communications/self-test', async (req: Request, res: Response) => {
  const { to, templateId, variables, subject, text } = req.body;

  const result = await mailSendEmail({ to, subject, text, templateId, variables });

  return result.ok
    ? res.status(200).json(result)
    : res.status(502).json(result);
});

// Email sending function
async function sendEmail(to: string, subject: string, html: string, clinicSettings?: any) {
  try {
    // Use clinic-specific settings if available, otherwise fall back to environment variables
    const emailService = clinicSettings?.emailService || process.env.EMAIL_SERVICE || 'sendgrid';
    const fromEmail = clinicSettings?.emailFrom || process.env.EMAIL_FROM || 'noreply@eteahealthcare.com';
    const fromName = clinicSettings?.emailFromName || process.env.EMAIL_FROM_NAME || 'ETEA Healthcare';

    if (emailService === 'sendgrid') {
      // MailerSend implementation
      const apiKey = clinicSettings?.mailerSendApiKey || process.env.MAILER_SEND_API_KEY;
      if (!apiKey) {
        throw new Error('MAILER_SEND_API_KEY not configured for this clinic');
      }

      const mailerSendData = {
        from: {
          email: fromEmail,
          name: fromName
        },
        to: [{ email: to }],
        subject,
        html
      };

      const response = await axios.post('https://api.mailersend.com/v1/email', mailerSendData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 202) {
        throw new Error('Failed to send email via MailerSend');
      }

      return { success: true, method: 'mailersend' };

    } else if (emailService === 'smtp') {
      // Nodemailer implementation (for SMTP)
      const transporter = nodemailer.createTransport({
        host: clinicSettings?.smtpHost || process.env.SMTP_HOST,
        port: clinicSettings?.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
        secure: clinicSettings?.smtpSecure || process.env.SMTP_SECURE === 'true',
        auth: {
          user: clinicSettings?.smtpUser || process.env.SMTP_USER,
          pass: clinicSettings?.smtpPass || process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html
      });

      return { success: true, method: 'smtp' };
    } else {
      throw new Error(`Unsupported email service: ${emailService}`);
    }

  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// SMS sending function (placeholder for future implementation)
async function sendSMS(to: string, message: string) {
  try {
    const smsService = process.env.SMS_SERVICE;

    if (!smsService) {
      // Mock SMS sending for development
      console.log(`📱 Mock SMS to ${to}: ${message}`);
      return { success: true, method: 'mock' };
    }

    if (smsService === 'twilio') {
      // Twilio implementation would go here
      // const twilio = require('twilio');
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await client.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to
      // });
      console.log(`📱 Twilio SMS to ${to}: ${message} (not implemented)`);
      return { success: false, error: 'Twilio integration not implemented yet' };
    }

    return { success: false, error: `Unsupported SMS service: ${smsService}` };

  } catch (error) {
    console.error('SMS sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

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
