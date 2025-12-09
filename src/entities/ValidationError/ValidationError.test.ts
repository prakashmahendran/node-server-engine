import { expect } from 'chai';
import { ValidationError } from './ValidationError';
import { validationResult } from 'express-validator';

describe('Entity - ValidationError', () => {
  describe('constructor', () => {
    it('should create error from validation result', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq).withDefaults({
        formatter: (error) => ({ type: 'field', value: '', msg: error.msg, path: 'email', location: 'body' })
      });
      
      // Manually add errors for testing
      (result as any).errors = [{ type: 'field', msg: 'Invalid email', path: 'email', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.message).to.equal('Request did not pass validation');
      expect(error.statusCode).to.equal(400);
      expect(error.errorCode).to.equal('invalid-request');
      expect(error.stack).to.exist;
    });
    
    it('should always use 400 status code', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Invalid', path: 'name', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.statusCode).to.equal(400);
    });
    
    it('should throw error if validation result is empty', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      
      expect(() => new ValidationError(result)).to.throw();
    });
  });
  
  describe('field validation errors', () => {
    it('should handle missing required field', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Name is required', path: 'name', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.errorCode).to.equal('invalid-request');
      expect(error.hint).to.exist;
    });
    
    it('should handle invalid field format', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Invalid email format', path: 'email', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.data).to.exist;
      expect(error.hint).to.exist;
    });
    
    it('should include error message in hint', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Too long', path: 'password', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.hint).to.deep.include({ field: 'Too long' });
    });
  });
  
  describe('multiple validation errors', () => {
    it('should handle array of validation errors', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [
        { type: 'field', msg: 'Invalid format', path: 'email', location: 'body' },
        { type: 'field', msg: 'Must be positive', path: 'age', location: 'body' }
      ];
      
      const error = new ValidationError(result);
      
      expect(error.hint).to.exist;
      expect(error.data).to.exist;
    });
  });
  
  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Test', path: 'field', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error).to.be.instanceOf(Error);
    });
    
    it('should be instance of ValidationError', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Test', path: 'field', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error).to.be.instanceOf(ValidationError);
    });
  });
  
  describe('common validation scenarios', () => {
    it('should validate email', () => {
      const mockReq: any = { body: { email: 'not-an-email' } };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Invalid email', path: 'email', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.errorCode).to.equal('invalid-request');
    });
    
    it('should validate number range', () => {
      const mockReq: any = { body: { age: -5 } };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Age must be between 0 and 120', path: 'age', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.statusCode).to.equal(400);
    });
    
    it('should validate enum values', () => {
      const mockReq: any = { body: { status: 'invalid' } };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Status must be one of: active, inactive, pending', path: 'status', location: 'body' }];
      
      const error = new ValidationError(result);
      
      expect(error.message).to.equal('Request did not pass validation');
    });
  });
  
  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Test', path: 'name', location: 'body' }];
      
      const error = new ValidationError(result);
      const json = JSON.stringify(error);
      
      expect(json).to.be.a('string');
    });
    
    it('should include hint and data in JSON', () => {
      const mockReq: any = { body: {} };
      const result = validationResult(mockReq);
      (result as any).errors = [{ type: 'field', msg: 'Invalid', path: 'email', location: 'body' }];
      
      const error = new ValidationError(result);
      const parsed = JSON.parse(JSON.stringify(error));
      
      expect(parsed.hint).to.exist;
      expect(parsed.data).to.exist;
    });
  });
});
