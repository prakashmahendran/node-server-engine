import { EngineErrorOptions } from './EngineError.types';
import { LogSeverity } from 'const';

/**
 * Base error type for engine related errors
 */
export class EngineError extends Error {
  /** Severity of the log entry */
  public severity: LogSeverity;
  /** If this error is wrapping another one, this will contain the original error */
  public error?: Error;
  /** Additional contextual data for debugging */
  public data?: unknown;
  /** Human readable error message sent to the client */
  public hint?: unknown;

  /** Create an EngineError, these errors represent errors in the engine itself */
  public constructor(config: EngineErrorOptions | string) {
    const options: EngineErrorOptions =
      typeof config === 'string' ? { message: config } : config;
    super(options.message);

    this.severity = options.severity ?? LogSeverity.CRITICAL;
    this.data = options.data;
    this.error = options.error;
    this.hint = options.hint;
  }
}
