import { json, urlencoded, ErrorRequestHandler, RequestHandler } from 'express';
import {
  metrics,
  error,
  fourOhFour,
  healthCheck,
  version,
  swaggerDocs,
  requestLogger,
  requestMetrics
} from 'middleware';

// Default middleware that are applied first thing on the primary port, before the business logic endpoints
export const defaultMiddleware: Array<RequestHandler> = [
  healthCheck(),
  json({ limit: process.env.REQUEST_SIZE_LIMIT ?? '1mb' }),
  urlencoded({
    extended: true,
    limit: process.env.REQUEST_SIZE_LIMIT ?? '1mb'
  }),
  requestMetrics,
  metrics(),
  version()
].filter((val) => val);

// Error handling middleware that are run after the main business logic endpoints
export const defaultErrorMiddleware: Array<
  RequestHandler | ErrorRequestHandler
> = [error, fourOhFour];

// Middleware that are served on the secondary port
export const secondaryMiddleware: Array<RequestHandler> = [
  requestMetrics,
  metrics(),
  version(),
  swaggerDocs()
];

// Add request logging to middleware chain when reporting is not silenced
if (!process.env.SILENCE_REPORT) {
  defaultMiddleware.unshift(requestLogger());
  secondaryMiddleware.unshift(requestLogger());
}

export const shutdownSignals = ['SIGTERM', 'SIGUSR2', 'SIGINT'];
