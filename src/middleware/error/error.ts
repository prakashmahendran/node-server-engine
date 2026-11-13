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
  // A body the JSON parser refused is the client's mistake, not a server error
  const bodyError = (error as { type?: string }).type;
  if (bodyError === 'entity.parse.failed') {
    response.status(400).json({
      errorCode: 'invalid-json',
      hint: 'The request body is not valid JSON'
    });
    return;
  }
  if (bodyError === 'entity.too.large') {
    response.status(413).json({
      errorCode: 'request-too-large',
      hint: 'The request body is too large'
    });
    return;
  }
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
