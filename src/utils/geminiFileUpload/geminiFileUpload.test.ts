import { expect } from 'chai';
import { stub } from 'sinon';
import fs from 'fs';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { geminiFileUpload } from './geminiFileUpload';

describe('Utils - geminiFileUpload', () => {
  afterEach(() => {
    stub.restore && (stub as any).restore?.();
  });

  it('should upload and return success when file becomes ACTIVE', async () => {
    const writeStub = stub(fs, 'writeFileSync');
    const uploadStub = stub(GoogleAIFileManager.prototype, 'uploadFile').resolves({ file: { name: 'f1', mimeType: 'image/png', uri: 'uri', displayName: 'dn' } } as any);
    const getFileStub = stub(GoogleAIFileManager.prototype, 'getFile').resolves({ state: 'ACTIVE' } as any);

    const res = await geminiFileUpload(Buffer.from('abc'), 'image/png', 'a.png');
    expect(res.success).to.equal(true);
    expect((res as any).fileUri).to.equal('uri');
    // tmp cleanup is handled internally; no assertion needed here
    writeStub.restore();
    uploadStub.restore();
    getFileStub.restore();
  });

  it('should return failure when upload returns no file', async () => {
    stub(fs, 'writeFileSync');
    stub(GoogleAIFileManager.prototype, 'uploadFile').resolves({} as any);
    const getFileStub = stub(GoogleAIFileManager.prototype, 'getFile');

    const res = await geminiFileUpload(Buffer.from('abc'), 'image/png', 'a.png');
    expect(res.success).to.equal(false);
    getFileStub.restore();
  });

  it('should return failure when processing ends not ACTIVE', async () => {
    stub(fs, 'writeFileSync');
    stub(GoogleAIFileManager.prototype, 'uploadFile').resolves({ file: { name: 'f1', mimeType: 'image/png', uri: 'uri', displayName: 'dn' } } as any);
    const getFileStub = stub(GoogleAIFileManager.prototype, 'getFile')
      .onFirstCall().resolves({ state: 'FAILED' } as any);

    const res = await geminiFileUpload(Buffer.from('abc'), 'image/png', 'a.png');
    expect(res.success).to.equal(false);
    getFileStub.restore();
  });
});
