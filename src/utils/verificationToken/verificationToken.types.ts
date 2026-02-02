export interface VerificationTokenPayload {
  /** Action this verification token is bound to */
  act: string;
  /** Hashed OTP */
  otp: string;
  /** Unique token id */
  jti: string;
  /** Subject (user or entity id) */
  sub?: string;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string | string[];
  /** Issued at */
  iat?: number;
  /** Expiration */
  exp?: number;
}

export interface VerificationTokenOptions {
  /** Action to authorize (ex: "DELETE ACCOUNT") */
  action: string;
  /** Subject (user or entity id) */
  subject?: string;
  /** OTP length, defaults to 6 */
  otpLength?: number;
  /** Token lifetime in seconds, defaults to 300 */
  expiresInSeconds?: number;
  /** Override token issuer */
  issuer?: string;
  /** Optional audience */
  audience?: string | string[];
}

export interface VerificationTokenResult {
  token: string;
  otp: string;
  expiresAt: number;
  action: string;
}

export interface VerifyVerificationTokenOptions {
  action?: string;
  subject?: string;
  otp?: string;
  issuer?: string;
  audience?: string | string[];
}
