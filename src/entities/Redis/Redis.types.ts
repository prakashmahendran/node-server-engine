import { Redis as IoRedis, Cluster, RedisOptions } from 'ioredis';

export type RedisInterface = IoRedis &
  Cluster & {
    /** Start the redis service */
    init: () => void;
    /** Stop the redis service */
    shutdown: () => Promise<void>;
  };

/** Options to initialize a Redis client */
export interface RedisCreateOptions {
  /** Redis client settings */
  redis?: RedisOptions;
  /** Should the client perform readiness check when establishing the connection */
  enableReadyCheck?: boolean;
  /** Cluster mode read operation settings, can make reads on masters, slaves, or both */
  scaleReads?: string;
}
