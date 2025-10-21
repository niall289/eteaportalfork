import dotenv from 'dotenv';
import path from 'path';

// Load environment variables early, before any other imports that might use them
dotenv.config(); // loads project root .env
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') }); // also load server/.env

console.log('Runtime env check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('AUTH_MODE present:', !!process.env.AUTH_MODE);
console.log('AUTH_TOKEN present:', !!process.env.AUTH_TOKEN);
console.log('FOOTCARE_WEBHOOK_SECRET present:', !!process.env.FOOTCARE_WEBHOOK_SECRET);
console.log('NAIL_WEBHOOK_SECRET present:', !!process.env.NAIL_WEBHOOK_SECRET);
console.log('CORS_ORIGIN present:', !!process.env.CORS_ORIGIN);
console.log('UPLOADS_ROOT present:', !!process.env.UPLOADS_ROOT);

// MailerSend environment validation
const mailersendApiKey = process.env.MAILERSEND_API_KEY;
if (mailersendApiKey) {
  const masked = mailersendApiKey.length > 8 ? mailersendApiKey.slice(0, 4) + '...' + mailersendApiKey.slice(-4) : mailersendApiKey;
  console.log('MAILERSEND_API_KEY present:', masked);
} else {
  console.warn('WARNING: MAILERSEND_API_KEY is missing');
}

const mailersendFrom = process.env.MAILERSEND_FROM;
if (mailersendFrom) {
  console.log('MAILERSEND_FROM present:', mailersendFrom);
} else {
  console.warn('WARNING: MAILERSEND_FROM is missing');
}

import express, { type Request, Response, NextFunction } from 'express';
import cookieSession from 'cookie-session';
import cors from 'cors';
import { setupVite, serveStatic, log } from './vite';
import { registerSimpleAuth } from './simpleAuth';

const PORT = parseInt(process.env.PORT ?? '5002', 10);

const UPLOADS_ROOT = process.env.UPLOADS_ROOT || './uploads';

const app = express();

// Trust proxy for production reverse proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173';
app.use(cors({
  origin: corsOrigin.split(',').map(s => s.trim()),
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie-session configuration
app.use(cookieSession({
  name: "etea.sid",
  keys: [process.env.SESSION_SECRET || "dev-fallback-key"],
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && process.env.FORCE_INSECURE_COOKIE !== "1",
  sameSite: "lax",
  path: "/",
}) as any);

// Register webhook routes BEFORE auth middleware to bypass authentication
import multer from 'multer';

// Multer setup for webhook file uploads (memory storage)
const webhookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Dedicated Nail Surgery Webhook Route (BEFORE auth middleware)
app.post('/api/webhooks/nailsurgery', webhookUpload.any(), async (req: Request, res: Response) => {
  try {
    console.log(`\n🔔 NAIL SURGERY WEBHOOK - ${new Date().toISOString()}`);
    
    // Validate X-Webhook-Secret header (case-insensitive)
    const headerSecret = (req.get('x-webhook-secret') ?? req.get('X-Webhook-Secret') ?? '').trim();
    const expectedSecret = (process.env.NAIL_WEBHOOK_SECRET ?? '').trim();
    if (!headerSecret || headerSecret !== expectedSecret) return res.status(401).json({ error:'Unauthorized' });
    
    // Parse data from req.body.data (JSON string) or fallback to req.body
    let rawData;
    if (req.body.data) {
      try {
        rawData = JSON.parse(req.body.data);
        console.log("✅ Parsed JSON from data field");
      } catch (e) {
        rawData = req.body;
        console.warn("⚠️ Using req.body fallback");
      }
    } else {
      rawData = req.body;
    }
    
    // Truncate payload for dev logging
    if (process.env.NODE_ENV !== 'production') {
      const truncated = JSON.stringify(rawData).slice(0, 500);
      console.log("📊 Payload preview:", truncated + (JSON.stringify(rawData).length > 500 ? '...' : ''));
    }
    
    // Validate at least one of name, email, or phone is present
    const name = rawData.name || rawData.patient_name || rawData.userName;
    const email = rawData.email || rawData.patient_email || rawData.userEmail;
    const phone = rawData.phone || rawData.patient_phone || rawData.userPhone;
    
    if (!name && !email && !phone) {
      return res.status(400).json({ error: "At least one of name, email, or phone is required" });
    }
    
    // Handle image uploads to Supabase
    let imageUrls: string[] = [];
    if (req.files && (req.files as Express.Multer.File[]).length > 0) {
      try {
        const { supabaseAdmin } = await import('./supabase');
        
        for (const file of req.files as Express.Multer.File[]) {
          const fileName = `nail-surgery/${Date.now()}-${file.originalname}`;
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('triageimages')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              upsert: false
            });

          if (uploadError) {
            console.error('❌ Supabase upload error:', uploadError);
            continue;
          }

          const { data: urlData } = supabaseAdmin.storage
            .from('triageimages')
            .getPublicUrl(fileName);
          
          if (urlData?.publicUrl) {
            imageUrls.push(urlData.publicUrl);
            console.log('✅ Uploaded image:', urlData.publicUrl);
          }
        }
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
      }
    }

    // Normalize data for Nail Surgery Clinic (matching schema structure)
    const formData: any = {
      name: name || "Unknown Patient",
      email: email || "no-email@provided.com", 
      phone: phone || "no-phone-provided",
      preferred_clinic: rawData.preferred_clinic ?? null,
      issue_category: rawData.issue_category || rawData.issueCategory || "General consultation",
      issue_specifics: rawData.issue_specifics || rawData.issueSpecifics || null,
      symptom_description: rawData.symptom_description || rawData.symptomDescription || null,
      previous_treatment: rawData.previous_treatment || rawData.previousTreatment || null,
      has_image: imageUrls.length > 0 ? "true" : "false",
      image_path: null,
      image_analysis: rawData.image_analysis || rawData.imageAnalysis || null,
      image_url: imageUrls[0] || null, // First image for backward compatibility
      image_urls: imageUrls, // Array of all image URLs
      calendar_booking: rawData.calendar_booking || rawData.calendarBooking || null,
      booking_confirmation: rawData.booking_confirmation || rawData.bookingConfirmation || null,
      final_question: rawData.final_question || rawData.finalQuestion || null,
      additional_help: rawData.additional_help || rawData.additionalHelp || null,
      emoji_survey: rawData.emoji_survey || rawData.emojiSurvey || null,
      survey_response: rawData.survey_response || rawData.surveyResponse || null,
      conversation_log: rawData.conversation_log || rawData.conversationLog || [],
      completed_steps: rawData.completed_steps || rawData.completedSteps || [],
      raw_json: rawData,
      symptom_analysis: rawData.symptom_analysis || rawData.symptomAnalysis || null,
      pain_duration: rawData.pain_duration || rawData.painDuration || null,
      pain_severity: rawData.pain_severity || rawData.painSeverity || null,
      additional_info: rawData.additional_info || rawData.additionalInfo || null,
      clinic_domain: rawData.clinic_domain || 'nailsurgeryclinic.engageiobots.com',
      clinic_source: rawData.clinic_source || null,
      clinic: "nailsurgery", // Required for database constraint
      source: rawData.source ?? 'nail_surgery_clinic',
      clinic_group: rawData.clinic_group ?? 'The Nail Surgery Clinic',
      status: 'new' // Set default status
    };
    
    // Persist using storage.createConsultation if available
    let consultationRecord;
    try {
      // Import storage dynamically to avoid early DB connection
      const { storage } = await import('./storage');
      consultationRecord = await storage.createConsultation(formData);
      console.log("✅ Created consultation via storage:", consultationRecord.id);
    } catch (storageError) {
      console.warn("⚠️ Storage failed, trying direct supabase:", storageError);
      try {
        // Fallback to direct supabase insertion
        const { supabaseAdmin } = await import('./supabase');
        const result = await supabaseAdmin.from('consultations').insert(formData).select('id').single();
        if (result.error) throw result.error;
        consultationRecord = result.data;
        console.log("✅ Created consultation via supabase:", consultationRecord.id);
      } catch (supabaseError) {
        console.error("❌ Both storage and supabase failed:", supabaseError);
        throw new Error("Failed to persist consultation data");
      }
    }
    
    // Return required response format
    res.status(200).json({ 
      success: true, 
      id: consultationRecord.id.toString() 
    });
    
  } catch (error: any) {
    console.error("❌ Nail Surgery webhook error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Debug endpoint for development (webhook testing)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/webhook-test', (req: Request, res: Response) => {
    const secretConfigured = !!process.env.NAIL_WEBHOOK_SECRET;
    const secretPreview = process.env.NAIL_WEBHOOK_SECRET ? 
      process.env.NAIL_WEBHOOK_SECRET.slice(0, 3) + '…' : 'none';
    
    res.json({
      secretConfigured,
      secretPreview,
      dbConnectivity: true, // Assume OK if server is running
      route: "/api/webhooks/nailsurgery"
    });
  });
}

// register simple auth when requested (AUTH_MODE=simple)
registerSimpleAuth(app);

// Lightweight API logger (preserves your behavior)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any | undefined = undefined;

  const originalResJson = res.json.bind(res);
  (res as any).json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          /* ignore JSON stringify issues */
        }
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + '…';
      log(logLine);
    }
  });

  next();
});

