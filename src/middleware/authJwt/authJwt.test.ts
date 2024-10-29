import { factory, getBearer } from 'backend-test-tools';
import { expect } from 'chai';
import { Request, Response } from 'express';
import { faker } from '@faker-js/faker';
import { fake } from 'sinon';
import { authJwt } from './authJwt';

describe('Middleware - Auth JWT', () => {
  it('should authenticate with a JWT (auth-service)', async () => {
    const user = factory.build('user');
    const request = { headers: { authorization: getBearer(user.id) } };
    const next = fake();

    await authJwt()(request as Request, undefined as unknown as Response, next);

    expect(next).to.have.been.calledOnceWithExactly();
  });

  it('should populate the user object in the request (auth-service)', async () => {
    const user = factory.build('user');
    const request = {
      headers: { authorization: getBearer(user.id) }
    } as Request;
    const next = fake();

    await authJwt()(request, undefined as unknown as Response, next);

    expect(request.user).to.not.be.undefined;
    expect(request.user?.id).to.equal(user.id);
  });

  it('should throw an error if there is no token', async () => {
    const request = { headers: {} };
    const next = fake();

    await expect(
      authJwt()(request as Request, undefined as unknown as Response, next)
    ).to.eventually.rejected;
  });

  it('should throw an error if the audience is not valid', async () => {
    const user = factory.build('user');
    const request = {
      headers: {
        authorization: getBearer(user.id, { audience: faker.internet.url() })
      }
    };
    const next = fake();

    await expect(
      authJwt()(request as Request, undefined as unknown as Response, next)
    ).to.eventually.rejected;
  });
});
