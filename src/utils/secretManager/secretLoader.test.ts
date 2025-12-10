import { expect } from 'chai';
import sinon from 'sinon';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as secretLoader from './secretLoader';

describe('Utils - secretLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear the cache before each test
    Object.keys(secretLoader.secretCache).forEach(
      (key) => delete secretLoader.secretCache[key]
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  describe('initializeSecrets', () => {
    it('should skip initialization in non-production environment', async () => {
      process.env.NODE_ENV = 'development';

      await secretLoader.initializeSecrets(['SECRET_1', 'SECRET_2']);

      expect(Object.keys(secretLoader.secretCache)).to.have.lengthOf(0);
    });

    it('should skip initialization in test environment', async () => {
      process.env.NODE_ENV = 'test';

      await secretLoader.initializeSecrets(['SECRET_1', 'SECRET_2']);

      expect(Object.keys(secretLoader.secretCache)).to.have.lengthOf(0);
    });

    it('should throw error when no secret names are defined', async () => {
      process.env.NODE_ENV = 'production';
      // No environment variables set

      try {
        await secretLoader.initializeSecrets(['SECRET_1', 'SECRET_2']);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.include(
          'No secret names defined in environment variables'
        );
      }
    });

    it('should load only first secret when second path is not defined', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_1 = 'projects/123/secrets/my-secret/versions/1';
      // SECRET_2 path is not defined

      const accessSecretVersionStub = sinon
        .stub(SecretManagerServiceClient.prototype, 'accessSecretVersion')
        .resolves([
          {
            payload: {
              data: Buffer.from('secret-value-1')
            }
          }
        ] as any);

      // When SECRET_2 has no path, it gets filtered out before fetching
      await secretLoader.initializeSecrets(['SECRET_1', 'SECRET_2']);

      // Should only load SECRET_1
      expect(secretLoader.secretCache['SECRET_1']).to.equal('secret-value-1');
      expect(secretLoader.secretCache['SECRET_2']).to.be.undefined;

      accessSecretVersionStub.restore();
    });

    it('should successfully load secrets and cache them', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_1 = 'projects/123/secrets/secret1/versions/1';
      process.env.SECRET_2 = 'projects/123/secrets/secret2/versions/1';

      const accessSecretVersionStub = sinon
        .stub(SecretManagerServiceClient.prototype, 'accessSecretVersion');

      accessSecretVersionStub.onFirstCall().resolves([
        {
          payload: {
            data: Buffer.from('secret-value-1')
          }
        }
      ] as any);

      accessSecretVersionStub.onSecondCall().resolves([
        {
          payload: {
            data: Buffer.from('secret-value-2')
          }
        }
      ] as any);

      await secretLoader.initializeSecrets(['SECRET_1', 'SECRET_2']);

      expect(secretLoader.secretCache['SECRET_1']).to.equal('secret-value-1');
      expect(secretLoader.secretCache['SECRET_2']).to.equal('secret-value-2');

      accessSecretVersionStub.restore();
    });

    it('should throw error when secret payload is empty', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_1 = 'projects/123/secrets/secret1/versions/1';

      const accessSecretVersionStub = sinon
        .stub(SecretManagerServiceClient.prototype, 'accessSecretVersion')
        .resolves([
          {
            payload: {
              data: null
            }
          }
        ] as any);

      try {
        await secretLoader.initializeSecrets(['SECRET_1']);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.include(
          'Secret SECRET_1 not found or empty'
        );
      }

      accessSecretVersionStub.restore();
    });

    it('should throw error when accessing secret fails', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_1 = 'projects/123/secrets/secret1/versions/1';

      const accessSecretVersionStub = sinon
        .stub(SecretManagerServiceClient.prototype, 'accessSecretVersion')
        .rejects(new Error('Access denied'));

      try {
        await secretLoader.initializeSecrets(['SECRET_1']);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.include(
          'Error accessing secret SECRET_1: Access denied'
        );
      }

      accessSecretVersionStub.restore();
    });

    it('should only load secrets that have env vars defined', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SECRET_1 = 'projects/123/secrets/secret1/versions/1';
      // SECRET_2 and SECRET_3 are not defined

      const accessSecretVersionStub = sinon
        .stub(SecretManagerServiceClient.prototype, 'accessSecretVersion')
        .resolves([
          {
            payload: {
              data: Buffer.from('secret-value-1')
            }
          }
        ] as any);

      await secretLoader.initializeSecrets(['SECRET_1', 'SECRET_2', 'SECRET_3']);

      expect(secretLoader.secretCache['SECRET_1']).to.equal('secret-value-1');
      expect(secretLoader.secretCache['SECRET_2']).to.be.undefined;
      expect(secretLoader.secretCache['SECRET_3']).to.be.undefined;
      expect(accessSecretVersionStub).to.have.been.calledOnce;

      accessSecretVersionStub.restore();
    });

    it('should handle multiple secrets with different values', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DB_PASSWORD = 'projects/123/secrets/db-pass/versions/latest';
      process.env.API_KEY = 'projects/123/secrets/api-key/versions/1';

      const accessSecretVersionStub = sinon
        .stub(SecretManagerServiceClient.prototype, 'accessSecretVersion');

      accessSecretVersionStub.onFirstCall().resolves([
        {
          payload: {
            data: Buffer.from('super-secret-db-password')
          }
        }
      ] as any);

      accessSecretVersionStub.onSecondCall().resolves([
        {
          payload: {
            data: Buffer.from('api-key-12345')
          }
        }
      ] as any);

      await secretLoader.initializeSecrets(['DB_PASSWORD', 'API_KEY']);

      expect(secretLoader.secretCache['DB_PASSWORD']).to.equal('super-secret-db-password');
      expect(secretLoader.secretCache['API_KEY']).to.equal('api-key-12345');

      accessSecretVersionStub.restore();
    });
  });
});
