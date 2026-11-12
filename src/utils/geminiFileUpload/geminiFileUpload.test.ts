import { expect } from 'chai';
import sinon from 'sinon';
import { FileState } from '@google/genai';
import { geminiFileUpload, getGeminiClient } from './geminiFileUpload';

describe('Utils - geminiFileUpload', () => {
  const uploaded = {
    name: 'files/f1',
    mimeType: 'image/png',
    uri: 'uri',
    displayName: 'a.png'
  };

  afterEach(() => {
    sinon.restore();
  });

  it('should upload and return success when file becomes ACTIVE', async () => {
    const { files } = getGeminiClient();
    const uploadStub = sinon.stub(files, 'upload').resolves(uploaded as any);
    const getStub = sinon
      .stub(files, 'get')
      .resolves({ ...uploaded, state: FileState.ACTIVE } as any);

    const res = await geminiFileUpload(Buffer.from('abc'), 'image/png', 'a.png');

    expect(res.success).to.equal(true);
    expect((res as any).fileUri).to.equal('uri');
    expect((res as any).originalname).to.equal('files/f1');
    expect(uploadStub.firstCall.args[0].config).to.deep.equal({
      mimeType: 'image/png',
      displayName: 'a.png'
    });
    expect(getStub.firstCall.args[0]).to.deep.equal({ name: 'files/f1' });
  });

  it('should wait while the file is PROCESSING', async () => {
    const { files } = getGeminiClient();
    sinon.stub(files, 'upload').resolves(uploaded as any);
    const getStub = sinon.stub(files, 'get');
    getStub.onFirstCall().resolves({ ...uploaded, state: FileState.PROCESSING } as any);
    getStub.onSecondCall().resolves({ ...uploaded, state: FileState.ACTIVE } as any);

    const res = await geminiFileUpload(Buffer.from('abc'), 'image/png', 'a.png', 1);

    expect(res.success).to.equal(true);
    expect(getStub.callCount).to.equal(2);
  });

  it('should return failure when upload returns no file', async () => {
    const { files } = getGeminiClient();
    sinon.stub(files, 'upload').resolves({} as any);
    const getStub = sinon.stub(files, 'get');

    const res = await geminiFileUpload(Buffer.from('abc'), 'image/png', 'a.png');

    expect(res.success).to.equal(false);
    expect(getStub.called).to.equal(false);
  });

  it('should return failure when processing ends not ACTIVE', async () => {
    const { files } = getGeminiClient();
    sinon.stub(files, 'upload').resolves(uploaded as any);
    sinon.stub(files, 'get').resolves({ ...uploaded, state: FileState.FAILED } as any);

    const res = await geminiFileUpload(Buffer.from('abc'), 'image/png', 'a.png');

    expect(res.success).to.equal(false);
  });
});
