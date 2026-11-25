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

// Default middleware that are applied first thing on the primary port, before the business logic endpoints.
// Request metrics are not among them: each Endpoint records its own, labelled with its route pattern
// (/users/:id). Recording here as well counted every request twice, and labelled it with the raw path, so ids
// and any URL a client invents became series of their own.
export const defaultMiddleware: Array<RequestHandler> = [
  healthCheck(),
  json({ limit: process.env.REQUEST_SIZE_LIMIT ?? '1mb' }),
  urlencoded({
    extended: true,
    limit: process.env.REQUEST_SIZE_LIMIT ?? '1mb'
  })
].filter((val) => val);

// Metrics and version on the primary port as well as the secondary one, unless the server is created with
// primaryPortOperationalRoutes: false (for a primary port that is open to the internet)
export const primaryOperationalMiddleware: Array<RequestHandler> = [
  metrics(),
  version()
];

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
