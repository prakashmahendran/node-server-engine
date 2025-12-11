import { expect } from 'chai';
import sinon from 'sinon';
import type { Request, Response, NextFunction } from 'express';
import mockRequire from 'mock-require';

describe('Middleware - geminiFileUploader', () => {
  const savedEnv = { ...process.env };
  let geminiFileUploadStub: sinon.SinonStub;
  
  const multerDefault = Object.assign(
    (_opts?: any) => ({
      single: () => (req: any, _res: Response, cb: Function) => {
        req.file = (req as any).__mockFile;
        cb();
      }
    }),
    { memoryStorage: () => ({}) }
  );

  beforeEach(() => {
    process.env = { ...savedEnv };
    process.env.GOOGLE_AI_KEY = 'test-key';
    
    geminiFileUploadStub = sinon.stub().resolves({ success: true, file: { name: 'uploaded.txt' } });
    
    mockRequire('multer', multerDefault as any);
    mockRequire('utils', {
      reportError: sinon.stub(),
      geminiFileUpload: geminiFileUploadStub,
      reportDebug: sinon.stub()
    });
    mockRequire('utils/checkEnvironment', {
      checkEnvironment: () => {}
    });
    mockRequire('utils/envAssert', {
      envAssert: { isString: () => ({}) }
    });
    
    delete (require as any).cache[(require as any).resolve('./geminiFileUploader')];
  });

  afterEach(() => {
    mockRequire.stopAll();
    sinon.restore();
    process.env = { ...savedEnv };
  });

  function buildReq(mockFile?: any): any {
    const req: Partial<Request> & { __mockFile?: any; body: any } = {
      body: {}
    } as any;
    if (mockFile) (req as any).__mockFile = mockFile;
    return req as any;
  }

  function buildRes(): Partial<Response> {
    return {} as any;
  }

  it('should upload file successfully and attach response to req.body', async () => {
    const { geminiFileUploader } = require('./geminiFileUploader');
    
    const req = buildReq({ 
      buffer: Buffer.from('content'), 
      mimetype: 'text/plain', 
      originalname: 'test.txt' 
    });
    
    const nextSpy = sinon.spy();
    await new Promise((resolve) =>
      geminiFileUploader(req, buildRes() as Response, ((e?: any) => {
        nextSpy(e);
        resolve(null);
      }) as unknown as NextFunction)
    );
    
    expect(nextSpy.calledOnce).to.be.true;
    expect(nextSpy.firstCall.args[0]).to.be.undefined;
    expect(req.body.file).to.deep.equal({ success: true, file: { name: 'uploaded.txt' } });
  });

  it('should call next with error when no file uploaded', async () => {
    const { geminiFileUploader } = require('./geminiFileUploader');
    
    const req = buildReq(); // No mock file
    
    const nextSpy = sinon.spy();
    await new Promise((resolve) =>
      geminiFileUploader(req, buildRes() as Response, ((e?: any) => {
        nextSpy(e);
        resolve(null);
      }) as unknown as NextFunction)
    );
    
    expect(nextSpy.calledOnce).to.be.true;
    expect(nextSpy.firstCall.args[0]).to.equal('No file uploaded');
  });

  it('should handle multer errors', async () => {
    const errorMulter = Object.assign(
      (_opts?: any) => ({
        single: () => (_req: any, _res: Response, cb: Function) => {
          cb(new Error('Multer error'));
        }
      }),
      { memoryStorage: () => ({}) }
    );
    
    mockRequire.stop('multer');
    mockRequire('multer', errorMulter as any);
    delete (require as any).cache[(require as any).resolve('./geminiFileUploader')];
    
    const { geminiFileUploader } = require('./geminiFileUploader');
    const req = buildReq();
    const nextSpy = sinon.spy();
    
    await new Promise((resolve) =>
      geminiFileUploader(req, buildRes() as Response, ((e?: any) => {
        nextSpy(e);
        resolve(null);
      }) as unknown as NextFunction)
    );
    
    expect(nextSpy.calledOnce).to.be.true;
    expect(nextSpy.firstCall.args[0]).to.be.instanceOf(Error);
  });
});
