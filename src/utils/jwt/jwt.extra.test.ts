import { expect } from 'chai';
import * as jwtModule from './jwt';
import { TokenIssuer } from 'const';

describe('Utils - JWT (extra coverage)', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...savedEnv };
    process.env.ACCESS_TOKEN_AUDIENCE = 'aud';
    process.env.ACCESS_TOKEN_ISSUER = 'iss';
    process.env.ACCESS_TOKEN_EXPIRATION_TIME = '3600';
  });

  afterEach(() => {
    process.env = savedEnv;
    (jwtModule as any).keySet = undefined;
  });

  it('should throw EngineError for invalid issuer', async () => {
    try {
      await jwtModule.jwtVerify('token', 'invalid' as any as TokenIssuer);
      expect.fail('Expected to throw');
    } catch (e) {
      expect((e as Error).message).to.contain('Invalid token issuer');
    }
  });

  // Note: generateJwtToken uses ES256 signing and real keys; integration is covered elsewhere.
});
