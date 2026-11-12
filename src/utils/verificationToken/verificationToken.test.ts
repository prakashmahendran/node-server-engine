import { expect } from 'chai';
import { WebError } from 'entities/WebError';
import {
  createVerificationToken,
  verifyVerificationToken
} from './verificationToken';

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

  describe('review account bypass', () => {
    afterEach(() => {
      delete process.env.VERIFICATION_BYPASS_SUBJECT;
      delete process.env.VERIFICATION_BYPASS_OTP;
    });

    it('should not bypass verification when the bypass is not configured', () => {
      expect(() =>
        verifyVerificationToken('dummy-token', {
          action: 'TEST_VERIFICATION',
          otp: '000000',
          subject: 'test@review.com'
        })
      ).to.throw();
    });

    it('should allow the configured review account with the configured OTP', () => {
      process.env.VERIFICATION_BYPASS_SUBJECT = 'test@review.com';
      process.env.VERIFICATION_BYPASS_OTP = '000000';
      const payload = verifyVerificationToken('dummy-token', {
        action: 'TEST_VERIFICATION',
        otp: '000000',
        subject: 'test@review.com'
      });

      expect(payload.act).to.equal('TEST_VERIFICATION');
      expect(payload.sub).to.equal('test@review.com');
      expect(payload.jti).to.equal('test-verification-jti');
      expect(payload.otp).to.be.a('string');
    });

    it('should not bypass verification with a wrong OTP for the review account', () => {
      process.env.VERIFICATION_BYPASS_SUBJECT = 'test@review.com';
      process.env.VERIFICATION_BYPASS_OTP = '000000';
      expect(() =>
        verifyVerificationToken('dummy-token', {
          action: 'TEST_VERIFICATION',
          otp: '123456',
          subject: 'test@review.com'
        })
      ).to.throw();
    });
  });
});
