import { Router } from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import session from 'express-session';

// Extend express-session with our token and auth
declare module 'express-session' {
  interface SessionData {
    token?: string;
    auth?: { user: string; ts: number };
  }
}

// Password for authentication - simple approach
const ADMIN_PASSWORD = 'footcare2025';

// Token for simple authentication
let AUTH_TOKEN: string | null = null;

// Simple session setup
export function getSession() {
  return session({
    secret: 'footcare-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      httpOnly: true,
      secure: false 
    }
  });
}

export function setupAuth(app: Express) {
  app.use(getSession());
  
  // Simple login route with token-based authentication
  app.post('/api/login', (req: Request, res: Response) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
      // Generate token on successful login
      AUTH_TOKEN = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Store token in session
      req.session.token = AUTH_TOKEN;
      
      return res.json({ 
        success: true, 
        message: 'Login successful',
        token: AUTH_TOKEN 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid password'
    });
  });
  
  // Logout route
  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    });
  });
  
  // Check if user is authenticated
  app.get('/api/auth/user', (req: Request, res: Response) => {
    const session = req.session as any;
    
    if (session?.token && session.token === AUTH_TOKEN) {
      return res.json({
        id: 'admin',
        role: 'admin',
        authenticated: true
      });
    }
    
    return res.status(401).json({ 
      authenticated: false,
      message: 'Not authenticated' 
    });
  });
}

// Authentication middleware - enabled for security
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!(req.session && (req.session as any).auth)) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  return next();
}

// Skip auth for webhook and clinic data
export function skipAuthForWebhook(req: Request, res: Response, next: NextFunction) {
  if (
    req.path === '/api/webhook/chatbot' ||
    req.path === '/api/webhook/consultation' ||
    req.path === '/api/webhooks/footcare' ||
    req.path === '/api/clinics' ||
    req.path === '/api/clinics/assessment-counts'
  ) {
    return next();
  }
  
  return isAuthenticated(req, res, next);
}

// Simple "AUTH_MODE=simple" router providing /api/login (token) and lightweight session
export function registerSimpleAuth(app: Express) {
  const AUTH_MODE = process.env.AUTH_MODE || "simple";
  if (AUTH_MODE !== "simple") return;

  const AUTH_TOKEN = (process.env.AUTH_TOKEN ?? "footcare2025").trim();

  const router = Router();
  // Debug init (non-sensitive)
  try {
    console.log(`[auth] simple-auth mounted. mode=${AUTH_MODE} tokenLen=${AUTH_TOKEN.length}`);
  } catch {}

  // Helpful endpoint for GET to avoid confusion — POST is required
  router.get("/api/login", (_req: Request, res: Response) => {
    res.status(405).json({ error: "Method not allowed. Use POST /api/login with { token }" });
  });

  // POST /api/login -> { ok: true } + set cookie/session
  router.post("/api/login", (req: Request, res: Response) => {
    const { token: tokenFromBody, password } =
      (req.body ?? {}) as { token?: string; password?: string };
    const providedRaw = tokenFromBody ?? password ?? "";
    const token = String(providedRaw).trim();

    // Debug info (non-sensitive)
    try {
      console.log(
        `[auth] /api/login tokenProvided=${Boolean(token)} tokenLen=${token ? token.length : 0} expectedLen=${AUTH_TOKEN.length} match=${token === AUTH_TOKEN}`
      );
    } catch {}

    if (!token || token !== AUTH_TOKEN) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Set session flag
    if (!req.session) {
      req.session = {} as any;
    }
    (req.session as any).auth = { user: "admin", ts: Date.now() };
    // also set a token to satisfy any legacy session checks
    (req.session as any).token = AUTH_TOKEN;

    // Also set a lightweight cookie so SPA guards can work even if no session store
    try {
      res.cookie("simple_auth", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    } catch {}

    return res.json({ ok: true });
  });

  // Auth status endpoint used by SPA guard
  router.get("/api/auth/user", (req: Request, res: Response) => {
    let authenticated = false;
    try {
      // @ts-ignore
      if (req.session && ((req.session as any).auth || req.session.authenticated === true || req.session.token === AUTH_TOKEN)) {
        authenticated = true;
      }
    } catch {}

    if (!authenticated) {
      // Fallback to cookie if no session store
      const raw = req.headers.cookie || "";
      const has = raw.split(";").some((c) => c.trim().startsWith("simple_auth=1"));
      authenticated = has;
    }

    if (authenticated) {
      return res.json({ authenticated: true });
    }
    return res.status(401).json({ authenticated: false, message: "Not authenticated" });
  });

  // Optional: logout
  router.post("/api/logout", (req: Request, res: Response) => {
    try {
      // @ts-ignore
      if (req.session) {
        // @ts-ignore
        return req.session.destroy(() => {
          res.clearCookie("simple_auth");
          res.json({ ok: true });
        });
      }
    } catch {}
    res.clearCookie("simple_auth");
    return res.json({ ok: true });
  });

  app.use(router);
}