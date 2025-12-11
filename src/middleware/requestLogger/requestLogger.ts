import { Request, Response, NextFunction, RequestHandler } from 'express';
import { LogSeverity } from 'const';
import { output } from 'utils/report/output';

/**
 * Custom request logger middleware that formats HTTP requests consistently
 * with the rest of the application logging
 */
export function requestLogger(): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Log response when finished
    response.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = response.statusCode;
      const showDetailedLogs = process.env.DETAILED_LOGS === 'true';

      // Determine severity based on status code
      let severity = LogSeverity.DEBUG;
      if (statusCode >= 500) {
        severity = LogSeverity.ERROR;
      } else if (statusCode >= 400) {
        severity = LogSeverity.WARNING;
      }

      // Build the log message
      const message = `${request.method} ${request.originalUrl || request.url} [${statusCode}] ${responseTime}ms`;

      // Build log entry
      const logEntry: Parameters<typeof output>[0] = {
        severity,
        message
      };

      // Add detailed info only if DETAILED_LOGS is enabled
      if (showDetailedLogs) {
        logEntry.context = {
          httpRequest: {
            method: request.method,
            url: request.originalUrl || request.url,
            userAgent: request.header('User-Agent'),
            remoteIp: request.ip,
            referrer: request.header('Referer'),
            responseStatusCode: statusCode
          }
        };
        logEntry.data = {
          responseTime: `${responseTime}ms`,
          contentLength: response.getHeader('content-length') || '-',
          httpVersion: `${request.httpVersionMajor}.${request.httpVersionMinor}`
        };
      }

      output(logEntry);
    });

    next();
  };
}
