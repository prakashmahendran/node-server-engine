import { expect } from 'chai';
import { output } from './output';
import { LogSeverity } from 'const';

describe('Utils - output', () => {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_FORMAT: process.env.LOG_FORMAT,
    SILENCE_REPORT: process.env.SILENCE_REPORT
  } as Record<string, string | undefined>;

  beforeEach(() => {
    console.log = ((..._args: any[]) => {}) as any;
    console.error = ((..._args: any[]) => {}) as any;
    console.dir = ((..._args: any[]) => {}) as any;
    delete process.env.SILENCE_REPORT;
    delete process.env.LOG_FORMAT;
    // Leave NODE_ENV as set by mocha (test) unless overridden in the test
  });

  afterEach(() => {
    if (saved.NODE_ENV === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.LOG_FORMAT === undefined) delete process.env.LOG_FORMAT; else process.env.LOG_FORMAT = saved.LOG_FORMAT;
    if (saved.SILENCE_REPORT === undefined) delete process.env.SILENCE_REPORT; else process.env.SILENCE_REPORT = saved.SILENCE_REPORT;
  });

  it('should return early when SILENCE_REPORT is set', () => {
    process.env.SILENCE_REPORT = 'true';
    const res = output({ severity: LogSeverity.INFO, message: 'hello' });
    expect(res.message).to.equal('hello');
  });

  it('should pretty print with console.dir in test mode', () => {
    process.env.NODE_ENV = 'test';
    let called = false;
    console.dir = (() => { called = true; }) as any;
    const res = output({ severity: LogSeverity.INFO, message: 'msg' });
    expect(res.message).to.equal('msg');
    expect(called).to.equal(true);
  });

  it('should format local logs in development (INFO -> console.log)', () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_FORMAT = 'local';
    let calledLog = false;
    console.log = ((_s: any) => { calledLog = true; }) as any;
    const res = output({ severity: LogSeverity.INFO, message: 'local' });
    expect(res.message).to.equal('local');
    expect(calledLog).to.equal(true);
  });

  it('should route error severity to console.error in local mode', () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_FORMAT = 'local';
    let calledErr = false;
    console.error = ((_s: any) => { calledErr = true; }) as any;
    const res = output({ severity: LogSeverity.ERROR, message: 'err' });
    expect(res.message).to.equal('err');
    expect(calledErr).to.equal(true);
  });

  it('should print JSON in production (status < 500 -> console.log)', () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_FORMAT = 'json';
    let calledLog = false;
    console.log = ((_s: any) => { calledLog = true; }) as any;
    const res = output({ severity: LogSeverity.INFO, message: 'json' });
    expect(res.message).to.equal('json');
    expect(calledLog).to.equal(true);
  });

  it('should print JSON to console.error when statusCode >= 500 in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_FORMAT = 'json';
    let calledErr = false;
    console.error = ((_s: any) => { calledErr = true; }) as any;
    const res = output({ severity: LogSeverity.INFO, statusCode: 500, message: 'boom' });
    expect(res.message).to.equal('boom');
    expect(calledErr).to.equal(true);
  });
});
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

    it('should handle CRITICAL severity', () => {
      process.env.NODE_ENV = 'development';
      formatLocalLog(LogSeverity.CRITICAL, 'Critical issue');
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      expect(output).to.include('CRITICAL');
    });

    it('should handle DEBUG severity', () => {
      process.env.NODE_ENV = 'development';
      formatLocalLog(LogSeverity.DEBUG, 'Debug info');
      
      expect(consoleLogStub).to.have.been.calledOnce;
      const output = consoleLogStub.firstCall.args[0];
      expect(output).to.include('DEBUG');
    });
  });
});