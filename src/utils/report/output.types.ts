import { LogSeverity } from 'const';

/** Structure of the request reporting in log entries */
interface LogEntryRequest {
  /** Requested URL */
  url: string;
  /** HTTP method used */
  method: string;
  /** Referer website */
  referrer?: string;
  /** User-Agent of the connected client */
  userAgent?: string;
  /** IP address of the client */
  remoteIp: string | undefined;
  /** HTTP status code returned to the client */
  responseStatusCode?: number;
}

/** Structure of the context entry in log entries */
interface LogEntryContext {
  /** User that made a request */
  user?: string;
  /** Info on the processed HTTP request */
  httpRequest?: LogEntryRequest;
}

/** Structure of a log entry */
export interface LogEntry {
  /** Severity level at which the entry should be logged */
  severity: LogSeverity;
  /** Type of error */
  errorType?: string;
  /** Human readable error message that will be logged */
  message: string;
  /** Stack-trace of the error */

  stack_trace?: string;
  /** Additional data that accompanies the error in the logs */
  data?: unknown;
  /** Machine readable error code that is returned to the client */
  errorCode?: string;
  /** HTTP status code that is returned to the client */
  statusCode?: number;
  /** GCP error type */
  '@type'?: string;
  /** Error context */
  context?: LogEntryContext;
}

/** Stricture of a log entry context entry */
interface LogEntryServiceContext {
  /** Name of the service in which the error ocurred */
  service?: string;
  /** Version of the service in which the error ocurred */
  version?: string;
  /** Environment in which the error ocurred (dev/staging/prod) */
  environment?: string;
  /** ID of the instance that got the error */
  instance?: string;
}

/** Complete log entry with call-stack */
export interface FullLogEntry extends LogEntry {
  /** Line at which the error was thrown */
  lineNumber: number;
  /** Name of the file in which the error was thrown */
  fileName: string;
  /** Context of the error */
  serviceContext: LogEntryServiceContext;
}
