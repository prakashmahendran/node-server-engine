import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import validator from 'validator';
import sinon from 'sinon';
import { Readable, PassThrough } from 'stream';
import { AWSS3 } from './AWSS3';
import { WebError } from 'entities/WebError';

describe('AWSS3', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    // Reset S3 client instance before each test
    AWSS3.s3Client = null;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('init', function () {
    it('should initialize with custom config', function () {
      const config = {
        region: 'us-east-1',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret'
      };

      AWSS3.init(config);

      expect(AWSS3.s3Client).to.not.be.null;
    });

    it('should initialize with environment variables', function () {
      process.env.AWS_REGION = 'us-west-2';
      process.env.AWS_ACCESS_KEY_ID = 'env-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'env-secret';

      AWSS3.init();

      expect(AWSS3.s3Client).to.not.be.null;

      delete process.env.AWS_REGION;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
    });

    it('should initialize with session token', function () {
      const config = {
        region: 'eu-west-1',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        sessionToken: 'test-session-token'
      };

      AWSS3.init(config);

      expect(AWSS3.s3Client).to.not.be.null;
    });

    it('should initialize with custom endpoint for S3-compatible services', function () {
      const config = {
        region: 'us-east-1',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        endpoint: 'http://localhost:9000',
        forcePathStyle: true
      };

      AWSS3.init(config);

      expect(AWSS3.s3Client).to.not.be.null;
    });
  });

  describe('getS3Client', function () {
    it('should return existing instance', function () {
      AWSS3.init({ region: 'us-east-1' });
      const instance1 = AWSS3.getS3Client();
      const instance2 = AWSS3.getS3Client();

      expect(instance1).to.equal(instance2);
    });

    it('should auto-initialize if not initialized', function () {
      const instance = AWSS3.getS3Client();

      expect(instance).to.not.be.null;
      expect(AWSS3.s3Client).to.not.be.null;
    });
  });

  describe('generateFileDestination', function () {
    it('should generate path info for a regular file', function () {
      const path = AWSS3.generateFileDestination();
      // eslint-disable-next-line import/no-named-as-default-member
      expect(validator.isUUID(path)).to.be.true;
    });

    it('should add a path to a file', function () {
      const directory = `${faker.lorem.word()}`;
      const path = AWSS3.generateFileDestination({
        directory
      });

      expect(path.startsWith(directory)).to.be.true;
    });

    it('should add a path to a file but remove appended slash', function () {
      const directory = `${faker.lorem.word()}`;
      const path = AWSS3.generateFileDestination({
        directory: '/' + directory
      });
      expect(path.startsWith(directory)).to.be.true;
    });

    it('should not append an extension if specified', function () {
      const directory = `${faker.lorem.word()}`;
      const mimeType = 'image/png';
      const path = AWSS3.generateFileDestination({
        directory,
        mime: mimeType,
        noExtension: true
      });

      const resultExt = path.split('.')[1];

      expect(path.startsWith(directory)).to.be.true;
      expect(resultExt).to.be.undefined;
    });

    it('should append an extension if specified', function () {
      const directory = `${faker.lorem.word()}`;
      const mimeType = 'image/png';
      const path = AWSS3.generateFileDestination({
        directory,
        mime: mimeType
      });

      const resultExt = path.split('.')[1];

      expect(path.startsWith(directory)).to.be.true;
      expect(resultExt).to.equal('png');
    });

    it('should handle root directory', function () {
      const path = AWSS3.generateFileDestination({
        directory: '/'
      });
      // eslint-disable-next-line import/no-named-as-default-member
      expect(validator.isUUID(path)).to.be.true;
      expect(path).to.not.include('/');
    });

    it('should handle various mime types', function () {
      const mimeTypes = [
        { mime: 'image/jpeg', ext: 'jpeg' },
        { mime: 'application/pdf', ext: 'pdf' },
        { mime: 'video/mp4', ext: 'mp4' }
      ];

      mimeTypes.forEach(({ mime, ext }) => {
        const path = AWSS3.generateFileDestination({ mime });
        expect(path.endsWith(`.${ext}`)).to.be.true;
      });
    });
  });

  describe('upload', function () {
    beforeEach(function () {
      AWSS3.init({ region: 'us-east-1' });
    });

    it('should upload file successfully with random destination', async function () {
      const testBucket = 'test-bucket';
      const testData = Buffer.from('test file content');
      const readStream = Readable.from([testData]);

      const sendStub = sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        ETag: '"test-etag"',
        VersionId: 'test-version'
      });

      const result = await AWSS3.upload(readStream, testBucket);

      expect(sendStub.calledOnce).to.be.true;
      expect(result).to.have.property('Bucket', testBucket);
      expect(result).to.have.property('ETag', '"test-etag"');
      expect(result).to.have.property('Key');
      // eslint-disable-next-line import/no-named-as-default-member
      expect(validator.isUUID(result.Key)).to.be.true;
    });

    it('should upload file with specified fileName', async function () {
      const testBucket = 'test-bucket';
      const fileName = 'my-file.txt';
      const testData = Buffer.from('test content');
      const readStream = Readable.from([testData]);

      const sendStub = sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        ETag: '"test-etag"'
      });

      const result = await AWSS3.upload(readStream, testBucket, { fileName });

      expect(sendStub.calledOnce).to.be.true;
      expect(result.Key).to.equal(fileName);
    });

    it('should upload file with directory path', async function () {
      const testBucket = 'test-bucket';
      const fileName = 'my-file.txt';
      const directory = 'uploads/images';
      const testData = Buffer.from('test content');
      const readStream = Readable.from([testData]);

      const sendStub = sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        ETag: '"test-etag"'
      });

      const result = await AWSS3.upload(readStream, testBucket, { fileName, directory });

      expect(sendStub.calledOnce).to.be.true;
      expect(result.Key).to.equal(`${directory}/${fileName}`);
    });

    it('should upload file with metadata', async function () {
      const testBucket = 'test-bucket';
      const testData = Buffer.from('test content');
      const readStream = Readable.from([testData]);
      const metadata = { userId: '123', uploadedBy: 'user@example.com' };

      const sendStub = sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        ETag: '"test-etag"'
      });

      await AWSS3.upload(readStream, testBucket, {}, {}, metadata);

      expect(sendStub.calledOnce).to.be.true;
      const command = sendStub.firstCall.args[0];
      expect(command.input.Metadata).to.deep.equal(metadata);
    });

    it('should reject file upload when size exceeds maxSize', async function () {
      const testBucket = 'test-bucket';
      const maxSize = '10B'; // 10 bytes
      const testData = Buffer.from('this is more than 10 bytes of content');
      const readStream = Readable.from([testData]);

      sandbox.stub(AWSS3.s3Client!, 'send').resolves({});

      try {
        await AWSS3.upload(readStream, testBucket, {}, { maxSize });
        expect.fail('Should have thrown WebError');
      } catch (error) {
        expect(error).to.be.instanceOf(WebError);
        expect((error as WebError).statusCode).to.equal(413);
        expect((error as WebError).errorCode).to.equal('file-too-large');
      }
    });

    it('should set content type from mime option', async function () {
      const testBucket = 'test-bucket';
      const testData = Buffer.from('test content');
      const readStream = Readable.from([testData]);

      const sendStub = sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        ETag: '"test-etag"'
      });

      await AWSS3.upload(readStream, testBucket, { mime: 'image/jpeg' });

      const command = sendStub.firstCall.args[0];
      expect(command.input.ContentType).to.equal('image/jpeg');
    });
  });

  describe('get', function () {
    beforeEach(function () {
      AWSS3.init({ region: 'us-east-1' });
    });

    it('should download file and return data with metadata', async function () {
      const testBucket = 'test-bucket';
      const testKey = 'path/to/file.txt';
      const testData = Buffer.from('file content');

      const mockStream = Readable.from([testData]);

      sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        Body: mockStream,
        ContentType: 'text/plain',
        ContentLength: testData.length,
        ETag: '"test-etag"',
        LastModified: new Date()
      });

      const result = await AWSS3.get(testBucket, testKey);

      expect(result.data.toString()).to.equal('file content');
      expect(result.metadata.ContentType).to.equal('text/plain');
      expect(result.metadata.ContentLength).to.equal(testData.length);
    });

    it('should handle download errors', async function () {
      const testBucket = 'test-bucket';
      const testKey = 'nonexistent/file.txt';

      sandbox.stub(AWSS3.s3Client!, 'send').rejects(new Error('NoSuchKey'));

      try {
        await AWSS3.get(testBucket, testKey);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('NoSuchKey');
      }
    });
  });

  describe('download', function () {
    beforeEach(function () {
      AWSS3.init({ region: 'us-east-1' });
    });

    it('should return read stream with metadata', async function () {
      const testBucket = 'test-bucket';
      const testKey = 'path/to/file.txt';
      const mockStream = new PassThrough();

      sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        Body: mockStream,
        ContentType: 'text/plain',
        ContentLength: 100,
        ETag: '"test-etag"'
      });

      const result = await AWSS3.download(testBucket, testKey);

      expect(result.stream).to.equal(mockStream);
      expect(result.metadata.ContentType).to.equal('text/plain');
      expect(result.metadata.ContentLength).to.equal(100);
    });
  });

  describe('getFileStream', function () {
    beforeEach(function () {
      AWSS3.init({ region: 'us-east-1' });
    });

    it('should return read stream for file', async function () {
      const testBucket = 'test-bucket';
      const testKey = 'path/to/file.txt';
      const mockStream = new PassThrough();

      sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        Body: mockStream
      });

      const stream = await AWSS3.getFileStream(testBucket, testKey);

      expect(stream).to.equal(mockStream);
    });
  });

  describe('getMetadata', function () {
    beforeEach(function () {
      AWSS3.init({ region: 'us-east-1' });
    });

    it('should return file metadata', async function () {
      const testBucket = 'test-bucket';
      const testKey = 'path/to/file.txt';

      sandbox.stub(AWSS3.s3Client!, 'send').resolves({
        ContentType: 'text/plain',
        ContentLength: 1024,
        ETag: '"test-etag"',
        LastModified: new Date(),
        Metadata: { userId: '123' }
      });

      const metadata = await AWSS3.getMetadata(testBucket, testKey);

      expect(metadata.ContentType).to.equal('text/plain');
      expect(metadata.ContentLength).to.equal(1024);
      expect(metadata.Metadata).to.deep.equal({ userId: '123' });
    });
  });

  describe('delete', function () {
    beforeEach(function () {
      AWSS3.init({ region: 'us-east-1' });
    });

    it('should delete file successfully', async function () {
      const testBucket = 'test-bucket';
      const testKey = 'path/to/file.txt';

      const sendStub = sandbox.stub(AWSS3.s3Client!, 'send').resolves({});

      await AWSS3.delete(testBucket, testKey);

      expect(sendStub.calledOnce).to.be.true;
      const command = sendStub.firstCall.args[0];
      expect(command.input.Bucket).to.equal(testBucket);
      expect(command.input.Key).to.equal(testKey);
    });

    it('should handle delete errors', async function () {
      const testBucket = 'test-bucket';
      const testKey = 'path/to/file.txt';

      sandbox.stub(AWSS3.s3Client!, 'send').rejects(new Error('Delete failed'));

      try {
        await AWSS3.delete(testBucket, testKey);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('Delete failed');
      }
    });
  });
});
