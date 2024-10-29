import { Request, Response, NextFunction } from 'express';
import { WebError } from 'entities/WebError';
import { reportError, reportDebug } from 'utils/report';

const namespace = 'engine:middleware:error';

/** Handle errors globally */
export function error(
  error: Error,
  request: Request,
  response: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  reportDebug({ namespace, message: 'Received error', data: { error } });
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
