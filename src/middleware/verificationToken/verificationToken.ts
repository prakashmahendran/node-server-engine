import { Request, Response, NextFunction } from 'express';
import { WebError } from 'entities/WebError';
import { reportDebug } from 'utils/report';
import { verifyVerificationToken } from 'utils/verificationToken';
import { VerificationTokenMiddlewareOptions } from './verificationToken.types';

const namespace = 'engine:middleware:verificationToken';

const DEFAULT_TOKEN_HEADER = 'x-verification-token';
const DEFAULT_OTP_HEADER = 'x-verification-otp';
const DEFAULT_TOKEN_FIELD = 'verificationToken';
const DEFAULT_OTP_FIELD = 'verificationOtp';

function readString(
  request: Request,
  headerName: string,
  fieldName: string
): string | undefined {
  const headerValue = request.headers[headerName.toLowerCase()];
  if (typeof headerValue === 'string') return headerValue;
  if (Array.isArray(headerValue)) return headerValue[0];

  const bodyValue =
    request.body && typeof request.body === 'object'
      ? (request.body as Record<string, unknown>)[fieldName]
      : undefined;
  if (typeof bodyValue === 'string') return bodyValue;

  const queryValue =
    request.query && typeof request.query === 'object'
      ? (request.query as Record<string, unknown>)[fieldName]
      : undefined;
  if (typeof queryValue === 'string') return queryValue;
  if (Array.isArray(queryValue)) return queryValue[0];

  return undefined;
}

export function verificationToken(
  action: string,
  options: VerificationTokenMiddlewareOptions = {}
): (request: Request, response: Response, next: NextFunction) => void {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const tokenHeader = options.tokenHeader ?? DEFAULT_TOKEN_HEADER;
    const otpHeader = options.otpHeader ?? DEFAULT_OTP_HEADER;
    const tokenField = options.tokenField ?? DEFAULT_TOKEN_FIELD;
    const otpField = options.otpField ?? DEFAULT_OTP_FIELD;
    const requireOtp = options.requireOtp !== false;

    const token = readString(request, tokenHeader, tokenField);
    if (!token) {
      throw new WebError({
        errorCode: 'verification_token_missing',
        statusCode: 400,
        message: 'Verification token is required',
        data: { tokenHeader, tokenField }
      });
    }

    const otp = readString(request, otpHeader, otpField);
    if (requireOtp && !otp) {
      throw new WebError({
        errorCode: 'verification_otp_missing',
        statusCode: 400,
        message: 'Verification OTP is required',
        data: { otpHeader, otpField }
      });
    }

    const resolvedSubject = options.subjectResolver
      ? options.subjectResolver(request)
      : (request.user?.id as string | undefined) ??
        (request.user?.sub as string | undefined);

    const payload = verifyVerificationToken(token, {
      action,
      otp: requireOtp ? otp : undefined,
      issuer: options.issuer,
      audience: options.audience
    });

    if (resolvedSubject) {
      if (!payload.sub && options.requireSubject) {
        throw new WebError({
          errorCode: 'verification_failed',
          statusCode: 403,
          message: 'Verification token missing subject'
        });
      }
      if (payload.sub && payload.sub !== resolvedSubject) {
        throw new WebError({
          errorCode: 'verification_failed',
          statusCode: 403,
          message: 'Verification subject mismatch',
          data: { expected: resolvedSubject, actual: payload.sub }
        });
      }
    }

    request.verification = payload;
    reportDebug({
      namespace,
      message: 'Verification token validated',
      data: { action: payload.act, subject: payload.sub }
    });

    next();
  };
}
