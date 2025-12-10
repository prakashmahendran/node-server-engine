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
    response.status(error.statusCode).json({
      errorCode: error.errorCode,
      hint: error.hint
    });
    return;
  }
  response.status(500).json({ errorCode: 'server-error' });
}
