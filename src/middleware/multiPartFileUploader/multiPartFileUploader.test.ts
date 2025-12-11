import { expect } from 'chai';
import sinon from 'sinon';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import mockRequire from 'mock-require';
import type { Request, Response, NextFunction } from 'express';

describe('Middleware - multiPartFileUploader', () => {
  const savedEnv = { ...process.env };
  let tmpRoot: string;

  // Minimal multer mock: default export is a function with .memoryStorage()
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
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mpu-'));
    process.env.FILE_STORAGE_FOLDER = tmpRoot;
    // Provide our multer stub
    mockRequire('multer', multerDefault as any);
    // Re-require module under test with env + stubbed multer
    delete (require as any).cache[(require as any).resolve('./multiPartFileUploader')];
  });

  afterEach(() => {
    mockRequire.stopAll();
    process.env = { ...savedEnv };
    sinon.restore();
  });

  function buildReq(body: any, mockFile?: any): any {
    const req: Partial<Request> & { __mockFile?: any; multipartFile?: any } = {
      body
    } as any;
    if (mockFile) (req as any).__mockFile = mockFile;
    return req as any;
  }

  function buildRes(): Partial<Response> {
    return {} as any;
  }

  it('should return 400 on missing required fields', async () => {
    const { multiPartFileUploader } = require('./multiPartFileUploader');
    const validator = {} as any; // empty schema -> no validation errors
    const middleware = multiPartFileUploader({}, validator);

    const req = buildReq({
      // missing filename/uniqueID/totalChunks
      chunkIndex: 0
    },
    { buffer: Buffer.from('data'), size: 4, fieldname: 'file', originalname: 'a.txt', mimetype: 'text/plain' });

    const nextSpy = sinon.spy();
    const err: any = await new Promise((resolve) =>
      middleware(
        req,
        buildRes() as Response,
        ((e?: any) => {
          nextSpy(e);
          resolve(e);
        }) as unknown as NextFunction
      )
    );
    expect(nextSpy.calledOnce).to.be.true;
    expect(err).to.have.property('statusCode', 400);
    expect(err).to.have.property('errorCode', 'missing-field');
  });

  it('should enforce chunk size and return chunk-too-large', async () => {
    const { multiPartFileUploader } = require('./multiPartFileUploader');
    const validator = {} as any;
    const middleware = multiPartFileUploader({ maxSize: '1b' }, validator);

    const req = buildReq({ filename: 'b.txt', totalChunks: '2', chunkIndex: 0, uniqueID: 'u1' },
      { buffer: Buffer.from('big'), size: 10, fieldname: 'file', originalname: 'b.txt', mimetype: 'text/plain' });

    const nextSpy = sinon.spy();
    const err: any = await new Promise((resolve) =>
      middleware(
        req,
        buildRes() as Response,
        ((e?: any) => {
          nextSpy(e);
          resolve(e);
        }) as unknown as NextFunction
      )
    );
    expect(err).to.have.property('statusCode', 400);
    expect(err).to.have.property('errorCode', 'chunk-too-large');
  });

  it('should merge chunks when last chunk arrives and mark as completed', async () => {
    const { multiPartFileUploader } = require('./multiPartFileUploader');
    const validator = {} as any;
    const middleware = multiPartFileUploader({}, validator);

    // First chunk (pending)
    const req1 = buildReq({ filename: 'c.txt', totalChunks: '2', chunkIndex: 0, uniqueID: 'u2' },
      { buffer: Buffer.from('A'), size: 1, fieldname: 'file', originalname: 'c.txt', mimetype: 'text/plain' });
    const nextSpy1 = sinon.spy();
    await new Promise((resolve) =>
      middleware(
        req1,
        buildRes() as Response,
        ((e?: any) => {
          nextSpy1(e);
          resolve(null);
        }) as unknown as NextFunction
      )
    );
    expect(nextSpy1.calledOnce).to.be.true;
    expect(req1.multipartFile).to.deep.include({ isPending: true, originalname: 'c.txt', uniqueID: 'u2' });

    // Second chunk (complete)
    const req2 = buildReq({ filename: 'c.txt', totalChunks: '2', chunkIndex: 1, uniqueID: 'u2' },
      { buffer: Buffer.from('B'), size: 1, fieldname: 'file', originalname: 'c.txt', mimetype: 'text/plain' });
    const nextSpy2 = sinon.spy();
    await new Promise((resolve) =>
      middleware(
        req2,
        buildRes() as Response,
        ((e?: any) => {
          nextSpy2(e);
          resolve(null);
        }) as unknown as NextFunction
      )
    );
    expect(nextSpy2.calledOnce).to.be.true;
    expect(req2.multipartFile).to.deep.include({ isPending: false, originalname: 'c.txt', uniqueID: 'u2' });
    expect(req2.multipartFile.filePath).to.be.a('string');
    const merged = await fs.readFile(req2.multipartFile.filePath, 'utf-8');
    expect(merged).to.equal('AB');
  });
});
