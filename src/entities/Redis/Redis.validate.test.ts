import { expect } from 'chai';
import { validateRedisEnvironment } from './Redis.validate';
import { EngineError } from 'entities/EngineError';

describe('Entity - Redis.validate', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw when no host is specified (env nor options)', () => {
    expect(() => validateRedisEnvironment({} as any)).to.throw(EngineError);
  });

  it('should throw when no port is specified (env nor options)', () => {
    process.env.REDIS_HOST = 'localhost';
    expect(() => validateRedisEnvironment({} as any)).to.throw(EngineError);
  });

  it('should pass when host and port are provided via env', () => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    expect(() => validateRedisEnvironment({} as any)).to.not.throw();
  });

  it('should pass when host and port are provided via options', () => {
    expect(() => validateRedisEnvironment({ redis: { host: '127.0.0.1', port: 6380 } } as any)).to.not.throw();
  });
});
