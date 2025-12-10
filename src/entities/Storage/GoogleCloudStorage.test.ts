import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import validator from 'validator';
import sinon from 'sinon';
import { Readable, PassThrough } from 'stream';
import { GoogleCloudStorage } from './GoogleCloudStorage';
import { WebError } from 'entities/WebError';

describe('GoogleCloudStorage', function () {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    // Reset cloudStorage instance before each test
    GoogleCloudStorage.cloudStorage = null;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('init', function () {
    it('should initialize with custom config', function () {
      const config = {
        projectId: 'test-project',
        keyFilename: '/path/to/key.json'
      };

      GoogleCloudStorage.init(config);

      expect(GoogleCloudStorage.cloudStorage).to.not.be.null;
    });

    it('should initialize with environment variables', function () {
      process.env.GC_PROJECT = 'env-project';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/env/key.json';

      GoogleCloudStorage.init();

      expect(GoogleCloudStorage.cloudStorage).to.not.be.null;

      delete process.env.GC_PROJECT;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    });

    it('should initialize with credentials object', function () {
      const config = {
        projectId: 'test-project',
        credentials: {
          client_email: 'test@example.com',
          private_key: 'private-key'
        }
      };

      GoogleCloudStorage.init(config);

      expect(GoogleCloudStorage.cloudStorage).to.not.be.null;
    });

    it('should initialize with custom API endpoint', function () {
      const config = {
        projectId: 'test-project',
        apiEndpoint: 'http://localhost:9000'
      };

      GoogleCloudStorage.init(config);

      expect(GoogleCloudStorage.cloudStorage).to.not.be.null;
    });
  });

  describe('getStorageInstance', function () {
    it('should return existing instance', function () {
      GoogleCloudStorage.init({ projectId: 'test-project' });
      const instance1 = GoogleCloudStorage.getStorageInstance();
      const instance2 = GoogleCloudStorage.getStorageInstance();

      expect(instance1).to.equal(instance2);
    });

    it('should auto-initialize if not initialized', function () {
      const instance = GoogleCloudStorage.getStorageInstance();

      expect(instance).to.not.be.null;
      expect(GoogleCloudStorage.cloudStorage).to.not.be.null;
    });
  });

  describe('generateFileDestination', function () {
    it('should generate path info for a regular file', function () {
      const path = GoogleCloudStorage.generateFileDestination();
      // eslint-disable-next-line import/no-named-as-default-member
      expect(validator.isUUID(path)).to.be.true;
    });

    it('should add a path to a file', function () {
      const directory = `${faker.lorem.word()}`;
      const path = GoogleCloudStorage.generateFileDestination({
        directory
      });

      expect(path.startsWith(directory)).to.be.true;
    });

    it('should add a path to a file but remove appended slash', function () {
      const directory = `${faker.lorem.word()}`;
      const path = GoogleCloudStorage.generateFileDestination({
        directory: '/' + directory
      });
      expect(path.startsWith(directory)).to.be.true;
    });

    it('should not append an extension if specified', function () {
      const directory = `${faker.lorem.word()}`;
      const mimeType = 'image/png';
      const path = GoogleCloudStorage.generateFileDestination({
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
      const path = GoogleCloudStorage.generateFileDestination({
        directory,
        mime: mimeType
      });

      const resultExt = path.split('.')[1];

      expect(path.startsWith(directory)).to.be.true;
      expect(resultExt).to.equal('png');
    });

    it('should handle root directory', function () {
      const path = GoogleCloudStorage.generateFileDestination({
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
        const path = GoogleCloudStorage.generateFileDestination({ mime });
        expect(path.endsWith(`.${ext}`)).to.be.true;
      });
    });
  });

  describe('upload', function () {
    beforeEach(function () {
      GoogleCloudStorage.init({ projectId: 'test-project' });
    });

    it('should upload file successfully with random destination', async function () {
      const testBucket = 'test-bucket';
      const testData = Buffer.from('test file content');
      const readStream = Readable.from([testData]);

      const mockFile = {
        exists: sandbox.stub().resolves([false]),
        createWriteStream: sandbox.stub().returns(new PassThrough()),
        getMetadata: sandbox.stub().resolves([
          {
            id: 'test-file-id',
            name: 'test-file',
            bucket: testBucket,
            size: testData.length
          }
        ])
      };

      const bucketStub = sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      const result = await GoogleCloudStorage.upload(readStream, testBucket);

      expect(bucketStub.calledWith(testBucket)).to.be.true;
      expect(result).to.have.property('id', 'test-file-id');
      expect(result).to.have.property('bucket', testBucket);
    });

    it('should upload file with specified fileName', async function () {
      const testBucket = 'test-bucket';
      const fileName = 'my-file.txt';
      const testData = Buffer.from('test content');
      const readStream = Readable.from([testData]);

      const mockFile = {
        createWriteStream: sandbox.stub().returns(new PassThrough()),
        getMetadata: sandbox.stub().resolves([
          {
            id: 'test-file-id',
            name: fileName,
            bucket: testBucket
          }
        ])
      };

      const fileStub = sandbox.stub().returns(mockFile);
      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: fileStub
      } as any);

      await GoogleCloudStorage.upload(readStream, testBucket, { fileName });

      // When no directory is specified, it defaults to '/', so path will be just the fileName
      expect(fileStub.calledWith(sinon.match(fileName))).to.be.true;
    });

    it('should upload file with directory path', async function () {
      const testBucket = 'test-bucket';
      const fileName = 'my-file.txt';
      const directory = 'uploads/images';
      const testData = Buffer.from('test content');
      const readStream = Readable.from([testData]);

      const mockFile = {
        createWriteStream: sandbox.stub().returns(new PassThrough()),
        getMetadata: sandbox.stub().resolves([
          {
            id: 'test-file-id',
            name: `${directory}/${fileName}`,
            bucket: testBucket
          }
        ])
      };

      const fileStub = sandbox.stub().returns(mockFile);
      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: fileStub
      } as any);

      await GoogleCloudStorage.upload(readStream, testBucket, { fileName, directory });

      expect(fileStub.calledWith(`${directory}/${fileName}`)).to.be.true;
    });

    it('should reject file upload when size exceeds maxSize', async function () {
      const testBucket = 'test-bucket';
      const maxSize = '10B'; // 10 bytes
      const testData = Buffer.from('this is more than 10 bytes of content');
      const readStream = Readable.from([testData]);

      const mockFile = {
        exists: sandbox.stub().resolves([false]),
        createWriteStream: sandbox.stub().returns(new PassThrough())
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      try {
        await GoogleCloudStorage.upload(readStream, testBucket, {}, {}, { maxSize });
        expect.fail('Should have thrown WebError');
      } catch (error) {
        expect(error).to.be.instanceOf(WebError);
        expect((error as WebError).statusCode).to.equal(413);
        expect((error as WebError).errorCode).to.equal('file-too-large');
      }
    });

    it('should handle read stream errors', async function () {
      const testBucket = 'test-bucket';
      const errorMessage = 'Read stream error';
      const readStream = new Readable({
        read() {
          this.emit('error', new Error(errorMessage));
        }
      });

      const mockFile = {
        exists: sandbox.stub().resolves([false]),
        createWriteStream: sandbox.stub().returns(new PassThrough())
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      try {
        await GoogleCloudStorage.upload(readStream, testBucket);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.equal(errorMessage);
      }
    });

    it('should retry destination generation if file exists', async function () {
      const testBucket = 'test-bucket';
      const testData = Buffer.from('test content');
      const readStream = Readable.from([testData]);

      const mockFile = {
        exists: sandbox.stub(),
        createWriteStream: sandbox.stub().returns(new PassThrough()),
        getMetadata: sandbox.stub().resolves([
          {
            id: 'test-file-id',
            name: 'test-file',
            bucket: testBucket
          }
        ])
      };

      // First call returns true (exists), second returns false
      mockFile.exists.onFirstCall().resolves([true]);
      mockFile.exists.onSecondCall().resolves([false]);

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      await GoogleCloudStorage.upload(readStream, testBucket);

      expect(mockFile.exists.callCount).to.equal(2);
    });
  });

  describe('get', function () {
    beforeEach(function () {
      GoogleCloudStorage.init({ projectId: 'test-project' });
    });

    it('should download file and return data with metadata', async function () {
      const testBucket = 'test-bucket';
      const testPath = 'path/to/file.txt';
      const testData = Buffer.from('file content');
      const testMetadata = {
        id: 'file-id',
        name: testPath,
        bucket: testBucket,
        size: testData.length
      };

      const mockFile = {
        getMetadata: sandbox.stub().resolves([testMetadata]),
        download: sandbox.stub().resolves([testData])
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      const result = await GoogleCloudStorage.get(testBucket, testPath);

      expect(result.data).to.deep.equal(testData);
      expect(result.metadata).to.deep.equal(testMetadata);
    });

    it('should handle file not found error', async function () {
      const testBucket = 'test-bucket';
      const testPath = 'nonexistent/file.txt';

      const mockFile = {
        getMetadata: sandbox.stub().rejects(new Error('File not found')),
        download: sandbox.stub().rejects(new Error('File not found'))
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      try {
        await GoogleCloudStorage.get(testBucket, testPath);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('File not found');
      }
    });
  });

  describe('download', function () {
    beforeEach(function () {
      GoogleCloudStorage.init({ projectId: 'test-project' });
    });

    it('should return read stream with metadata', async function () {
      const testBucket = 'test-bucket';
      const testPath = 'path/to/file.txt';
      const testMetadata = {
        id: 'file-id',
        name: testPath,
        bucket: testBucket
      };
      const mockStream = new PassThrough();

      const mockFile = {
        getMetadata: sandbox.stub().resolves([testMetadata]),
        createReadStream: sandbox.stub().returns(mockStream)
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      const result = await GoogleCloudStorage.download(testBucket, testPath);

      expect(result.stream).to.equal(mockStream);
      expect(result.metadata).to.deep.equal(testMetadata);
    });

    it('should handle metadata fetch error', async function () {
      const testBucket = 'test-bucket';
      const testPath = 'path/to/file.txt';

      const mockFile = {
        getMetadata: sandbox.stub().rejects(new Error('Metadata error')),
        createReadStream: sandbox.stub()
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      try {
        await GoogleCloudStorage.download(testBucket, testPath);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('Metadata error');
      }
    });
  });

  describe('getFileStream', function () {
    beforeEach(function () {
      GoogleCloudStorage.init({ projectId: 'test-project' });
    });

    it('should return read stream for file', function () {
      const testBucket = 'test-bucket';
      const testPath = 'path/to/file.txt';
      const mockStream = new PassThrough();

      const mockFile = {
        createReadStream: sandbox.stub().returns(mockStream)
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      const stream = GoogleCloudStorage.getFileStream(testBucket, testPath);

      expect(stream).to.equal(mockStream);
      expect(mockFile.createReadStream.calledOnce).to.be.true;
    });

    it('should handle different file paths', function () {
      const testBucket = 'test-bucket';
      const paths = ['file.txt', 'dir/file.txt', 'deep/nested/path/file.pdf'];

      paths.forEach((testPath) => {
        sandbox.restore();
        GoogleCloudStorage.cloudStorage = null;
        GoogleCloudStorage.init({ projectId: 'test-project' });
        sandbox = sinon.createSandbox();

        const mockStream = new PassThrough();
        const fileStub = sandbox.stub().returns({
          createReadStream: sandbox.stub().returns(mockStream)
        });

        sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
          file: fileStub
        } as any);

        GoogleCloudStorage.getFileStream(testBucket, testPath);

        expect(fileStub.calledWith(testPath)).to.be.true;
      });
    });
  });

  describe('delete', function () {
    beforeEach(function () {
      GoogleCloudStorage.init({ projectId: 'test-project' });
    });

    it('should delete file successfully', async function () {
      const testBucket = 'test-bucket';
      const testPath = 'path/to/file.txt';

      const mockFile = {
        delete: sandbox.stub().resolves()
      };

      const fileStub = sandbox.stub().returns(mockFile);
      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: fileStub
      } as any);

      await GoogleCloudStorage.delete(testBucket, testPath);

      expect(fileStub.calledWith(testPath)).to.be.true;
      expect(mockFile.delete.calledOnce).to.be.true;
    });

    it('should handle delete errors', async function () {
      const testBucket = 'test-bucket';
      const testPath = 'path/to/file.txt';

      const mockFile = {
        delete: sandbox.stub().rejects(new Error('Delete failed'))
      };

      sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
        file: sandbox.stub().returns(mockFile)
      } as any);

      try {
        await GoogleCloudStorage.delete(testBucket, testPath);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('Delete failed');
      }
    });

    it('should delete multiple files from different paths', async function () {
      const testBucket = 'test-bucket';
      const paths = ['file1.txt', 'dir/file2.txt', 'deep/file3.pdf'];

      for (const testPath of paths) {
        sandbox.restore();
        GoogleCloudStorage.cloudStorage = null;
        GoogleCloudStorage.init({ projectId: 'test-project' });
        sandbox = sinon.createSandbox();

        const mockFile = {
          delete: sandbox.stub().resolves()
        };

        const fileStub = sandbox.stub().returns(mockFile);
        sandbox.stub(GoogleCloudStorage.cloudStorage!, 'bucket').returns({
          file: fileStub
        } as any);

        await GoogleCloudStorage.delete(testBucket, testPath);

        expect(fileStub.calledWith(testPath)).to.be.true;
        expect(mockFile.delete.calledOnce).to.be.true;
      }
    });
  });
});
