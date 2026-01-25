import { Redis as RedisClient, RedisOptions } from 'ioredis';
import { RedisCreateOptions } from './Redis.types';
import { validateRedisEnvironment } from './Redis.validate';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { reportDebug, reportError } from 'utils/report';

const namespace = 'engine:redis';

/**
 * Generic Redis wrapper for caching and data storage
 * Provides methods for initialization, connection management, and cleanup
 * 
 * @example
 * ```typescript
 * // Initialize Redis connection
 * Redis.init();
 * 
 * // Use Redis client
 * await Redis.set('key', 'value');
 * const value = await Redis.get('key');
 * 
 * // Get underlying client for advanced operations
 * const client = Redis.getClient();
 * ```
 */
export const Redis = {
  /** Redis client instance */
  client: undefined as RedisClient | undefined,

  /**
   * Initialize Redis connection
   * @param options - Redis configuration options
   */
  init(options: RedisCreateOptions = {}): void {
    // Ignore if already initialized
    if (this.client) {
      reportDebug({
        namespace,
        message: 'Redis client already initialized'
      });
      return;
    }
    
    this.client = this.createRedisClient(options);
    
    // Setup event listeners
    this.client.on('connect', () => {
      reportDebug({
        namespace,
        message: 'Redis client connecting'
      });
    });
    
    this.client.on('ready', () => {
      reportDebug({
        namespace,
        message: 'Redis client ready'
      });
    });
    
    this.client.on('error', (err) => {
      reportError(new EngineError({
        message: 'Redis client error',
        data: { error: err.message }
      }));
    });
    
    this.client.on('close', () => {
      reportDebug({
        namespace,
        message: 'Redis connection closed'
      });
    });
    
    this.client.on('reconnecting', () => {
      reportDebug({
        namespace,
        message: 'Redis client reconnecting'
      });
    });
    
    LifecycleController.register({ shutdown: () => this.shutdown() });
  },

  /**
   * Shutdown Redis connection and cleanup
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        reportDebug({
          namespace,
          message: 'Redis client disconnected'
        });
      } catch (error) {
        reportError(new EngineError({
          message: 'Error during Redis shutdown',
          data: { error: (error as Error).message }
        }));
      }
    }
    this.client = undefined;
  },

  /**
   * Get the underlying Redis client
   * @returns Redis client instance or undefined
   */
  getClient(): RedisClient | undefined {
    return this.client;
  },

  /**
   * Create Redis client with configuration
   * @param options - Redis creation options
   * @returns Redis client instance
   * @private
   */
  createRedisClient(options: RedisCreateOptions = {}): RedisClient {
    // Check that environment variables are correctly set
    validateRedisEnvironment(options);
    
    // Throw an error if there is no host
    if (!process.env.REDIS_HOST) {
      throw new EngineError({
        message: 'Host required to initialize Redis connection'
      });
    }

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

    return new RedisClient(config);
  },

  // Proxy common Redis methods to the client
  async get(key: string): Promise<string | null> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.get(key);
  },

  async set(key: string, value: string | number | Buffer, ...args: any[]): Promise<'OK' | null> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.set(key, value, ...args);
  },

  async del(...keys: string[]): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.del(...keys);
  },

  async exists(...keys: string[]): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.exists(...keys);
  },

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.ttl(key);
  },

  async incr(key: string): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.incr(key);
  },

  async decr(key: string): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.decr(key);
  },

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.hget(key, field);
  },

  async hset(key: string, field: string, value: string | number | Buffer): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.hset(key, field, value);
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.hgetall(key);
  },

  async lpush(key: string, ...values: (string | Buffer | number)[]): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.lpush(key, ...values);
  },

  async rpush(key: string, ...values: (string | Buffer | number)[]): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.rpush(key, ...values);
  },

  async lpop(key: string, count?: number): Promise<string | string[] | null> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    if (count !== undefined) {
      return this.client.lpop(key, count);
    }
    return this.client.lpop(key);
  },

  async rpop(key: string, count?: number): Promise<string | string[] | null> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    if (count !== undefined) {
      return this.client.rpop(key, count);
    }
    return this.client.rpop(key);
  },

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.lrange(key, start, stop);
  },

  async sadd(key: string, ...members: (string | Buffer | number)[]): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.sadd(key, ...members);
  },

  async smembers(key: string): Promise<string[]> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.smembers(key);
  },

  async sismember(key: string, member: string | Buffer | number): Promise<number> {
    if (!this.client) throw new EngineError({ message: 'Redis client was not initialized' });
    return this.client.sismember(key, member);
  }
};

// Export backward compatibility functions
export const createRedisClient = Redis.createRedisClient.bind(Redis);
export const getClient = Redis.getClient.bind(Redis);
export const init = Redis.init.bind(Redis);
export const shutdown = Redis.shutdown.bind(Redis);

// For tests that need direct access to the client
export let redisClient: RedisClient | undefined;
Object.defineProperty(Redis, 'client', {
  get: () => redisClient,
  set: (value) => { redisClient = value; }
});
