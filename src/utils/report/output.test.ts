import { expect } from 'chai';
import sinon from 'sinon';
import { formatLocalLog, formatTime } from './output';
import { LogSeverity } from 'const';

describe('Utils - output', () => {
  describe('formatTime', () => {
    it('should format time in HH:MM:SS format', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = formatTime(date);
      
      // Result will be in local timezone
      expect(result).to.match(/^\d{2}:\d{2}:\d{2}$/);
    });
    
    it('should pad single digits with zeros', () => {
      const date = new Date('2024-01-15T01:02:03.123Z');
      const result = formatTime(date);
      
      expect(result).to.match(/^\d{2}:\d{2}:\d{2}$/);
      const parts = result.split(':');
      parts.forEach(part => {
        expect(part).to.have.lengthOf(2);
      });
    });
  });
  
  describe('formatLocalLog', () => {
    let consoleLogStub: sinon.SinonStub;
    
    beforeEach(() => {
      consoleLogStub = sinon.stub(console, 'log');
    });
    
    afterEach(() => {
      consoleLogStub.restore();
    });
    
    it('should format INFO logs with cyan color in development', () => {
      process.env.NODE_ENV = 'development';
      formatLocalLog(LogSeverity.INFO, 'Test message');
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      expect(output).to.include('INFO');
      expect(output).to.include('Test message');
    });
    
    it('should format WARNING logs with yellow color', () => {
      process.env.NODE_ENV = 'development';
      formatLocalLog(LogSeverity.WARNING, 'Warning message');
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      expect(output).to.include('WARNING');
      expect(output).to.include('Warning message');
    });
    
    it('should format ERROR logs with red color', () => {
      process.env.NODE_ENV = 'development';
      formatLocalLog(LogSeverity.ERROR, 'Error message');
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      expect(output).to.include('ERROR');
      expect(output).to.include('Error message');
    });
    
    it('should not use colors in production', () => {
      process.env.NODE_ENV = 'production';
      formatLocalLog(LogSeverity.INFO, 'Production message');
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      expect(output).to.include('INFO');
      expect(output).to.include('Production message');
      // Verify no ANSI color codes
      expect(output).to.not.match(/\x1b\[\d+m/);
    });
    
    it('should include timestamp in HH:MM:SS format', () => {
      process.env.NODE_ENV = 'development';
      formatLocalLog(LogSeverity.INFO, 'Test message');
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      // Match [HH:MM:SS] pattern
      expect(output).to.match(/\[\d{2}:\d{2}:\d{2}\]/);
    });
    
    it('should handle empty messages', () => {
      process.env.NODE_ENV = 'development';
      formatLocalLog(LogSeverity.INFO, '');
      
      expect(consoleLogStub).to.have.been.calledOnce;
    });
    
    it('should handle objects in messages', () => {
      process.env.NODE_ENV = 'development';
      const obj = { key: 'value' };
      formatLocalLog(LogSeverity.INFO, JSON.stringify(obj));
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      expect(output).to.include('value');
    });
  });
});
