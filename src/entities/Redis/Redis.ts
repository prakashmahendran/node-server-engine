import { Redis as RedisClient } from 'ioredis';
import { RedisInterface, RedisCreateOptions } from './Redis.types';
import { validateRedisEnvironment } from './Redis.validate';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';

export let redisClient: undefined | RedisClient;

/**
 * We use a proxy to extend the Redis behavior and allow initialization of the client only when needed while keeping the same interface
 */
export const Redis = new Proxy<RedisInterface>(
  // Due to how we do the proxying, we are forced to ignore ts-errors, we could never create an object that respects the interface properly
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {},
  {
    get: function (target, property): unknown {
      if (property === 'init') return init;
      if (property === 'shutdown') return shutdown;
      // Create the redis client if it does not exist
      if (!redisClient)
        throw new EngineError({ message: 'Redis client was not initialized' });
      // Call the function on the redis client
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return redisClient[property] as unknown;
    }
  }
);

/**
 * On init create client anc connect
 */
export function init(): void {
  // Ignore if already initialized
  if (redisClient) return;
  redisClient = createRedisClient();
  LifecycleController.register(Redis);
}

/**
 * On shutdown close connection and clear client
 */
export async function shutdown(): Promise<void> {
  if (redisClient) await redisClient.quit();
  redisClient = undefined;
}

/**
 * Create Redis client
 */
export function createRedisClient(
  options: RedisCreateOptions = {}
): RedisClient {
  // Check that environment variables are correctly set
  validateRedisEnvironment(options);
  // Throw an error if there is no host initial
  if (!process.env.REDIS_HOST)
    throw new EngineError({
      message: 'Host required to initialize Redis connection'
    });

  return new RedisClient({
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: 0
  });
}
