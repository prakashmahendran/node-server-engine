import { randomUUID } from 'crypto';
import { generateAccessToken } from 'backend-test-tools';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { jwtVerify } from './jwt';
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
});
