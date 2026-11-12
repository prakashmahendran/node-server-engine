import { EngineErrorOptions } from 'entities/EngineError';

/** Options to create a Web Error */
export interface WebErrorOptions extends EngineErrorOptions {
  /** Machine readable error code that will be sent to the client */
  errorCode: string;
  /** HTTP status code associated with this error (default: 400) */
  statusCode?: number;
  /**
   * Structured data the client acts on (e.g. attempts left, per-field errors), sent in the response body as
   * `details`. Unlike `data`, which is only logged, this is public: never put secrets or internals here.
   */
  details?: unknown;
  /** Seconds the client should wait before retrying, sent as the Retry-After header (429, 503) */
  retryAfterSec?: number;
}
