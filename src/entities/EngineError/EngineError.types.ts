import { LogSeverity } from 'const';

/** EngineError initialization options */
export interface EngineErrorOptions {
  /** Main logged message */
  message: string;
  /** Severity of the log entry */
  severity?: LogSeverity;
  /** If this error is wrapping another one, this will contain the original error */
  error?: Error;
  /** Additional contextual data for debugging */
  data?: unknown;
  /** Human readable error message sent to the client */
  hint?: unknown;
}
