import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { userResolver, getUserById } from './userResolver';

describe('Middleware - userResolver', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let axiosRequestStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.USER_SERVICE_URL = 'https://user-service.com/user';
    // Mock TLS env vars
    process.env.TLS_REQUEST_KEY = 'dummy';
    process.env.TLS_REQUEST_CERT = 'dummy';
    process.env.TLS_REQUEST_CA = 'dummy';

    axiosRequestStub = sinon.stub(axios, 'request');

    req = {
      user: { id: 123 }
    };
    res = {};
    next = sinon.stub();
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  describe('userResolver', () => {
    it('should resolve user and add to request', async () => {
      const mockUser = { id: 123, name: 'John Doe', email: 'john@example.com' };
      axiosRequestStub.resolves({ data: mockUser });

      await userResolver(req as Request, res as Response, next);

      expect(req.user).to.deep.include(mockUser);
      expect(next).to.have.been.calledOnce;
    });

    it('should merge existing user data with fetched data', async () => {
      req.user = { id: 123, role: 'admin' };
      const mockUser = { id: 123, name: 'John Doe', email: 'john@example.com' };
      axiosRequestStub.resolves({ data: mockUser });

      await userResolver(req as Request, res as Response, next);

      expect(req.user).to.include({ role: 'admin' });
      expect(req.user).to.include(mockUser);
    });

    it('should throw error when user ID is missing', async () => {
      req.user = {};

      try {
        await userResolver(req as Request, res as Response, next);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('missing his ID');
      }
    });

    it('should throw error when user ID is undefined', async () => {
      req.user = undefined;

      try {
        await userResolver(req as Request, res as Response, next);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('missing his ID');
      }
    });

    it('should throw error when user cannot be fetched', async () => {
      req.user = { id: 123 };
      axiosRequestStub.resolves({ data: null });

      try {
        await userResolver(req as Request, res as Response, next);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('could not be fetched');
      }
    });

    it('should throw error when user service returns undefined', async () => {
      req.user = { id: 123 };
      axiosRequestStub.resolves({ data: undefined });

      try {
        await userResolver(req as Request, res as Response, next);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('could not be fetched');
      }
    });

    it('should call next only after user is resolved', async () => {
      const mockUser = { id: 123, name: 'John Doe' };
      axiosRequestStub.resolves({ data: mockUser });

      expect(next).to.not.have.been.called;
      
      await userResolver(req as Request, res as Response, next);

      expect(next).to.have.been.calledOnce;
    });

    it('should handle user service errors', async () => {
      req.user = { id: 123 };
      axiosRequestStub.rejects(new Error('Service unavailable'));

      try {
        await userResolver(req as Request, res as Response, next);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('Service unavailable');
      }
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID', async () => {
      const mockUser = { id: 456, name: 'Jane Doe', email: 'jane@example.com' };
      axiosRequestStub.resolves({ data: mockUser });

      const result = await getUserById(456);

      expect(result).to.deep.equal(mockUser);
    });

    it('should make GET request to correct URL', async () => {
      process.env.USER_SERVICE_URL = 'https://api.example.com/users';
      axiosRequestStub.resolves({ data: { id: 789 } });

      await getUserById(789);

      expect(axiosRequestStub).to.have.been.calledOnce;
      const callArgs = axiosRequestStub.firstCall.args[0];
      expect(callArgs.method).to.equal('GET');
      expect(callArgs.url).to.equal('https://api.example.com/users/789');
    });

    it('should throw error when USER_SERVICE_URL is not defined', async () => {
      delete process.env.USER_SERVICE_URL;

      try {
        await getUserById(123);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('USER_SERVICE_URL is not defined');
      }
    });

    it('should handle network errors', async () => {
      axiosRequestStub.rejects(new Error('Network error'));

      try {
        await getUserById(123);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect((error as Error).message).to.include('Network error');
      }
    });

    it('should return user data from response', async () => {
      const userData = {
        id: 999,
        name: 'Test User',
        email: 'test@example.com',
        roles: ['admin', 'user']
      };
      axiosRequestStub.resolves({ data: userData });

      const result = await getUserById(999);

      expect(result).to.deep.equal(userData);
    });

    it('should handle different user ID types', async () => {
      axiosRequestStub.resolves({ data: { id: 1 } });

      await getUserById(1);
      expect(axiosRequestStub.firstCall.args[0].url).to.include('/1');

      await getUserById(999999);
      expect(axiosRequestStub.secondCall.args[0].url).to.include('/999999');
    });
  });
});
