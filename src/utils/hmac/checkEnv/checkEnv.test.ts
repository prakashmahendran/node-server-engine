import { expect } from 'chai';
import { assertPayloadSignatureSecret } from './checkEnv';

describe('Utils - HMAC - Check environment', () => {
  it('should pass if environment variables are set', () => {
    process.env.PAYLOAD_SIGNATURE_SECRET = 'secret';
    expect(() => {
      assertPayloadSignatureSecret();
    }).to.not.throw();
  });

  it('should throw an error if the environment vairable is not set', () => {
    delete process.env.PAYLOAD_SIGNATURE_SECRET;
    expect(() => {
      assertPayloadSignatureSecret();
    }).to.throw();
  });
});
