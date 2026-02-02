import { randomInt, randomUUID, createHmac } from 'crypto';
import { sign, verify, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { EngineError } from 'entities/EngineError';
import { WebError } from 'entities/WebError';
import { assertEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';
import {
  VerificationTokenPayload,
  VerificationTokenOptions,
  VerificationTokenResult,
  VerifyVerificationTokenOptions
} from './verificationToken.types';

const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_EXPIRES_IN_SECONDS = 5 * 60;
const DEFAULT_ISSUER = 'node-server-engine';

function normalizeAction(action: string): string {
  if (!action || typeof action !== 'string') {
    throw new EngineError({
      message: 'Verification token action must be a non-empty string',
      data: { action }
    });
  }
  return action.trim().toUpperCase();
}

function resolveOtpLength(length?: number): number {
  if (length === undefined) return DEFAULT_OTP_LENGTH;
  if (!Number.isInteger(length) || length < 4 || length > 10) {
    throw new EngineError({
      message: 'OTP length must be an integer between 4 and 10',
      data: { length }
    });
  }
  return length;
}

function resolveExpiresInSeconds(expiresInSeconds?: number): number {
  if (expiresInSeconds === undefined) return DEFAULT_EXPIRES_IN_SECONDS;
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 30) {
    throw new EngineError({
      message: 'Verification token expiration must be at least 30 seconds',
      data: { expiresInSeconds }
    });
  }
  return expiresInSeconds;
}

function getTokenSecret(): string {
  const secret = process.env.VERIFICATION_TOKEN_SECRET;
  if (!secret) {
    assertEnvironment({ VERIFICATION_TOKEN_SECRET: envAssert.isString() });
  }
  return secret as string;
}

function getOtpSecret(): string {
  return process.env.VERIFICATION_TOKEN_OTP_SECRET ?? getTokenSecret();
}

function hashOtp(otp: string, secret: string): string {
  return createHmac('sha256', secret).update(otp).digest('hex');
}

function generateOtp(length: number): string {
  let otp = '';
  for (let index = 0; index < length; index += 1) {
    otp += randomInt(0, 10).toString();
  }
  return otp;
}

function buildIssuer(issuer?: string): string {
  return issuer ?? process.env.VERIFICATION_TOKEN_ISSUER ?? DEFAULT_ISSUER;
}

function buildSignOptions(options: VerificationTokenOptions): SignOptions {
  const signOptions: SignOptions = {
    algorithm: 'HS256',
    expiresIn: resolveExpiresInSeconds(options.expiresInSeconds),
    issuer: buildIssuer(options.issuer)
  };
  if (options.audience) {
    signOptions.audience = options.audience;
  } else if (process.env.VERIFICATION_TOKEN_AUDIENCE) {
    signOptions.audience = process.env.VERIFICATION_TOKEN_AUDIENCE;
  }
  return signOptions;
}

function normalizeAudience(
  audience?: string | string[]
): VerifyOptions['audience'] | undefined {
  if (!audience) return undefined;
  if (Array.isArray(audience)) {
    if (audience.length === 0) return undefined;
    return [audience[0], ...audience.slice(1)];
  }
  return audience;
}

function buildVerifyOptions(options: VerifyVerificationTokenOptions): VerifyOptions {
  const verifyOptions: VerifyOptions = {
    algorithms: ['HS256'],
    issuer: buildIssuer(options.issuer)
  };
  const normalizedAudience = normalizeAudience(
    options.audience ?? process.env.VERIFICATION_TOKEN_AUDIENCE
  );
  if (normalizedAudience) verifyOptions.audience = normalizedAudience;
  return verifyOptions;
}

export function createVerificationToken(
  options: VerificationTokenOptions
): VerificationTokenResult {
  const action = normalizeAction(options.action);
  const otpLength = resolveOtpLength(options.otpLength);
  const tokenSecret = getTokenSecret();
  const otpSecret = getOtpSecret();
  const otp = generateOtp(otpLength);
  const signOptions = buildSignOptions(options);
  const payload: VerificationTokenPayload = {
    act: action,
    otp: hashOtp(otp, otpSecret),
    jti: randomUUID(),
    sub: options.subject
  };

  const token = sign(payload, tokenSecret, signOptions);
  const expiresInSeconds = signOptions.expiresIn as number;

  return {
    token,
    otp,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    action
  };
}

export const verificationToken = createVerificationToken;

export function verifyVerificationToken(
  token: string,
  options: VerifyVerificationTokenOptions = {}
): VerificationTokenPayload {
  const tokenSecret = getTokenSecret();
  let payload: VerificationTokenPayload;

  try {
    payload = verify(token, tokenSecret, buildVerifyOptions(options)) as VerificationTokenPayload;
  } catch (error: unknown) {
    throw new WebError({
      errorCode: 'unauthorized',
      statusCode: 401,
      message: 'Invalid verification token supplied',
      data: { token },
      error: error instanceof Error ? error : undefined
    });
  }

  if (!payload?.act || !payload?.otp || !payload?.jti) {
    throw new WebError({
      errorCode: 'unauthorized',
      statusCode: 401,
      message: 'Malformed verification token payload'
    });
  }

  if (options.action) {
    const action = normalizeAction(options.action);
    if (payload.act !== action) {
      throw new WebError({
        errorCode: 'verification_failed',
        statusCode: 403,
        message: 'Verification action mismatch',
        data: { expected: action, actual: payload.act }
      });
    }
  }

  if (options.subject && payload.sub !== options.subject) {
    throw new WebError({
      errorCode: 'verification_failed',
      statusCode: 403,
      message: 'Verification subject mismatch',
      data: { expected: options.subject, actual: payload.sub }
    });
  }

  if (options.otp) {
    const otpSecret = getOtpSecret();
    const expectedHash = hashOtp(options.otp, otpSecret);
    if (payload.otp !== expectedHash) {
      throw new WebError({
        errorCode: 'verification_failed',
        statusCode: 403,
        message: 'Verification OTP mismatch'
      });
    }
  }

  return payload;
}
