import { Request, Response, NextFunction } from 'express';
import responseTime from 'response-time';
import {
  httpRequestCount,
  httpRequestDuration,
  httpInFlight,
  httpErrorCount,
  httpResponseSize
} from 'metrics';

const excludedPrefixes = ['/swagger', '/docs', '/api-docs', '/metrics', '/favicon.ico', '/.well-known'];

/** Composite middleware that tracks in-flight requests, errors, response size and timings */
export const requestMetrics = (request: Request, response: Response, next: NextFunction) => {
  const path = (request.route?.path ?? request.path) as string;

  // Skip operational/static routes
  for (const prefix of excludedPrefixes) {
    if (path.startsWith(prefix)) return next();
  }

  // Increment in-flight
  try {
    httpInFlight.inc();
  } catch {}

  // Ensure we decrement on finish/close (only once)
  let inflightDecremented = false;
  const cleanup = () => {
    if (inflightDecremented) return;
    inflightDecremented = true;
    try {
      httpInFlight.dec();
    } catch {}
  };

  response.once('finish', () => {
    // record errors
    const statusCode = response.statusCode ?? 0;
    const statusClass = statusCode ? `${statusCode.toString().substring(0, 1)}XX` : '';
    if (statusCode >= 400) {
      try {
        httpErrorCount.inc({ service: process.env.CHART, status: statusClass, method: request.method });
      } catch {}
    }

    // observe response size if content-length header available
    const lenHeader = response.getHeader('content-length');
    const len = lenHeader ? parseInt(String(lenHeader), 10) : NaN;
    if (!Number.isNaN(len)) {
      try {
        httpResponseSize.observe({ service: process.env.CHART, path, method: request.method, status: statusClass }, len);
      } catch {}
    }

    cleanup();
  });

  response.once('close', cleanup);

  // Use response-time to record duration and request counts
  const rt = responseTime((req: Request, res: Response, time: number) => {
    const labels = {
      path,
      method: request.method,
      status: res.statusCode ? `${res.statusCode.toString().substring(0, 1)}XX` : '',
      service: process.env.CHART || 'unknown'
    };

    try {
      httpRequestCount.inc(labels);
      httpRequestDuration.observe(labels, time / 1000);
    } catch {}
  });

  // Call the response-time middleware which will call next when done
  rt(request as Request, response as Response, next as NextFunction);
};