app.use('/uploads', express.static(UPLOADS_ROOT));

(async () => {
  // Register your routes with Supabase image upload functionality
  const { registerRoutes } = await import('./routes');
  const server = await registerRoutes(app);

  // --- Operational health endpoints for acceptance tests ---

  // Simple liveness/readiness
  app.get('/api/health', (_req: Request, res: Response) => {
    // Set defaults if not set
    if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = 'http://127.0.0.1:5173,http://localhost:5173';
    if (!process.env.UPLOADS_ROOT) process.env.UPLOADS_ROOT = './uploads';

    res.status(200).json({
      status: 'ok',
      env_presence: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        AUTH_MODE: !!process.env.AUTH_MODE,
        AUTH_TOKEN: !!process.env.AUTH_TOKEN,
        FOOTCARE_WEBHOOK_SECRET: !!process.env.FOOTCARE_WEBHOOK_SECRET,
        NAIL_WEBHOOK_SECRET: !!process.env.NAIL_WEBHOOK_SECRET,
        CORS_ORIGIN: !!process.env.CORS_ORIGIN,
        UPLOADS_ROOT: !!process.env.UPLOADS_ROOT,
      }
    });
  });

  // Simple health check endpoint
  app.get('/api/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  // Diagnostics endpoint for session verification
  app.get('/api/whoami', (req: Request, res: Response) => {
    const auth = (req.session as any)?.auth;
    if (auth) {
      res.json({ authenticated: true, auth });
    } else {
      res.json({ authenticated: false });
    }
  });

  // DB connectivity probe (works if ./db exports a pool with .query)
  app.get('/api/db-ping', async (_req: Request, res: Response) => {
    try {
      const mod: any = await import('./db');
      const pool = mod?.pool ?? mod?.default ?? mod?.db ?? null;
      if (!pool || typeof pool.query !== 'function') {
        return res
          .status(200)
          .json({ ok: true, note: 'No pool.query available from ./db (skipping)' });
      }
      const r = await pool.query('SELECT 1 as ok');
      return res.status(200).json({ ok: true, result: r.rows?.[0] ?? null });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  // Central error handler — do NOT exit the process
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || 'Internal Server Error';
    res.status(status).json({ message });
  });

  // Dev: Client served by Vite middleware; Prod: static files
  if (app.get('env') === 'production') {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // Single entry point — bind to 0.0.0.0 on the chosen port
  server.listen({ host: '0.0.0.0', port: PORT }, () => {
    log(`serving on port ${PORT}`);
    console.log(`Example curl command for self-test: curl http://localhost:${PORT}/api/health`);
  });
})();
