import { Request } from 'express';

/**
 * Standardized clinic scoping function
 * Extracts active clinic group from query string, session, or host domain
 */
export function getClinicScope(req: Request): string {
  // 1. Check query string parameter (highest priority)
  const queryClinicGroup = req.query.clinic_group as string;
  if (queryClinicGroup) {
    return queryClinicGroup;
  }

  // 2. Check session/cookie (if available)
  const sessionClinicGroup = (req.session as any)?.clinic_group;
  if (sessionClinicGroup) {
    return sessionClinicGroup;
  }

  // 3. Check host header for domain-based scoping
  const host = req.get('host') || '';
  if (host.includes('nailsurgeryclinic.engageiobots.com') || host.includes('nailsurgery')) {
    return 'The Nail Surgery Clinic';
  }
  if (host.includes('lasercare')) {
    return 'Lasercare Clinic';
  }

  // 4. Default to FootCare to avoid regressions
  return 'FootCare Clinic';
}

/**
 * Build WHERE conditions for clinic scoping in database queries
 */
export function buildClinicScopeConditions(clinicGroup: string) {
  return {
    clinic_group: clinicGroup
  };
}