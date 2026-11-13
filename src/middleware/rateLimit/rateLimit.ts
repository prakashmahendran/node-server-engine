import { createHash } from 'crypto';
import { RequestHandler } from 'express';
import expressRateLimit from 'express-rate-limit';
import { RateLimitOptions } from './rateLimit.types';

/**
 * Limit how often a client may call the endpoints it is attached to. Over the limit the request is answered
 * 429 with the engine's error body ({ errorCode: 'rate-limited', hint }) and a Retry-After header.
 * Counters are kept in memory, per process.
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const { key = 'ip' } = options;
  return expressRateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // 'ip' keeps express-rate-limit's own key, which groups IPv6 addresses by subnet
    ...(key === 'ip'
      ? {}
      : {
          keyGenerator:
            key === 'token'
              ? (request): string =>
                  createHash('sha256')
                    .update(request.headers.authorization ?? request.ip ?? '')
                    .digest('hex')
              : key
        }),
    message: {
      errorCode: 'rate-limited',
      hint: 'Too many requests. Slow down and try again.'
    }
  });
}
