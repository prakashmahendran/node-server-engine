import { Request, Response } from 'express';
import responseTime from 'response-time';
import { httpRequestCount, httpRequestDuration } from 'metrics';

/** Middleware that gets metrics on each request */
export const requestMetrics = responseTime(
  (request: Request, response: Response, time: number) => {
    const labels = {
      path: (request.route?.path ?? request.path) as string,
      method: request.method,
      status: response.statusCode
        ? `${response.statusCode.toString().substring(0, 1)}XX`
        : '',
      service: process.env.CHART
    };

    httpRequestCount.inc(labels);
    httpRequestDuration.observe(labels, time / 1000);
  }
);
