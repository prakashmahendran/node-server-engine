import { Request, Response } from 'express';
import { reportDebug } from 'utils';

const namespace = 'engine:middleware:fourOhFour';

/** Unhandled path middleware */
export function fourOhFour(request: Request, response: Response): void {
  reportDebug({
    namespace,
    message: `No route found [${request.method} - ${request.path}]`
  });
  response.sendStatus(404);
}
