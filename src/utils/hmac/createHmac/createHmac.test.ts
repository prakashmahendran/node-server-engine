import { expect } from 'chai';
import { createHmac } from './createHmac';
import { signPayload } from '../signPayload/signPayload';
import { verifySignature } from '../verifySignature/verifySignature';

describe('Utils - HMAC', () => {
  const testSecret = 'test-secret-key';
  
  describe('createHmac', () => {
    it('should create HMAC hash for simple object', () => {
      const payload = { message: 'hello' };
      const hash = createHmac(payload, { secret: testSecret, encode: 'hex' });
      
      expect(hash).to.be.a('string');
      expect(hash).to.have.length.greaterThan(0);
    });

    it('should create consistent hash for same payload', () => {
      const payload = { message: 'hello', count: 42 };
      const hash1 = createHmac(payload, { secret: testSecret, encode: 'hex' });
      const hash2 = createHmac(payload, { secret: testSecret, encode: 'hex' });
      
      expect(hash1).to.equal(hash2);
    });

    it('should create different hash for different payloads', () => {
      const payload1 = { message: 'hello' };
      const payload2 = { message: 'world' };
      const hash1 = createHmac(payload1, { secret: testSecret, encode: 'hex' });
      const hash2 = createHmac(payload2, { secret: testSecret, encode: 'hex' });
      
      expect(hash1).to.not.equal(hash2);
    });

    it('should create different hash with different secrets', () => {
      const payload = { message: 'hello' };
      const hash1 = createHmac(payload, { secret: 'secret1', encode: 'hex' });
      const hash2 = createHmac(payload, { secret: 'secret2', encode: 'hex' });
      
      expect(hash1).to.not.equal(hash2);
    });

    it('should sort object keys by default', () => {
      const payload1 = { b: 2, a: 1 };
      const payload2 = { a: 1, b: 2 };
      const hash1 = createHmac(payload1, { secret: testSecret, encode: 'hex' });
      const hash2 = createHmac(payload2, { secret: testSecret, encode: 'hex' });
      
      expect(hash1).to.equal(hash2);
    });

    it('should not sort when sort option is false', () => {
      const payload1 = { b: 2, a: 1 };
      const payload2 = { a: 1, b: 2 };
      const hash1 = createHmac(payload1, { secret: testSecret, encode: 'hex', sort: false });
      const hash2 = createHmac(payload2, { secret: testSecret, encode: 'hex', sort: false });
      
      expect(hash1).to.not.equal(hash2);
    });

    it('should support different algorithms', () => {
      const payload = { message: 'hello' };
      const hash256 = createHmac(payload, { secret: testSecret, encode: 'hex', algorithm: 'sha256' });
      const hash512 = createHmac(payload, { secret: testSecret, encode: 'hex', algorithm: 'sha512' });
      
      expect(hash256).to.not.equal(hash512);
      expect(hash256).to.have.length(64); // SHA-256 hex = 64 chars
      expect(hash512).to.have.length(128); // SHA-512 hex = 128 chars
    });

    it('should return Buffer when encode is not specified', () => {
      const payload = { message: 'hello' };
      const hash = createHmac(payload, { secret: testSecret });
      
      expect(hash).to.be.instanceOf(Buffer);
    });

    it('should handle nested objects', () => {
      const payload = { user: { name: 'John', age: 30 }, active: true };
      const hash = createHmac(payload, { secret: testSecret, encode: 'hex' });
      
      expect(hash).to.be.a('string');
      expect(hash).to.have.length.greaterThan(0);
    });

    it('should handle arrays', () => {
      const payload = { items: [1, 2, 3] };
      const hash = createHmac(payload, { secret: testSecret, encode: 'hex' });
      
      expect(hash).to.be.a('string');
      expect(hash).to.have.length.greaterThan(0);
    });

    it('should support base64 encoding', () => {
      const payload = { message: 'hello' };
      const hash = createHmac(payload, { secret: testSecret, encode: 'base64' });
      
      expect(hash).to.be.a('string');
      expect(hash).to.match(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe('signPayload', () => {
    it('should add signature to payload', () => {
      const payload = { message: 'hello' };
      const signed = signPayload(payload, { secret: testSecret });
      
      expect(signed).to.have.property('signature');
      expect(signed.message).to.equal('hello');
    });

    it('should preserve all original properties', () => {
      const payload = { a: 1, b: 'test', c: true };
      const signed = signPayload(payload, { secret: testSecret });
      
      expect(signed.a).to.equal(1);
      expect(signed.b).to.equal('test');
      expect(signed.c).to.equal(true);
      expect(signed).to.have.property('signature');
    });

    it('should create base64 signature', () => {
      const payload = { message: 'hello' };
      const signed = signPayload(payload, { secret: testSecret });
      
      expect(signed.signature).to.match(/^[A-Za-z0-9+/=]+$/);
    });

    it('should create consistent signature for same payload', () => {
      const payload = { message: 'hello' };
      const signed1 = signPayload(payload, { secret: testSecret });
      const signed2 = signPayload(payload, { secret: testSecret });
      
      expect(signed1.signature).to.equal(signed2.signature);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = { message: 'hello' };
      const signed = signPayload(payload, { secret: testSecret });
      const isValid = verifySignature(payload, signed.signature, { secret: testSecret });
      
      expect(isValid).to.be.true;
    });

    it('should reject invalid signature', () => {
      const payload = { message: 'hello' };
      const isValid = verifySignature(payload, 'invalid-signature', { secret: testSecret });
      
      expect(isValid).to.be.false;
    });

    it('should reject when payload is modified', () => {
      const payload = { message: 'hello' };
      const signed = signPayload(payload, { secret: testSecret });
      const modified = { message: 'world' };
      const isValid = verifySignature(modified, signed.signature, { secret: testSecret });
      
      expect(isValid).to.be.false;
    });

    it('should reject when secret is different', () => {
      const payload = { message: 'hello' };
      const signed = signPayload(payload, { secret: 'secret1' });
      const isValid = verifySignature(payload, signed.signature, { secret: 'secret2' });
      
      expect(isValid).to.be.false;
    });

    it('should return false for null payload', () => {
      const isValid = verifySignature(null as any, 'signature', { secret: testSecret });
      
      expect(isValid).to.be.false;
    });

    it('should return false for empty signature', () => {
      const payload = { message: 'hello' };
      const isValid = verifySignature(payload, '', { secret: testSecret });
      
      expect(isValid).to.be.false;
    });

    it('should verify complex payloads', () => {
      const payload = { 
        user: { name: 'John', age: 30 },
        items: [1, 2, 3],
        active: true
      };
      const signed = signPayload(payload, { secret: testSecret });
      const isValid = verifySignature(payload, signed.signature, { secret: testSecret });
      
      expect(isValid).to.be.true;
    });

    it('should handle hex encoded signatures', () => {
      const payload = { message: 'hello' };
      const signature = createHmac(payload, { secret: testSecret, encode: 'hex' }) as string;
      const isValid = verifySignature(payload, signature, { secret: testSecret, encode: 'hex' });
      
      expect(isValid).to.be.true;
    });
  });

  describe('Integration - Sign and Verify', () => {
    it('should sign and verify complete workflow', () => {
      const originalPayload = { userId: '123', action: 'login', timestamp: Date.now() };
      
      // Sign the payload
      const signedPayload = signPayload(originalPayload, { secret: testSecret });
      
      // Extract signature
      const { signature, ...payloadWithoutSig } = signedPayload;
      
      // Verify signature
      const isValid = verifySignature(payloadWithoutSig, signature, { secret: testSecret });
      
      expect(isValid).to.be.true;
    });

    it('should detect tampering in workflow', () => {
      const originalPayload = { userId: '123', action: 'login' };
      
      // Sign the payload
      const signedPayload = signPayload(originalPayload, { secret: testSecret });
      
      // Tamper with payload
      const tamperedPayload = { userId: '456', action: 'login' };
      
      // Try to verify with original signature
      const isValid = verifySignature(tamperedPayload, signedPayload.signature, { secret: testSecret });
      
      expect(isValid).to.be.false;
    });
  });
});
