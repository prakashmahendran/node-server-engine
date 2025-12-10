import { Redis as RedisClient, RedisOptions } from 'ioredis';
import { RedisInterface, RedisCreateOptions } from './Redis.types';
import { validateRedisEnvironment } from './Redis.validate';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { reportDebug, reportError } from 'utils/report';

export let redisClient: undefined | RedisClient;

/**
 * Factory function to create a new Redis instance (exported for testing)
 */
export function createRedisInstance(config: RedisOptions): RedisClient {
  return new RedisClient(config);
}

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
      if (property === 'getClient') return getClient;
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
 * Get the underlying Redis client (for advanced use cases)
 */
export function getClient(): RedisClient | undefined {
  return redisClient;
}

/**
 * On init create client and connect
 */
export function init(): void {
  // Ignore if already initialized
  if (redisClient) {
    reportDebug({
      namespace: 'engine:redis',
      message: 'Redis client already initialized'
    });
    return;
  }
  
  redisClient = createRedisClient();
  
  // Setup event listeners
  redisClient.on('connect', () => {
    reportDebug({
      namespace: 'engine:redis',
      message: 'Redis client connecting'
    });
  });
  
  redisClient.on('ready', () => {
    reportDebug({
      namespace: 'engine:redis',
      message: 'Redis client ready'
    });
  });
  
  redisClient.on('error', (err) => {
    reportError(new EngineError({
      message: 'Redis client error',
      data: { error: err.message }
    }));
  });
  
  redisClient.on('close', () => {
    reportDebug({
      namespace: 'engine:redis',
      message: 'Redis connection closed'
    });
  });
  
  redisClient.on('reconnecting', () => {
    reportDebug({
      namespace: 'engine:redis',
      message: 'Redis client reconnecting'
    });
  });
  
  LifecycleController.register(Redis);
}

/**
 * On shutdown close connection and clear client
 */
export async function shutdown(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      reportDebug({
        namespace: 'engine:redis',
        message: 'Redis client disconnected'
      });
    } catch (error) {
      reportError(new EngineError({
        message: 'Error during Redis shutdown',
        data: { error: (error as Error).message }
      }));
    }
  }
  redisClient = undefined;
}

/**
 * Create Redis client with enhanced configuration
 */
export function createRedisClient(
  options: RedisCreateOptions = {}
): RedisClient {
  // Check that environment variables are correctly set
  validateRedisEnvironment(options);
  
  // Throw an error if there is no host
  if (!process.env.REDIS_HOST)
    throw new EngineError({
      message: 'Host required to initialize Redis connection'
    });

  const config: RedisOptions = {
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    db: options.db ?? 0,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some(targetError => err.message.includes(targetError));
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: options.enableReadyCheck ?? true,
    lazyConnect: options.lazyConnect ?? (process.env.NODE_ENV === 'test'),
    ...options.redis
  };

  // Add TLS configuration if TLS_CA is provided
  if (process.env.TLS_CA) {
    config.tls = {
      ca: process.env.TLS_CA,
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    };
  }

  return createRedisInstance(config);
}
