import { randomUUID } from 'crypto';
import { RequestHandler } from 'express';

/**
 * Give every request an id (req.id), sent back as the X-Request-Id header, so a client report, the logs and
 * the data written by the request (e.g. an audit trail) can be matched.
 */
export function requestId(): RequestHandler {
  return (request, response, next) => {
    const id = randomUUID();
    (request as typeof request & { id?: string }).id = id;
    response.set('X-Request-Id', id);
    next();
  };
}
