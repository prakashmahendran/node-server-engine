import type { Request } from 'express';
import type { VerificationTokenPayload } from 'utils/verificationToken';

export interface VerificationTokenMiddlewareOptions {
  /** Header name to read verification token from */
  tokenHeader?: string;
  /** Header name to read OTP from */
  otpHeader?: string;
  /** Body or query field name to read token from */
  tokenField?: string;
  /** Body or query field name to read OTP from */
  otpField?: string;
  /** Resolve subject to verify against token sub */
  subjectResolver?: (request: Request) => string | undefined;
  /** Require OTP for verification */
  requireOtp?: boolean;
  /** Override token issuer */
  issuer?: string;
  /** Optional audience */
  audience?: string | string[];
  /** Enforce that token contains a subject when subjectResolver returns one */
  requireSubject?: boolean;
}

export {};

// Override the Express request object to add the verification payload
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express request object */
    interface Request {
      verification?: VerificationTokenPayload;
    }
  }
}
