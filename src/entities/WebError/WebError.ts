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

  /**
   * Create a WebError, these errors are best suited for runtime errors
   */
  public constructor(config: WebErrorOptions) {
    super({ ...config, severity: config.severity ?? LogSeverity.WARNING });

    this.statusCode = config.statusCode ?? 400;
    this.errorCode = config.errorCode;
  }
}
