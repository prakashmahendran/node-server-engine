import { expect } from 'chai';
import { WebError } from 'entities/WebError';
import { createVerificationToken, verifyVerificationToken } from './verificationToken';

describe('Utils - Verification Token', () => {
  beforeEach(() => {
    process.env.VERIFICATION_TOKEN_SECRET = 'test-verification-secret';
    delete process.env.VERIFICATION_TOKEN_OTP_SECRET;
    delete process.env.VERIFICATION_TOKEN_ISSUER;
  });

  it('should create and verify a verification token', () => {
    const { token, otp } = createVerificationToken({
      action: 'DELETE ACCOUNT',
      subject: 'user-123'
    });

    const payload = verifyVerificationToken(token, {
      action: 'delete account',
      otp,
      subject: 'user-123'
    });

    expect(payload.act).to.equal('DELETE ACCOUNT');
    expect(payload.sub).to.equal('user-123');
  });

  it('should reject a wrong OTP', () => {
    const { token } = createVerificationToken({
      action: 'DELETE ACCOUNT',
      subject: 'user-123'
    });

    try {
      verifyVerificationToken(token, {
        action: 'DELETE ACCOUNT',
        otp: '000000',
        subject: 'user-123'
      });
      expect.fail('Expected verification to fail for wrong OTP');
    } catch (error) {
      expect(error).to.be.instanceof(WebError);
      expect((error as WebError).statusCode).to.equal(403);
      expect((error as WebError).errorCode).to.equal('verification_failed');
    }
  });

  it('should reject a wrong action', () => {
    const { token, otp } = createVerificationToken({
      action: 'DELETE ACCOUNT',
      subject: 'user-123'
    });

    try {
      verifyVerificationToken(token, {
        action: 'UPDATE EMAIL',
        otp,
        subject: 'user-123'
      });
      expect.fail('Expected verification to fail for wrong action');
    } catch (error) {
      expect(error).to.be.instanceof(WebError);
      expect((error as WebError).statusCode).to.equal(403);
      expect((error as WebError).errorCode).to.equal('verification_failed');
    }
  });
});
