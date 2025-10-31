import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce clinic group assignment based on domain and endpoint
 */
export function enforceClinicGroup(req: Request, res: Response, next: NextFunction) {
  // Only process webhook requests
  if (!req.path.startsWith('/api/webhooks/')) {
    return next();
  }

  // Get the clinic from the URL (e.g., /api/webhooks/nailsurgery -> nailsurgery)
  const clinic = req.path.split('/').pop();
  
  // Force correct clinic group based on endpoint
  if (clinic === 'nailsurgery') {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {
        // If parsing fails, leave body as is
      }
    }
    
    // Handle both direct JSON and FormData cases
    const data = req.body.data ? JSON.parse(req.body.data) : req.body;
    
    // Enforce Nail Surgery fields
    const enriched = {
      ...data,
      source: 'nailsurgery',
      chatbotSource: 'nailsurgery',
      preferred_clinic: 'nailsurgery',
      clinic_group: 'The Nail Surgery Clinic'
    };

    // Put the enriched data back in the right place
    if (req.body.data) {
      req.body.data = JSON.stringify(enriched);
    } else {
      req.body = enriched;
    }
  }

  next();
}