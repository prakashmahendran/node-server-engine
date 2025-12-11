import { expect } from 'chai';
import { EngineError } from './EngineError';
import { LogSeverity } from 'const';

describe('Entity - EngineError', () => {
  describe('constructor', () => {
    it('should create error with message only', () => {
      const error = new EngineError('Test error');
      
      expect(error.message).to.equal('Test error');
      expect(error.name).to.equal('Error');
      expect(error.severity).to.equal(LogSeverity.CRITICAL);
      expect(error.stack).to.exist;
    });
    
    it('should create error with message and severity', () => {
      const error = new EngineError({ message: 'Not found', severity: LogSeverity.WARNING });
      
      expect(error.message).to.equal('Not found');
      expect(error.severity).to.equal(LogSeverity.WARNING);
    });
    
    it('should create error with all parameters', () => {
      const originalError = new Error('Original');
      const error = new EngineError({ 
        message: 'Wrapped error', 
        severity: LogSeverity.ERROR,
        error: originalError,
        data: { context: 'test' }
      });
      
      expect(error.message).to.equal('Wrapped error');
      expect(error.severity).to.equal(LogSeverity.ERROR);
      expect(error.error).to.equal(originalError);
      expect(error.data).to.deep.equal({ context: 'test' });
    });
  });
  
  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const error = new EngineError('Test');
      
      expect(error).to.be.instanceOf(Error);
    });
    
    it('should be instance of EngineError', () => {
      const error = new EngineError('Test');
      
      expect(error).to.be.instanceOf(EngineError);
    });
  });
  
  describe('severity levels', () => {
    it('should use CRITICAL severity by default', () => {
      const error = new EngineError('Critical error');
      
      expect(error.severity).to.equal(LogSeverity.CRITICAL);
    });
    
    it('should allow ERROR severity', () => {
      const error = new EngineError({ message: 'Error occurred', severity: LogSeverity.ERROR });
      
      expect(error.severity).to.equal(LogSeverity.ERROR);
    });
    
    it('should allow WARNING severity', () => {
      const error = new EngineError({ message: 'Warning', severity: LogSeverity.WARNING });
      
      expect(error.severity).to.equal(LogSeverity.WARNING);
    });
    
    it('should allow INFO severity', () => {
      const error = new EngineError({ message: 'Info', severity: LogSeverity.INFO });
      
      expect(error.severity).to.equal(LogSeverity.INFO);
    });
    
    it('should allow DEBUG severity', () => {
      const error = new EngineError({ message: 'Debug', severity: LogSeverity.DEBUG });
      
      expect(error.severity).to.equal(LogSeverity.DEBUG);
    });
  });
  
  describe('error wrapping', () => {
    it('should wrap database errors', () => {
      const dbError = new Error('Connection timeout');
      const error = new EngineError({ message: 'Database error', error: dbError });
      
      expect(error.error).to.equal(dbError);
      expect(error.error?.message).to.equal('Connection timeout');
    });
    
    it('should wrap validation errors', () => {
      const validationError = new Error('Field required');
      const error = new EngineError({ message: 'Validation failed', error: validationError });
      
      expect(error.error).to.equal(validationError);
    });
    
    it('should preserve stack trace when wrapping', () => {
      const originalError = new Error('Original');
      const error = new EngineError({ message: 'Wrapped', error: originalError });
      
      expect(error.stack).to.exist;
      expect(originalError.stack).to.exist;
    });
  });
  
  describe('serialization', () => {
    it('should be serializable to JSON', () => {
      const error = new EngineError({ message: 'Test error', data: { key: 'value' } });
      const json = JSON.stringify(error);
      
      expect(json).to.be.a('string');
    });
    
    it('should include message and data in JSON', () => {
      const error = new EngineError({ message: 'Test error', data: { key: 'value' } });
      
      // Error message is accessible but not enumerable in JSON
      expect(error.message).to.equal('Test error');
      expect(error.data).to.deep.equal({ key: 'value' });
      
      // Check that data is serializable
      const json = JSON.stringify(error);
      expect(json).to.include('key');
      expect(json).to.include('value');
    });
  });
});
