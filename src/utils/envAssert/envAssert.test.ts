import { expect } from 'chai';
import { envAssert } from './envAssert';

describe('Utils - envAssert', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isString', () => {
    it('should validate string values', () => {
      process.env.TEST_VAR = 'test-value';
      const validator = envAssert.isString();
      
      expect(() => validator._parse('test-value')).to.not.throw();
    });

    it('should reject empty strings by default', () => {
      const validator = envAssert.isString();
      
      expect(() => validator._parse('')).to.throw();
    });
  });

  describe('isBoolean', () => {
    it('should validate true', () => {
      const validator = envAssert.isBoolean();
      
      expect(() => validator._parse('true')).to.not.throw();
    });

    it('should validate false', () => {
      const validator = envAssert.isBoolean();
      
      expect(() => validator._parse('false')).to.not.throw();
    });
  });

  describe('isNumber', () => {
    it('should validate numeric strings', () => {
      const validator = envAssert.isNumber();
      
      expect(() => validator._parse('42')).to.not.throw();
    });

    it('should validate negative numbers', () => {
      const validator = envAssert.isNumber();
      
      expect(() => validator._parse('-10')).to.not.throw();
    });

    it('should validate decimal numbers', () => {
      const validator = envAssert.isNumber();
      
      expect(() => validator._parse('3.14')).to.not.throw();
    });
  });

  describe('isPort', () => {
    it('should validate valid port numbers', () => {
      const validator = envAssert.isPort();
      
      expect(() => validator._parse('3000')).to.not.throw();
      expect(() => validator._parse('8080')).to.not.throw();
    });

    it('should reject invalid ports', () => {
      const validator = envAssert.isPort();
      
      expect(() => validator._parse('70000')).to.throw();
      expect(() => validator._parse('-1')).to.throw();
    });
  });

  describe('isEmail', () => {
    it('should validate email addresses', () => {
      const validator = envAssert.isEmail();
      
      expect(() => validator._parse('test@example.com')).to.not.throw();
    });

    it('should reject invalid emails', () => {
      const validator = envAssert.isEmail();
      
      expect(() => validator._parse('not-an-email')).to.throw();
    });
  });

  describe('isHost', () => {
    it('should validate hostnames', () => {
      const validator = envAssert.isHost();
      
      expect(() => validator._parse('example.com')).to.not.throw();
      expect(() => validator._parse('sub.example.com')).to.not.throw();
    });

    it('should validate localhost', () => {
      const validator = envAssert.isHost();
      
      expect(() => validator._parse('localhost')).to.not.throw();
    });
  });

  describe('isURL', () => {
    it('should validate URLs', () => {
      const validator = envAssert.isURL();
      
      expect(() => validator._parse('https://example.com')).to.not.throw();
      expect(() => validator._parse('http://localhost:3000')).to.not.throw();
    });

    it('should reject invalid URLs', () => {
      const validator = envAssert.isURL();
      
      expect(() => validator._parse('not a url')).to.throw();
    });
  });

  describe('isJSON', () => {
    it('should validate JSON strings', () => {
      const validator = envAssert.isJSON();
      
      expect(() => validator._parse('{"key":"value"}')).to.not.throw();
      expect(() => validator._parse('[1,2,3]')).to.not.throw();
    });

    it('should reject invalid JSON', () => {
      const validator = envAssert.isJSON();
      
      expect(() => validator._parse('{invalid}')).to.throw();
    });
  });

  describe('isPath', () => {
    it('should validate file paths', () => {
      const validator = envAssert.isPath();
      
      // Absolute paths
      expect(() => validator._parse('/path/to/file')).to.not.throw();
      expect(() => validator._parse('/etc/config')).to.not.throw();
    });

    it('should validate relative paths', () => {
      const validator = envAssert.isPath();
      
      expect(() => validator._parse('relative/path')).to.not.throw();
      expect(() => validator._parse('../parent/path')).to.not.throw();
    });

    it('should reject empty paths', () => {
      const validator = envAssert.isPath();
      
      expect(() => validator._parse('')).to.throw();
    });
  });

  describe('isIPList', () => {
    it('should validate IP address lists', () => {
      const validator = envAssert.isIPList();
      
      expect(() => validator._parse('127.0.0.1,192.168.1.1')).to.not.throw();
    });

    it('should validate single IP', () => {
      const validator = envAssert.isIPList();
      
      expect(() => validator._parse('127.0.0.1')).to.not.throw();
    });
  });

  describe('isHostList', () => {
    it('should validate host lists', () => {
      const validator = envAssert.isHostList();
      
      expect(() => validator._parse('example.com,test.com')).to.not.throw();
    });

    it('should validate single host', () => {
      const validator = envAssert.isHostList();
      
      expect(() => validator._parse('example.com')).to.not.throw();
    });
  });

  describe('isStringList', () => {
    it('should validate string lists', () => {
      const validator = envAssert.isStringList();
      
      expect(() => validator._parse('value1,value2,value3')).to.not.throw();
    });

    it('should validate single string', () => {
      const validator = envAssert.isStringList();
      
      expect(() => validator._parse('single-value')).to.not.throw();
    });
  });

  it('should have all expected validator functions', () => {
    expect(envAssert.isString).to.be.a('function');
    expect(envAssert.isBoolean).to.be.a('function');
    expect(envAssert.isNumber).to.be.a('function');
    expect(envAssert.isEmail).to.be.a('function');
    expect(envAssert.isHost).to.be.a('function');
    expect(envAssert.isPort).to.be.a('function');
    expect(envAssert.isURL).to.be.a('function');
    expect(envAssert.isJSON).to.be.a('function');
    expect(envAssert.isIPList).to.be.a('function');
    expect(envAssert.isPath).to.be.a('function');
    expect(envAssert.isHostList).to.be.a('function');
    expect(envAssert.isStringList).to.be.a('function');
  });
});
