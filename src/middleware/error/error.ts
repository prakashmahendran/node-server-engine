import { Request, Response, NextFunction } from 'express';
import { WebError } from 'entities/WebError';
import { reportError } from 'utils/report';

/** Handle errors globally */
export function error(
  error: Error,
  request: Request,
  response: Response,
  _next: NextFunction
): void {
  reportError(error, request);
  if (error instanceof WebError) {
    if (error.retryAfterSec !== undefined)
      response.set(
        'Retry-After',
        String(Math.max(1, Math.round(error.retryAfterSec)))
      );
    response.status(error.statusCode).json({
      errorCode: error.errorCode,
      hint: error.hint,
      ...(error.details !== undefined ? { details: error.details } : {})
    });
    return;
  }
  response.status(500).json({ errorCode: 'server-error' });
}
