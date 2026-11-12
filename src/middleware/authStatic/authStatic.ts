import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { WebError } from 'entities/WebError';
import { assertEnvironment, envAssert, reportDebug } from 'utils';

const namespace = 'engine:middleware:authStatic';

/** Constant time string comparison to avoid leaking the token through timing */
function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/**
 * Generate a middleware to authenticate the client connection with a static token
 * @return {Function}
 */
export function authStatic(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  assertEnvironment({ STATIC_TOKEN: envAssert.isString() });

  return (req: Request, res: Response, next: NextFunction): void => {
    const [scheme, credentials] = req.headers?.authorization?.split(' ') ?? [];
    // No bearer token has been sent
    if (!credentials || scheme.toLowerCase() !== 'bearer') {
      throw new WebError({
        statusCode: 401,
        errorCode: 'unauthorized',
        message: 'No bearer token found',
        data: { scheme }
      });
    }
    reportDebug({
      namespace,
      message: 'Performing Static authentication',
      data: { scheme }
    });
    // Verify token
    if (!safeCompare(credentials, process.env.STATIC_TOKEN as string)) {
      throw new WebError({
        statusCode: 401,
        errorCode: 'unauthorized',
        message: 'Invalid token supplied'
      });
    }
    next();
  };
}
