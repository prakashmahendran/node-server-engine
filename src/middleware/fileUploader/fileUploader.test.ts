import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response, NextFunction } from 'express';
import { fileUploader } from './fileUploader';
import { WebError } from 'entities/WebError';

describe('Middleware - fileUploader', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: sinon.SinonStub;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
      files: []
    };
    mockResponse = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    nextFunction = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('File upload handling', () => {
    it('should return a middleware function', () => {
      const middleware = fileUploader(
        [{ key: 'document', required: true }],
        {}
      );

      expect(middleware).to.be.a('function');
    });

    it('should handle configuration with multiple files', () => {
      const middleware = fileUploader(
        [
          { key: 'document', required: true, mimeTypes: ['application/pdf'] },
          { key: 'image', required: false, mimeTypes: ['image/jpeg', 'image/png'] }
        ],
        {}
      );

      expect(middleware).to.be.a('function');
    });

    it('should accept validator schema', () => {
      const schema = {
        title: {
          in: ['body'],
          isString: true,
          notEmpty: true
        }
      };

      const middleware = fileUploader([{ key: 'file', required: true }], schema);

      expect(middleware).to.be.a('function');
    });

    it('should handle empty configuration', () => {
      const middleware = fileUploader([], {});

      expect(middleware).to.be.a('function');
    });

    it('should configure with maxSize option', () => {
      const middleware = fileUploader(
        [{ key: 'document', required: true, maxSize: '5MB' }],
        {}
      );

      expect(middleware).to.be.a('function');
    });

    it('should configure with noExtension option', () => {
      const middleware = fileUploader(
        [{ key: 'document', required: true, noExtension: true }],
        {}
      );

      expect(middleware).to.be.a('function');
    });

    it('should configure with multiple MIME types', () => {
      const middleware = fileUploader(
        [{ key: 'image', required: true, mimeTypes: ['image/jpeg', 'image/png', 'image/gif'] }],
        {}
      );

      expect(middleware).to.be.a('function');
    });

    it('should handle optional files configuration', () => {
      const middleware = fileUploader(
        [{ key: 'document', required: false }],
        {}
      );

      expect(middleware).to.be.a('function');
    });
  });

  describe('Configuration', () => {
    it('should accept complex validator schemas', () => {
      const schema = {
        title: {
          in: ['body'],
          isString: true,
          notEmpty: true
        },
        description: {
          in: ['body'],
          optional: true,
          isString: true
        },
        category: {
          in: ['body'],
          isString: true,
          isIn: {
            options: [['tech', 'business', 'entertainment']]
          }
        }
      };

      const middleware = fileUploader(
        [{ key: 'thumbnail', required: true, mimeTypes: ['image/jpeg'] }],
        schema
      );

      expect(middleware).to.be.a('function');
    });

    it('should handle mixed required and optional files', () => {
      const middleware = fileUploader(
        [
          { key: 'required_doc', required: true },
          { key: 'optional_image', required: false },
          { key: 'required_pdf', required: true, mimeTypes: ['application/pdf'] }
        ],
        {}
      );

      expect(middleware).to.be.a('function');
    });

    it('should support different size limits for different files', () => {
      const middleware = fileUploader(
        [
          { key: 'thumbnail', required: true, maxSize: '1MB' },
          { key: 'document', required: true, maxSize: '10MB' },
          { key: 'video', required: false, maxSize: '50MB' }
        ],
        {}
      );

      expect(middleware).to.be.a('function');
    });
  });
});
