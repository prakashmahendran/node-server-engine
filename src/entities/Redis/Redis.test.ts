import { expect } from 'chai';
import sinon from 'sinon';
import * as RedisModule from './Redis';
import * as RedisValidate from './Redis.validate';

describe('Entity - Redis', () => {
  let validateRedisEnvironmentStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    delete process.env.TLS_CA; // Remove TLS_CA to avoid real connections
    
    validateRedisEnvironmentStub = sinon.stub(RedisValidate, 'validateRedisEnvironment');
  });

  afterEach(async () => {
    await RedisModule.shutdown();
    process.env = originalEnv;
    sinon.restore();
  });

  describe('createRedisClient', () => {
    it('should create Redis client with environment variables', () => {
      const client = RedisModule.createRedisClient();
      
      expect(client).to.exist;
      expect(client.options.host).to.equal('localhost');
      expect(client.options.port).to.equal(6379);
      
      client.disconnect();
    });

    it('should throw error when REDIS_HOST is not defined', () => {
      delete process.env.REDIS_HOST;
      
      expect(() => RedisModule.createRedisClient()).to.throw('Host required');
    });

    it('should use default port 6379 when not specified', () => {
      delete process.env.REDIS_PORT;
      
      const client = RedisModule.createRedisClient();
      
      expect(client.options.port).to.equal(6379);
      client.disconnect();
    });

    it('should parse REDIS_PORT as integer', () => {
      process.env.REDIS_PORT = '9999';
      
      const client = RedisModule.createRedisClient();
      
      expect(client.options.port).to.equal(9999);
      client.disconnect();
    });

    it('should include username when provided', () => {
      process.env.REDIS_USERNAME = 'testuser';
      
      const client = RedisModule.createRedisClient();
      
      expect(client.options.username).to.equal('testuser');
      client.disconnect();
    });

    it('should include password when provided', () => {
      process.env.REDIS_PASSWORD = 'testpass';
      
      const client = RedisModule.createRedisClient();
      
      expect(client.options.password).to.equal('testpass');
      client.disconnect();
    });

    it('should call validateRedisEnvironment', () => {
      const client = RedisModule.createRedisClient();
      
      expect(validateRedisEnvironmentStub.calledOnce).to.be.true;
      client.disconnect();
    });

    it('should support custom db option', () => {
      const client = RedisModule.createRedisClient({ db: 2 });
      
      expect(client.options.db).to.equal(2);
      client.disconnect();
    });

    it('should use lazyConnect in test environment', () => {
      const client = RedisModule.createRedisClient();
      
      expect(client.options.lazyConnect).to.be.true;
      client.disconnect();
    });

    it('should add TLS configuration when TLS_CA is provided', () => {
      process.env.TLS_CA = '-----BEGIN CERTIFICATE-----';
      process.env.NODE_ENV = 'production';
      
      const client = RedisModule.createRedisClient();
      
      expect(client.options.tls).to.exist;
      client.disconnect();
    });
  });

  describe('init', () => {
    it('should create Redis client', () => {
      RedisModule.init();
      
      const client = RedisModule.getClient();
      expect(client).to.exist;
    });

    it('should not create multiple clients when called multiple times', () => {
      RedisModule.init();
      const firstClient = RedisModule.getClient();
      
      RedisModule.init();
      const secondClient = RedisModule.getClient();
      
      expect(secondClient).to.equal(firstClient);
    });
  });

  describe('shutdown', () => {
    it('should handle shutdown when not initialized', async () => {
      await expect(RedisModule.shutdown()).to.not.be.rejected;
    });

    it('should allow re-initialization after shutdown', async () => {
      RedisModule.init();
      await RedisModule.shutdown();
      
      RedisModule.init();
      const client = RedisModule.getClient();
      
      expect(client).to.exist;
    });
  });

  describe('getClient', () => {
    it('should return undefined when not initialized', () => {
      const client = RedisModule.getClient();
      
      expect(client).to.be.undefined;
    });

    it('should return Redis client after init', () => {
      RedisModule.init();
      
      const client = RedisModule.getClient();
      
      expect(client).to.exist;
    });

    it('should return undefined after shutdown', async () => {
      RedisModule.init();
      await RedisModule.shutdown();
      
      const client = RedisModule.getClient();
      
      expect(client).to.be.undefined;
    });
  });
});
