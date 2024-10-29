import { json, urlencoded, ErrorRequestHandler, RequestHandler } from 'express';
import morgan from 'morgan';
import {
  metrics,
  error,
  fourOhFour,
  healthCheck,
  version,
  swaggerDocs
} from 'middleware';

const ACCESS_LOG = JSON.stringify({
  method: ':method',
  status: ':status',
  url: ':url',
  'http-version': ':http-version',
  ip: ':remote-addr',
  'user-agent': ':user-agent',
  'content-length': ':res[content-length]',
  referrer: ':referrer',
  'response-time': ':response-time',
  severity: 'DEBUG',
  message: ':method :url [:status]'
});

// Default middleware that are applied first thing on the primary port, before the business logic endpoints
export const defaultMiddleware: Array<RequestHandler> = [
  healthCheck(),
  json({ limit: process.env.REQUEST_SIZE_LIMIT ?? '1mb' }),
  urlencoded({
    extended: true,
    limit: process.env.REQUEST_SIZE_LIMIT ?? '1mb'
  }),
  metrics(),
  version()
].filter((val) => val);

// Error handling middleware that are run after the main business logic endpoints
export const defaultErrorMiddleware: Array<
  RequestHandler | ErrorRequestHandler
> = [error, fourOhFour];

// Middleware that are served on the secondary port
export const secondaryMiddleware: Array<RequestHandler> = [
  metrics(),
  version(),
  swaggerDocs()
];

// Add morgan logging to default middleware chain when reporting is not silenced
if (!process.env.SILENCE_REPORT) {
  defaultMiddleware.unshift(morgan(ACCESS_LOG));
  secondaryMiddleware.unshift(morgan(ACCESS_LOG));
}

export const shutdownSignals = ['SIGTERM', 'SIGUSR2', 'SIGINT'];
