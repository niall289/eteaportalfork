import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";

import { pool as db } from "./db";
import WebSocket, { WebSocketServer } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated, skipAuthForWebhook } from "./simpleAuth";
import cors from "cors";

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

  // NOTE: Do NOT register /api/health here to preserve the instance added in server/index.ts

  // Auth status route is provided by simple auth (registered in server/index.ts).
  // Avoid redefining here to prevent conflicts.

  const ENABLE_CHATBOT_SETTINGS =
    process.env.VITE_ENABLE_CHATBOT_SETTINGS === "true";

  if (ENABLE_CHATBOT_SETTINGS) {
    app.get(
      "/api/chatbot-settings",
      isAuthenticated,
      async (_req: Request, res: Response) => {
        // Always set JSON content type first
        res.setHeader("Content-Type", "application/json");

        try {
          const settings = await storage.getChatbotSettings();
          res.status(200).json({
            success: true,
            data: settings || {},
          });
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

    app.patch(
      "/api/chatbot-settings",
      isAuthenticated,
      async (req: Request, res: Response) => {
        // Always set JSON content type first
        res.setHeader("Content-Type", "application/json");

        try {
          const updates = req.body;
          console.log("Received chatbot settings update:", updates);

          // Validate chatbot tone if provided
          if (
            updates.chatbotTone &&
            !["Friendly", "Professional", "Clinical", "Casual"].includes(
              updates.chatbotTone
            )
          ) {
            return res.status(400).json({
              success: false,
              message: "Invalid chatbot tone value.",
            });
          }

          const updatedSettings = await storage.updateChatbotSettings(updates);
          console.log("Updated chatbot settings:", updatedSettings);

          res.status(200).json({
            success: true,
            data: updatedSettings,
            message: "Settings updated successfully",
          });
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

        // Check for duplicate webhook using conversation ID or unique identifier
        const sessionId =
          rawData.sessionId ||
          rawData.conversation_id ||
          rawData.chatbot_session_id;
        if (sessionId) {
          console.log("🔍 Checking for duplicate session:", sessionId);
          try {
            const existingConsultations = await storage.getConsultations();
            const isDuplicate = existingConsultations.some(
              (c) =>
                c.conversation_log &&
                Array.isArray(c.conversation_log) &&
                c.conversation_log.some((log: any) => log.sessionId === sessionId)
            );

            if (isDuplicate) {
              console.warn(
                "⚠️ Duplicate webhook detected for session:",
                sessionId
              );
              return res.status(200).json({
                success: true,
                message: "Duplicate webhook ignored",
                sessionId: sessionId,
              });
            }
          } catch (error) {
            console.error(
              "⚠️ Error checking for duplicates, continuing:",
              error
            );
          }
        }

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
                success: true,
                message: "Recent consultation duplicate ignored",
                consultationId: recentConsultationDuplicate.id,
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
                success: true,
                message: "Recent assessment duplicate ignored",
                assessmentId: recentAssessmentDuplicate.id,
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
              ? "Yes"
              : "No"),
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
            (sessionId ? [{ sessionId, timestamp: new Date().toISOString() }] : []),
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

        // Store ALL consultation fields properly
        const consultationRecord = await storage.createConsultation(
          consultationData
        );

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
              success: true,
              message: "Using existing assessment",
              consultationId: consultationRecord.id,
              patientId: patient.id,
              assessmentId: existingAssessment.id,
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
          success: true,
          message: "Consultation processed successfully",
          consultationId: consultationRecord.id,
          patientId: patient.id,
          assessmentId: assessment.id,
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

app.get('/api/consultations', async (_req: Request, res: Response) => {
  try {
    const consultations = await storage.getConsultations();
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
    };

    if (format === 'csv') {
      const csvHeaders = 'ID,Patient Name,Email,Risk Level,Primary Concern,Status,Completed At,Clinic Location\n';
      const csvData = assessments
        .map(
          (a: any) =>
            `${a.id},"${a.patient?.name || 'Unknown'}","${a.patient?.email || 'N/A'}","${a.riskLevel}","${a.primaryConcern}","${a.status}","${a.completedAt}","${a.clinicLocation || 'N/A'}"`
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
      res.send(csvHeaders + csvData);
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
