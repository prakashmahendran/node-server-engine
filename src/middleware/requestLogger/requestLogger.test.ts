import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response, NextFunction } from 'express';
import { requestLogger } from './requestLogger';
import * as outputModule from 'utils/report/output';

describe('Middleware - requestLogger', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let outputStub: sinon.SinonStub;
  let onFinishCallback: () => void;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    outputStub = sinon.stub(outputModule, 'output');
    
    req = {
      method: 'GET',
      url: '/api/test',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      header: sinon.stub().returns('Mozilla/5.0'),
      httpVersionMajor: 1,
      httpVersionMinor: 1
    };

    res = {
      statusCode: 200,
      on: sinon.stub().callsFake((event: string, callback: () => void) => {
        if (event === 'finish') {
          onFinishCallback = callback;
        }
      }),
      getHeader: sinon.stub().returns('1234')
    };

    next = sinon.stub();
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  it('should call next immediately', () => {
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    
    expect(next).to.have.been.calledOnce;
  });

  it('should log request on response finish', () => {
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    
    expect(outputStub).to.not.have.been.called;
    
    // Trigger finish event
    onFinishCallback();
    
    expect(outputStub).to.have.been.calledOnce;
  });

  it('should log GET request with correct message', () => {
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    onFinishCallback();
    
    const logEntry = outputStub.firstCall.args[0];
    expect(logEntry.message).to.match(/GET \/api\/test \[200\] \d+ms/);
  });

  it('should log POST request', () => {
    req.method = 'POST';
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    onFinishCallback();
    
    const logEntry = outputStub.firstCall.args[0];
    expect(logEntry.message).to.match(/POST \/api\/test \[200\] \d+ms/);
  });

  it('should use DEBUG severity for 2xx status codes', () => {
    res.statusCode = 200;
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    onFinishCallback();
    
    const logEntry = outputStub.firstCall.args[0];
    expect(logEntry.severity).to.equal('DEBUG');
  });

  it('should use WARNING severity for 4xx status codes', () => {
    res.statusCode = 404;
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    onFinishCallback();
    
    const logEntry = outputStub.firstCall.args[0];
    expect(logEntry.severity).to.equal('WARNING');
  });

  it('should use ERROR severity for 5xx status codes', () => {
    res.statusCode = 500;
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    onFinishCallback();
    
    const logEntry = outputStub.firstCall.args[0];
    expect(logEntry.severity).to.equal('ERROR');
  });

  it('should include response time in message', (done) => {
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    
    setTimeout(() => {
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      const match = logEntry.message.match(/(\d+)ms$/);
      expect(match).to.exist;
      const responseTime = parseInt(match![1]);
      expect(responseTime).to.be.greaterThan(0);
      done();
    }, 10);
  });

  it('should use originalUrl when available', () => {
    req.originalUrl = '/api/v2/test';
    req.url = '/test';
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    onFinishCallback();
    
    const logEntry = outputStub.firstCall.args[0];
    expect(logEntry.message).to.include('/api/v2/test');
  });

  it('should fall back to url when originalUrl is not available', () => {
    req.originalUrl = undefined;
    req.url = '/test';
    const middleware = requestLogger();
    middleware(req as Request, res as Response, next);
    onFinishCallback();
    
    const logEntry = outputStub.firstCall.args[0];
    expect(logEntry.message).to.include('/test');
  });

  describe('detailed logs', () => {
    beforeEach(() => {
      process.env.DETAILED_LOGS = 'true';
    });

    it('should include httpRequest context when DETAILED_LOGS is true', () => {
      const middleware = requestLogger();
      middleware(req as Request, res as Response, next);
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      expect(logEntry.context).to.exist;
      expect(logEntry.context.httpRequest).to.exist;
      expect(logEntry.context.httpRequest.method).to.equal('GET');
      expect(logEntry.context.httpRequest.url).to.equal('/api/test');
    });

    it('should include response time data when DETAILED_LOGS is true', () => {
      const middleware = requestLogger();
      middleware(req as Request, res as Response, next);
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      expect(logEntry.data).to.exist;
      expect(logEntry.data.responseTime).to.match(/\d+ms/);
    });

    it('should include content length when available', () => {
      (res.getHeader as sinon.SinonStub).returns('5678');
      const middleware = requestLogger();
      middleware(req as Request, res as Response, next);
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      expect(logEntry.data.contentLength).to.equal('5678');
    });

    it('should include user agent', () => {
      const middleware = requestLogger();
      middleware(req as Request, res as Response, next);
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      expect(logEntry.context.httpRequest.userAgent).to.equal('Mozilla/5.0');
    });

    it('should include remote IP', () => {
      const middleware = requestLogger();
      middleware(req as Request, res as Response, next);
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      expect(logEntry.context.httpRequest.remoteIp).to.equal('127.0.0.1');
    });
  });

  describe('non-detailed logs', () => {
    beforeEach(() => {
      process.env.DETAILED_LOGS = 'false';
    });

    it('should not include context when DETAILED_LOGS is false', () => {
      const middleware = requestLogger();
      middleware(req as Request, res as Response, next);
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      expect(logEntry.context).to.be.undefined;
    });

    it('should not include detailed data when DETAILED_LOGS is false', () => {
      const middleware = requestLogger();
      middleware(req as Request, res as Response, next);
      onFinishCallback();
      
      const logEntry = outputStub.firstCall.args[0];
      expect(logEntry.data).to.be.undefined;
    });
  });
});
