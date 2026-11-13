import { Request } from 'express';

/** Options of the rate limit middleware */
export interface RateLimitOptions {
  /** Length of the window, in milliseconds */
  windowMs: number;
  /** Requests allowed per key and window */
  max: number;
  /**
   * What is counted: 'ip' (default, the client address; set TRUST_PROXY behind a load balancer), 'token'
   * (the Authorization header, for authenticated clients behind one address) or a function of the request
   */
  key?: 'ip' | 'token' | ((request: Request) => string);
}
