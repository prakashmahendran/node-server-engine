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
});
