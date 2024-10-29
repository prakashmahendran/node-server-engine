import { RedisCreateOptions } from './Redis.types';
import { EngineError } from 'entities/EngineError';

/**
 * Verify that the environment variables to connect to a Redis server are properly set
 */
export function validateRedisEnvironment(options: RedisCreateOptions): void {
  const host = process.env.REDIS_HOST ?? options.redis?.host;
  if (typeof host !== 'string')
    throw new EngineError({ message: 'No host specified for Redis instance' });

  const port = process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT)
    : options.redis?.port;
  if (typeof port !== 'number')
    throw new EngineError({ message: 'No port specified for Redis instance' });
}
