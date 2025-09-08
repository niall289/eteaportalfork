import dotenv from 'dotenv';
import path from 'path';

// Load environment variables early, before any other imports that might use them
dotenv.config(); // loads project root .env
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') }); // also load server/.env

import express, { type Request, Response, NextFunction } from 'express';
import { setupVite, serveStatic, log } from './vite';
import { registerSimpleAuth } from './simpleAuth';

const PORT = parseInt(process.env.PORT ?? '5002', 10);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  // Register your existing routes (keeps current behavior)
  const { registerRoutes } = await import('./routes');
  const server = await registerRoutes(app);

  // --- Operational health endpoints for acceptance tests ---

  // Simple liveness/readiness
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      port: PORT,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
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

  // Dev: Vite; Prod: static files
  if (app.get('env') === 'development') {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Single entry point — bind to 0.0.0.0 on the chosen port
  server.listen({ host: '0.0.0.0', port: PORT }, () => {
    log(`serving on port ${PORT}`);
  });
})();
