import { RequestHandler } from 'express';
import helmet, { HelmetOptions } from 'helmet';

/**
 * Security headers for an API (helmet): nosniff, frame denial, referrer policy, cross-origin policies, and
 * HSTS in production. The content security policy is off by default: JSON responses do not need it and it
 * would block the swagger UI. Pass helmet options to change any of this.
 */
export function securityHeaders(options: HelmetOptions = {}): RequestHandler {
  const production = ['production', 'prod'].includes(
    process.env.NODE_ENV ?? ''
  );
  const defaults: HelmetOptions = {
    contentSecurityPolicy: false,
    strictTransportSecurity: production
      ? { maxAge: 31_536_000, includeSubDomains: true }
      : false
  };
  return helmet({ ...defaults, ...options } as HelmetOptions);
}
