import { WebErrorOptions } from './WebError.types';
import { LogSeverity } from 'const';
import { EngineError } from 'entities/EngineError';

/**
 * Error class used when errors should be reported to the client
 */
export class WebError extends EngineError {
  /** Machine readable error code that will be sent to the client */
  public errorCode: string;
  /** HTTP status code associated with this error */
  public statusCode: number;
  /** Public structured data sent to the client as `details` */
  public details?: unknown;
  /** Seconds before the client may retry (Retry-After header) */
  public retryAfterSec?: number;

  /**
   * Create a WebError, these errors are best suited for runtime errors
   */
  public constructor(config: WebErrorOptions) {
    super({ ...config, severity: config.severity ?? LogSeverity.WARNING });

    this.statusCode = config.statusCode ?? 400;
    this.errorCode = config.errorCode;
    if (config.details !== undefined) this.details = config.details;
    if (config.retryAfterSec !== undefined)
      this.retryAfterSec = config.retryAfterSec;
  }
}
