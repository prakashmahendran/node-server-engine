import { EngineErrorOptions } from 'entities/EngineError';

/** Options to create a Web Error */
export interface WebErrorOptions extends EngineErrorOptions {
  /** Machine readable error code that will be sent to the client */
  errorCode: string;
  /** HTTP status code associated with this error (default: 400) */
  statusCode?: number;
}
