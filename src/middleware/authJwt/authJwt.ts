import { Request, Response, NextFunction } from 'express';
import { TokenIssuer } from 'const';
import { EngineError } from 'entities/EngineError';
import { WebError } from 'entities/WebError';
import { jwtVerify } from 'utils/jwt';
import { reportDebug } from 'utils/report';
import {} from './authJwt.types';

const namespace = 'engine:middleware:authJwt';

/** Generate a middleware to authenticate the client connection with a JWT */
export function authJwt(): (
  request: Request,
  response: Response,
  next: NextFunction
) => Promise<void> {
  if (!process.env.ACCESS_TOKEN_AUDIENCE)
    throw new EngineError({
      message: 'Env variable ACCESS_TOKEN_AUDIENCE is not defined'
    });

  return async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    const [scheme, credentials] =
      request.headers?.authorization?.split(' ') ?? [];
    // No bearer token has been sent
    if (!credentials || scheme.toLowerCase() !== 'bearer') {
      throw new WebError({
        message: 'No bearer token found',
        errorCode: 'unauthorized',
        statusCode: 401,
        data: { authorization: request.headers?.authorization }
      });
    }
    reportDebug({
      namespace,
      message: 'Performing JWT authentication',
      data: { scheme, credentials }
    });
    // Verify token and extract its payload
    const payload = await jwtVerify(credentials, TokenIssuer.AUTH_SERVICE);
    reportDebug({
      namespace,
      message: 'Extracted user data from JWT',
      data: { payload, credentials }
    });
    // The user object on the request is hydrated with data from the token
    request.user = payload.user;

    next();
  };
}
