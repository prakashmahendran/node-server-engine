import { Request, Response, NextFunction } from 'express';
import { WebError } from 'entities/WebError';
import { assertEnvironment, envAssert, reportDebug } from 'utils';

const namespace = 'engine:middleware:authStatic';

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
        data: { authorization: req.headers?.authorization }
      });
    }
    reportDebug({
      namespace,
      message: 'Performing Static authentication',
      data: { scheme, credentials }
    });
    // Verify token
    if (credentials !== process.env.STATIC_TOKEN) {
      throw new WebError({
        statusCode: 401,
        errorCode: 'unauthorized',
        message: 'Invalid token supplied',
        data: { credentials }
      });
    }
    next();
  };
}
