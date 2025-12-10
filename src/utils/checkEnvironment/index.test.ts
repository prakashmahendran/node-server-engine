import { expect } from 'chai';
import { checkEnvironment, assertEnvironment } from './index';
import { envAssert } from 'utils/envAssert';

describe('Utils - checkEnvironment & assertEnvironment', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('assertEnvironment', () => {
    it('should pass when all required env vars are valid', () => {
      process.env.TEST_VAR = 'test-value';
      
      expect(() => {
        assertEnvironment({ TEST_VAR: envAssert.isString() });
      }).to.not.throw();
    });

    it('should throw when required env var is missing', () => {
      delete process.env.TEST_VAR;
      
      expect(() => {
        assertEnvironment({ TEST_VAR: envAssert.isString() });
      }).to.throw();
    });

    it('should throw with error message containing missing var name', () => {
      delete process.env.MISSING_VAR;
      
      try {
        assertEnvironment({ MISSING_VAR: envAssert.isString() });
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).to.include('MISSING_VAR');
      }
    });

    it('should validate multiple env vars', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      
      expect(() => {
        assertEnvironment({
          VAR1: envAssert.isString(),
          VAR2: envAssert.isString()
        });
      }).to.not.throw();
    });

    it('should throw when one of multiple vars is invalid', () => {
      process.env.VAR1 = 'value1';
      delete process.env.VAR2;
      
      expect(() => {
        assertEnvironment({
          VAR1: envAssert.isString(),
          VAR2: envAssert.isString()
        });
      }).to.throw();
    });

    it('should pass with empty validators', () => {
      expect(() => {
        assertEnvironment({});
      }).to.not.throw();
    });

    it('should validate boolean env vars', () => {
      process.env.BOOL_VAR = 'true';
      
      expect(() => {
        assertEnvironment({ BOOL_VAR: envAssert.isBoolean() });
      }).to.not.throw();
    });

    it('should validate number env vars', () => {
      process.env.NUM_VAR = '42';
      
      expect(() => {
        assertEnvironment({ NUM_VAR: envAssert.isNumber() });
      }).to.not.throw();
    });
  });

  describe('checkEnvironment', () => {
    // Note: checkEnvironment calls process.exit(1) on failure, making it hard to test
    // These tests verify the function exists and can be called with valid data
    
    it('should pass when all required env vars are valid', () => {
      process.env.TEST_VAR = 'test-value';
      
      // Should not throw or exit when valid
      expect(() => {
        checkEnvironment({ TEST_VAR: envAssert.isString() });
      }).to.not.throw();
    });

    it('should pass with empty validators', () => {
      expect(() => {
        checkEnvironment({});
      }).to.not.throw();
    });
  });
});
