import { expect } from 'chai';
import sinon from 'sinon';
import { Request, Response, NextFunction } from 'express';
import { checkPermission } from './checkPermission';

describe('Middleware - checkPermission', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: sinon.SinonStub;

  beforeEach(() => {
    mockRequest = {
      user: undefined
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

  describe('Single permission check', () => {
    it('should call next() when user has the required permission', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['read', 'write', 'delete']
      };

      const middleware = checkPermission('read');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction.calledOnce).to.be.true;
      expect(mockResponse.status).to.not.have.been.called;
    });

    it('should return 403 when user lacks the required permission', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['read', 'write']
      };

      const middleware = checkPermission('delete');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).to.have.been.calledWith(403);
      expect(mockResponse.json).to.have.been.calledWith({
        message: 'Permission denied'
      });
      expect(nextFunction.called).to.be.false;
    });

    it('should be case-insensitive when checking permissions', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['READ', 'WRITE']
      };

      const middleware = checkPermission('read');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction.calledOnce).to.be.true;
      expect(mockResponse.status).to.not.have.been.called;
    });

    it('should match when required permission is uppercase', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['read', 'write']
      };

      const middleware = checkPermission('READ');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction.calledOnce).to.be.true;
      expect(mockResponse.status).to.not.have.been.called;
    });
  });

  describe('Multiple permissions check', () => {
    it('should call next() when user has at least one of the required permissions', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['read', 'write']
      };

      const middleware = checkPermission(['admin', 'write', 'superuser']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction.calledOnce).to.be.true;
      expect(mockResponse.status).to.not.have.been.called;
    });

    it('should return 403 when user has none of the required permissions', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['read', 'write']
      };

      const middleware = checkPermission(['admin', 'superuser', 'moderator']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).to.have.been.calledWith(403);
      expect(mockResponse.json).to.have.been.calledWith({
        message: 'Permission denied'
      });
      expect(nextFunction.called).to.be.false;
    });

    it('should be case-insensitive for multiple permissions', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['READ', 'WRITE']
      };

      const middleware = checkPermission(['admin', 'write', 'superuser']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction.calledOnce).to.be.true;
      expect(mockResponse.status).to.not.have.been.called;
    });
  });

  describe('Error cases', () => {
    it('should return 403 when user is not defined', () => {
      mockRequest.user = undefined;

      const middleware = checkPermission('read');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).to.have.been.calledWith(403);
      expect(mockResponse.json).to.have.been.calledWith({
        message: 'User does not have permissions'
      });
      expect(nextFunction.called).to.be.false;
    });

    it('should return 403 when user has no permissions array', () => {
      mockRequest.user = {
        id: '123',
        permissions: undefined
      };

      const middleware = checkPermission('read');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).to.have.been.calledWith(403);
      expect(mockResponse.json).to.have.been.calledWith({
        message: 'User does not have permissions'
      });
      expect(nextFunction.called).to.be.false;
    });

    it('should return 403 when user permissions is empty array', () => {
      mockRequest.user = {
        id: '123',
        permissions: []
      };

      const middleware = checkPermission('read');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).to.have.been.calledWith(403);
      expect(mockResponse.json).to.have.been.calledWith({
        message: 'Permission denied'
      });
      expect(nextFunction.called).to.be.false;
    });
  });

  describe('Edge cases', () => {
    it('should handle empty required permissions array', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['read']
      };

      const middleware = checkPermission([]);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).to.have.been.calledWith(403);
      expect(nextFunction.called).to.be.false;
    });

    it('should handle mixed case in both user and required permissions', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['ReAd', 'WrItE']
      };

      const middleware = checkPermission(['rEaD', 'DeLeTe']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction.calledOnce).to.be.true;
      expect(mockResponse.status).to.not.have.been.called;
    });

    it('should handle permissions with spaces', () => {
      mockRequest.user = {
        id: '123',
        permissions: ['user:read', 'user:write']
      };

      const middleware = checkPermission('user:read');
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction.calledOnce).to.be.true;
      expect(mockResponse.status).to.not.have.been.called;
    });
  });
});
