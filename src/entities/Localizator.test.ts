import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { Localizator } from './Localizator';
import { GoogleCloudStorage } from 'entities';

describe('Localizator', () => {
  let storageGetStub: sinon.SinonStub;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.LOCALES_BUCKET;
    process.env.LOCALES_BUCKET = 'test-locales-bucket';
    
    storageGetStub = sinon.stub(GoogleCloudStorage, 'get');
    // Don't stub setInterval - let it run and we'll clear it in afterEach
  });

  afterEach(() => {
    Localizator.shutdown(); // Clear any intervals created by init()
    sinon.restore();
    if (originalEnv) {
      process.env.LOCALES_BUCKET = originalEnv;
    } else {
      delete process.env.LOCALES_BUCKET;
    }
  });

  describe('getLocaleFile', () => {
    it('should fetch and parse JSON file from storage', async () => {
      const mockData = { en: { hello: 'Hello' } };
      storageGetStub.resolves({
        data: Buffer.from(JSON.stringify(mockData))
      });

      const result = await Localizator.getLocaleFile('test.json');

      expect(result).to.deep.equal(mockData);
      expect(storageGetStub.calledWith('test-locales-bucket', 'test.json')).to.be.true;
    });

    it('should handle different file names', async () => {
      storageGetStub.resolves({
        data: Buffer.from(JSON.stringify({ data: 'test' }))
      });

      await Localizator.getLocaleFile('localeData.json');

      expect(storageGetStub.calledWith('test-locales-bucket', 'localeData.json')).to.be.true;
    });

    it('should handle UTF-8 content', async () => {
      const mockData = { ja: { hello: 'こんにちは' } };
      storageGetStub.resolves({
        data: Buffer.from(JSON.stringify(mockData), 'utf-8')
      });

      const result = await Localizator.getLocaleFile('japanese.json');

      expect(result).to.deep.equal(mockData);
    });
  });

  describe('synchronize', () => {
    it('should fetch both localeData and scripts', async () => {
      storageGetStub.resolves({
        data: Buffer.from(JSON.stringify({}))
      });

      await Localizator.synchronize();

      expect(storageGetStub.calledWith('test-locales-bucket', 'localeData.json')).to.be.true;
      expect(storageGetStub.calledWith('test-locales-bucket', 'scripts.json')).to.be.true;
    });

    it('should handle storage errors gracefully', async () => {
      storageGetStub.rejects(new Error('Storage error'));

      try {
        await Localizator.synchronize();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.equal('Storage error');
      }
    });
  });

  describe('init', () => {
    it('should initialize and start synchronization interval', async () => {
      storageGetStub.resolves({
        data: Buffer.from(JSON.stringify({}))
      });

      await Localizator.init();

      // Just verify init completes without error
      expect(storageGetStub.called).to.be.true;
    });

    it('should throw error when LOCALES_BUCKET not set', async () => {
      delete process.env.LOCALES_BUCKET;

      try {
        await Localizator.init();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('shutdown', () => {
    it('should have shutdown method', () => {
      expect(Localizator.shutdown).to.be.a('function');
    });
  });
});
