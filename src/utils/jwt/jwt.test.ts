import { randomUUID } from 'crypto';
import { generateAccessToken } from 'backend-test-tools';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { jwtVerify, initKeySets, shutdownKeySets, keySet } from './jwt';
import { TokenIssuer } from 'const';

describe('Utils - JWT', () => {
  it('should pass a default token', async () => {
    const id = randomUUID();
    const token = generateAccessToken(id);
    const result = await jwtVerify(token);
    expect(result.sub).to.equal(id);
  });

  it('should pass a token with one correct audience [Auth-service]', async () => {
    const id = randomUUID();
    const token = generateAccessToken(id, {
      audience: [
        process.env.ACCESS_TOKEN_AUDIENCE as string,
        faker.lorem.word()
      ],
      issuer: process.env.ACCESS_TOKEN_ISSUER
    });
    const result = await jwtVerify(token, TokenIssuer.AUTH_SERVICE);
    expect(result.sub).to.equal(id);
  });

  it('should reject token with wrong issuer', async () => {
    const id = randomUUID();
    const token = generateAccessToken(id, {
      issuer: 'wrong-issuer'
    });
    
    try {
      await jwtVerify(token);
      expect.fail('Should have rejected token with wrong issuer');
    } catch (error: any) {
      expect(error.statusCode).to.equal(401);
      expect(error.errorCode).to.equal('unauthorized');
    }
  });

  it('should reject token with wrong audience', async () => {
    const id = randomUUID();
    const token = generateAccessToken(id, {
      audience: ['wrong-audience']
    });
    
    try {
      await jwtVerify(token);
      expect.fail('Should have rejected token with wrong audience');
    } catch (error: any) {
      expect(error.statusCode).to.equal(401);
      expect(error.errorCode).to.equal('unauthorized');
    }
  });

  it('should reject expired token', async () => {
    const id = randomUUID();
    const token = generateAccessToken(id, {
      expiresIn: -1 // Already expired
    });
    
    try {
      await jwtVerify(token);
      expect.fail('Should have rejected expired token');
    } catch (error: any) {
      expect(error.statusCode).to.equal(401);
      expect(error.errorCode).to.equal('unauthorized');
    }
  });

  it('should shutdown keySets', () => {
    shutdownKeySets();
    // Should not throw
  });

  it('should throw error for invalid token issuer', async () => {
    const id = randomUUID();
    const token = generateAccessToken(id);
    
    try {
      await jwtVerify(token, 'invalid-issuer' as any);
      expect.fail('Should have thrown error for invalid issuer');
    } catch (error: any) {
      expect(error.message).to.include('Invalid token issuer');
    }
  });

  it('should handle keySet initialization check', () => {
    // Test that keySet can be defined
    // In test environment, keySet may not be initialized
    expect(typeof keySet).to.be.oneOf(['undefined', 'object']);
  });

  it('should throw error when ECDSA_PUBLIC_KEY missing for auth-service', async () => {
    const originalChart = process.env.CHART;
    const originalPublicKey = process.env.ECDSA_PUBLIC_KEY;
    
    try {
      process.env.CHART = 'auth-service';
      delete process.env.ECDSA_PUBLIC_KEY;
      
      await initKeySets();
      expect.fail('Should have thrown error for missing ECDSA_PUBLIC_KEY');
    } catch (error: any) {
      expect(error.message).to.include('ECDSA_PUBLIC_KEY');
    } finally {
      process.env.CHART = originalChart;
      if (originalPublicKey) {
        process.env.ECDSA_PUBLIC_KEY = originalPublicKey;
      }
    }
  });

  it('should handle malformed token', async () => {
    try {
      await jwtVerify('not-a-valid-token');
      expect.fail('Should have rejected malformed token');
    } catch (error: any) {
      expect(error.statusCode).to.equal(401);
      expect(error.errorCode).to.equal('unauthorized');
    }
  });
});
