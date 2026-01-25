import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { SecretManager } from './SecretManager';
import { SecretManagerOptions } from './SecretManager.types';
import * as LifecycleController from 'entities/LifecycleController';

describe('SecretManager', function () {
  let sandbox: sinon.SinonSandbox;
  let mockClient: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    originalEnv = { ...process.env };
    
    // Reset SecretManager state
    SecretManager.client = undefined;
    SecretManager.options = undefined;
    SecretManager.secretCache.clear();
    SecretManager.tempFiles.length = 0;

    // Mock SecretManagerServiceClient
    mockClient = {
      accessSecretVersion: sandbox.stub(),
      close: sandbox.stub().resolves()
    };
  });

  afterEach(function () {
    sandbox.restore();
    process.env = originalEnv;
  });

  describe('init', function () {
    it('should skip initialization when disabled', async function () {
      const result = await SecretManager.init({
        enabled: false
      });

      expect(result.loaded).to.equal(0);
      expect(result.failed).to.equal(0);
      expect(result.fallback).to.equal(0);
      expect(SecretManager.client).to.be.undefined;
    });

    it('should skip initialization when NODE_ENV is not production by default', async function () {
      process.env.NODE_ENV = 'development';
      
      const result = await SecretManager.init({
        projectId: 'test-project'
      });

      expect(result.loaded).to.equal(0);
      expect(SecretManager.client).to.be.undefined;
    });

    it('should throw error when projectId is missing in production', async function () {
      process.env.NODE_ENV = 'production';
      
      try {
        await SecretManager.init({
          enabled: true
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('GCP_PROJECT_ID is required');
      }
    });

    it('should initialize with projectId from environment', async function () {
      process.env.GCP_PROJECT_ID = 'env-project';
      
      // Mock the client creation
      const SecretManagerServiceClient = require('@google-cloud/secret-manager').SecretManagerServiceClient;
      sandbox.stub(SecretManagerServiceClient.prototype, 'constructor' as any);
      
      sandbox.stub(SecretManager, 'loadSecrets' as any).resolves({
        loaded: 0,
        failed: 0,
        fallback: 0,
        details: []
      });

      const result = await SecretManager.init({
        enabled: true
      });

      expect(SecretManager.options?.projectId).to.equal('env-project');
      expect(result.loaded).to.equal(0);
    });

    it.skip('should register shutdown with LifecycleController', async function () {
      // Skipping as LifecycleController.register is not exported for stubbing
      // This is tested implicitly through integration tests
    });
  });

  describe('loadSecrets', function () {
    beforeEach(function () {
      SecretManager.client = mockClient;
      SecretManager.options = {
        enabled: true,
        projectId: 'test-project',
        cache: true,
        fallbackToEnv: true
      };
    });

    it('should return empty result when no secrets configured', async function () {
      const result = await SecretManager.loadSecrets({ secrets: [] });

      expect(result.loaded).to.equal(0);
      expect(result.failed).to.equal(0);
      expect(result.details).to.be.empty;
    });

    it('should load env type secrets successfully', async function () {
      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('secret-value')
        }
      }]);

      const result = await SecretManager.loadSecrets({
        projectId: 'test-project',
        cache: true,
        secrets: ['TEST_SECRET']
      });

      expect(result.loaded).to.equal(1);
      expect(result.failed).to.equal(0);
      expect(process.env.TEST_SECRET).to.equal('secret-value');
    });

    it('should cache secrets when caching is enabled', async function () {
      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('cached-value')
        }
      }]);

      await SecretManager.loadSecrets({
        projectId: 'test-project',
        cache: true,
        secrets: ['CACHED_SECRET']
      });

      expect(SecretManager.secretCache.has('CACHED_SECRET')).to.be.true;
      const cached = SecretManager.secretCache.get('CACHED_SECRET');
      expect(cached?.value).to.equal('cached-value');
    });

    it('should use fallback when secret loading fails', async function () {
      process.env.FALLBACK_SECRET = 'fallback-value';
      
      mockClient.accessSecretVersion.rejects(new Error('Not found'));

      const result = await SecretManager.loadSecrets({
        projectId: 'test-project',
        fallbackToEnv: true,
        secrets: ['FALLBACK_SECRET']
      });

      expect(result.fallback).to.equal(1);
      expect(result.failed).to.equal(0);
    });

    it('should fail when secret not found and no fallback', async function () {
      mockClient.accessSecretVersion.rejects(new Error('Not found'));

      const result = await SecretManager.loadSecrets({
        projectId: 'test-project',
        fallbackToEnv: false,
        secrets: ['MISSING_SECRET']
      });

      expect(result.failed).to.equal(1);
      expect(result.loaded).to.equal(0);
    });
  });

  describe('loadSecret', function () {
    beforeEach(function () {
      SecretManager.client = mockClient;
    });

    it('should load file-based secret and write to temp file', async function () {
      const writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('file-content')
        }
      }]);

      const result = await SecretManager.loadSecret(
        {
          name: 'CERT_FILE',
          type: 'file',
          targetEnvVar: 'CERT_PATH',
          filename: 'cert.pem'
        },
        {
          projectId: 'test-project',
          tempDir: '/tmp'
        }
      );

      expect(result).to.not.be.null;
      expect(result?.filePath).to.equal('/tmp/cert.pem');
      expect(process.env.CERT_PATH).to.equal('/tmp/cert.pem');
      expect(writeFileStub.calledOnce).to.be.true;
      expect(SecretManager.tempFiles).to.include('/tmp/cert.pem');
    });

    it('should write file with specified mode', async function () {
      const writeFileStub = sandbox.stub(fs, 'writeFile').resolves();
      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('secure-content')
        }
      }]);

      await SecretManager.loadSecret(
        {
          name: 'PRIVATE_KEY',
          type: 'file',
          mode: 0o600
        },
        {
          projectId: 'test-project',
          tempDir: '/tmp'
        }
      );

      expect(writeFileStub.firstCall.args[2]).to.deep.equal({ mode: 0o600 });
    });

    it('should set targetEnvVar for env type secrets', async function () {
      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('custom-value')
        }
      }]);

      await SecretManager.loadSecret(
        {
          name: 'SOURCE_SECRET',
          type: 'env',
          targetEnvVar: 'TARGET_VAR'
        },
        {
          projectId: 'test-project'
        }
      );

      expect(process.env.TARGET_VAR).to.equal('custom-value');
    });

    it('should throw error when client not initialized', async function () {
      SecretManager.client = undefined;

      try {
        await SecretManager.loadSecret(
          { name: 'TEST', type: 'env' },
          { projectId: 'test-project' }
        );
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('not initialized');
      }
    });

    it('should handle secret with no data', async function () {
      mockClient.accessSecretVersion.resolves([{
        payload: {}
      }]);

      try {
        await SecretManager.loadSecret(
          { name: 'EMPTY_SECRET', type: 'env' },
          { projectId: 'test-project' }
        );
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('has no data');
      }
    });
  });

  describe('normalizeSecretConfig', function () {
    it('should convert string to env type config', function () {
      const result = SecretManager.normalizeSecretConfig('SIMPLE_SECRET');

      expect(result).to.deep.equal({
        name: 'SIMPLE_SECRET',
        type: 'env'
      });
    });

    it('should pass through object config unchanged', function () {
      const config = {
        name: 'FILE_SECRET',
        type: 'file' as const,
        filename: 'key.pem'
      };

      const result = SecretManager.normalizeSecretConfig(config);

      expect(result).to.deep.equal(config);
    });
  });

  describe('getSecret', function () {
    it('should return cached secret value', function () {
      SecretManager.secretCache.set('CACHED_KEY', {
        name: 'CACHED_KEY',
        value: 'cached-value',
        config: { name: 'CACHED_KEY', type: 'env' }
      });

      const value = SecretManager.getSecret('CACHED_KEY');

      expect(value).to.equal('cached-value');
    });

    it('should fall back to environment variable', function () {
      process.env.ENV_KEY = 'env-value';

      const value = SecretManager.getSecret('ENV_KEY');

      expect(value).to.equal('env-value');
    });

    it('should return undefined when not found', function () {
      const value = SecretManager.getSecret('NONEXISTENT');

      expect(value).to.be.undefined;
    });
  });

  describe('fetchSecret', function () {
    beforeEach(function () {
      SecretManager.client = mockClient;
      SecretManager.options = {
        enabled: true,
        projectId: 'test-project'
      };
    });

    it('should fetch secret on-demand', async function () {
      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('fresh-value')
        }
      }]);

      const value = await SecretManager.fetchSecret('RUNTIME_SECRET');

      expect(value).to.equal('fresh-value');
    });

    it('should fetch specific version', async function () {
      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('v2-value')
        }
      }]);

      const value = await SecretManager.fetchSecret('VERSIONED_SECRET', '2');

      expect(value).to.equal('v2-value');
      expect(mockClient.accessSecretVersion.firstCall.args[0].name).to.include('/versions/2');
    });

    it('should throw error when not initialized', async function () {
      SecretManager.client = undefined;

      try {
        await SecretManager.fetchSecret('TEST');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('not initialized');
      }
    });
  });

  describe('reload', function () {
    beforeEach(function () {
      SecretManager.client = mockClient;
      SecretManager.options = {
        enabled: true,
        projectId: 'test-project',
        secrets: ['TEST_SECRET']
      };
    });

    it('should clear cache and reload secrets', async function () {
      SecretManager.secretCache.set('OLD_SECRET', {
        name: 'OLD_SECRET',
        value: 'old-value',
        config: { name: 'OLD_SECRET', type: 'env' }
      });

      mockClient.accessSecretVersion.resolves([{
        payload: {
          data: Buffer.from('new-value')
        }
      }]);

      const result = await SecretManager.reload();

      expect(SecretManager.secretCache.has('OLD_SECRET')).to.be.false;
      expect(result.loaded).to.equal(1);
    });

    it('should throw error when not initialized', async function () {
      SecretManager.options = undefined;

      try {
        await SecretManager.reload();
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('not initialized');
      }
    });
  });

  describe('shutdown', function () {
    beforeEach(function () {
      SecretManager.client = mockClient;
      SecretManager.options = {
        enabled: true,
        projectId: 'test-project'
      };
    });

    it('should delete temporary files', async function () {
      const unlinkStub = sandbox.stub(fs, 'unlink').resolves();
      SecretManager.tempFiles.push('/tmp/file1.pem', '/tmp/file2.pem');

      await SecretManager.shutdown();

      expect(unlinkStub.callCount).to.equal(2);
      expect(SecretManager.tempFiles).to.be.empty;
    });

    it('should continue on file deletion errors', async function () {
      sandbox.stub(fs, 'unlink').rejects(new Error('Permission denied'));
      SecretManager.tempFiles.push('/tmp/protected.pem');

      await SecretManager.shutdown();

      expect(SecretManager.tempFiles).to.be.empty;
    });

    it('should clear cache and close client', async function () {
      SecretManager.secretCache.set('TEST', {
        name: 'TEST',
        value: 'value',
        config: { name: 'TEST', type: 'env' }
      });

      await SecretManager.shutdown();

      expect(SecretManager.secretCache.size).to.equal(0);
      expect(mockClient.close.calledOnce).to.be.true;
      expect(SecretManager.client).to.be.undefined;
      expect(SecretManager.options).to.be.undefined;
    });

    it('should handle shutdown when not initialized', async function () {
      SecretManager.client = undefined;

      await SecretManager.shutdown();

      expect(mockClient.close.called).to.be.false;
    });
  });

  describe('isInitialized', function () {
    it('should return true when client exists', function () {
      SecretManager.client = mockClient;

      expect(SecretManager.isInitialized()).to.be.true;
    });

    it('should return false when client is undefined', function () {
      SecretManager.client = undefined;

      expect(SecretManager.isInitialized()).to.be.false;
    });
  });

  describe('getConfig', function () {
    it('should return config without sensitive data', function () {
      SecretManager.options = {
        enabled: true,
        projectId: 'test-project',
        cache: true,
        fallbackToEnv: true,
        secrets: ['SECRET1', 'SECRET2']
      };

      const config = SecretManager.getConfig();

      expect(config?.enabled).to.equal(true);
      expect(config?.projectId).to.equal('test-project');
      expect(config?.cache).to.equal(true);
      expect(config?.fallbackToEnv).to.equal(true);
      expect(config).to.not.have.property('secrets');
    });

    it('should return undefined when not initialized', function () {
      SecretManager.options = undefined;

      const config = SecretManager.getConfig();

      expect(config).to.be.undefined;
    });
  });
});
