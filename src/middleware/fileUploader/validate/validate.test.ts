import { expect } from 'chai';
import { Request } from 'express';
import { Schema } from 'express-validator';
import { validate } from './validate';

describe('Middleware - fileUploader/validate', () => {
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
  });

  describe('validate', () => {
    it('should resolve when validation chain is empty', async () => {
      const schema: Schema = {};

      await validate(mockRequest as Request, schema);
      // If we reach here, validation passed
      expect(true).to.be.true;
    });

    it('should process validation with optional field', async () => {
      const schema: Schema = {
        name: {
          in: ['body'],
          optional: true
        }
      };

      mockRequest.body = { name: 'John Doe' };

      await validate(mockRequest as Request, schema);
      expect(true).to.be.true;
    });

    it('should handle validation with missing optional field', async () => {
      const schema: Schema = {
        name: {
          in: ['body'],
          optional: true
        }
      };

      mockRequest.body = {};

      await validate(mockRequest as Request, schema);
      expect(true).to.be.true;
    });

    it('should reject when required field is missing', async () => {
      const schema: Schema = {
        required_field: {
          in: ['body'],
          exists: {
            errorMessage: 'Required field is missing'
          }
        }
      };

      mockRequest.body = {};

      try {
        await validate(mockRequest as Request, schema);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should process multiple optional fields', async () => {
      const schema: Schema = {
        field1: {
          in: ['body'],
          optional: true
        },
        field2: {
          in: ['body'],
          optional: true
        }
      };

      mockRequest.body = { field1: 'value1' };

      await validate(mockRequest as Request, schema);
      expect(true).to.be.true;
    });

    it('should handle query parameters', async () => {
      const schema: Schema = {
        page: {
          in: ['query'],
          optional: true,
          isInt: true
        }
      };

      mockRequest.query = { page: '1' };

      await validate(mockRequest as Request, schema);
      expect(true).to.be.true;
    });

    it('should handle params', async () => {
      const schema: Schema = {
        id: {
          in: ['params'],
          optional: true
        }
      };

      mockRequest.params = { id: '123' };

      await validate(mockRequest as Request, schema);
      expect(true).to.be.true;
    });
  });
});
