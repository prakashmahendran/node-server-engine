import { factory, generateAccessToken, getBearer } from 'backend-test-tools';
import { expect } from 'chai';
import { Request, Response } from 'express';
import { faker } from '@faker-js/faker';
import { fake } from 'sinon';
import { authAdmin } from './authAdmin';
import {} from './authAdmin.types';

describe('Middleware - Auth Admin', () => {
  it('should authenticate with a JWT (auth-service)', async () => {
    const email = faker.internet.email();
    const permission = faker.lorem.word();
    const request = {
      headers: {
        authorization: `Bearer ${generateAccessToken(
          email,
          {
            audience: [process.env.ADMIN_API_ACCESS_TOKEN_AUDIENCE as string],
            issuer: process.env.ADMIN_ACCESS_TOKEN_ISSUER
          },
          { per: permission }
        )}`
      }
    } as unknown as Request;
    const next = fake();

    await authAdmin({ permission })(
      request,
      undefined as unknown as Response,
      next
    );

    expect(next).to.have.been.calledOnceWithExactly();
  });

  it('should populate the admin object in the request (auth-service)', async () => {
    const email = faker.internet.email();
    const permission = faker.lorem.word();
    const permissions = [permission, faker.lorem.word(), faker.lorem.word()];
    const request = {
      headers: {
        authorization: `Bearer ${generateAccessToken(
          email,
          {
            audience: [process.env.ADMIN_API_ACCESS_TOKEN_AUDIENCE as string],
            issuer: process.env.ADMIN_ACCESS_TOKEN_ISSUER
          },
          { per: permissions }
        )}`
      }
    } as unknown as Request;
    const next = fake();

    await authAdmin({ permission })(
      request,
      undefined as unknown as Response,
      next
    );

    expect(request.admin?.email).to.equal(email);
    expect(request.admin?.permissions).to.deep.members(permissions);
  });

  it('should throw an error if there is no token', async () => {
    const request = { headers: {} } as unknown as Request;
    const next = fake();

    await expect(
      authAdmin({ permission: faker.lorem.word() })(
        request,
        undefined as unknown as Response,
        next
      )
    ).to.eventually.be.rejected;
  });

  it('should throw an error if the audience is not valid', async () => {
    const user = factory.build('user');
    const permission = faker.lorem.word();
    const request = {
      headers: {
        authorization: getBearer(
          user.id,
          { audience: faker.internet.url() },
          { per: permission }
        )
      }
    } as unknown as Request;
    const next = fake();

    await expect(
      authAdmin({ permission })(request, undefined as unknown as Response, next)
    ).to.eventually.be.rejected;
  });

  it('should check user has permission', async () => {
    const email = faker.internet.email();
    const permissions = [faker.lorem.word(), faker.lorem.word()];
    const request = {
      headers: {
        authorization: `Bearer ${generateAccessToken(
          email,
          {
            audience: [process.env.ADMIN_API_ACCESS_TOKEN_AUDIENCE as string],
            issuer: process.env.ADMIN_ACCESS_TOKEN_ISSUER
          },
          { per: permissions }
        )}`
      }
    } as unknown as Request;
    const next = fake();

    await authAdmin({ permission: permissions[0] })(
      request,
      undefined as unknown as Response,
      next
    );

    expect(request.admin?.email).to.equal(email);
    expect(request.admin?.permissions).to.deep.members(permissions);
  });

  it('should all user has endpoint permission', async () => {
    const email = faker.internet.email();
    const permission = faker.lorem.word();
    const request = {
      headers: {
        authorization: `Bearer ${generateAccessToken(
          email,
          {
            audience: [process.env.ADMIN_API_ACCESS_TOKEN_AUDIENCE as string],
            issuer: process.env.ADMIN_ACCESS_TOKEN_ISSUER
          },
          { per: permission }
        )}`
      }
    } as unknown as Request;
    const next = fake();

    await authAdmin({ permission })(
      request,
      undefined as unknown as Response,
      next
    );

    expect(request.admin?.email).to.equal(email);
    expect(request.admin?.permissions).to.includes(permission);
  });

  it('should throw error if user does not have permission', async () => {
    const email = faker.internet.email();
    const permissions = [faker.lorem.word(), faker.lorem.word()];
    const request = {
      headers: {
        authorization: `Bearer ${generateAccessToken(
          email,
          {
            audience: [process.env.ADMIN_API_ACCESS_TOKEN_AUDIENCE as string],
            issuer: process.env.ADMIN_ACCESS_TOKEN_ISSUER
          },
          { per: permissions }
        )}`
      }
    } as unknown as Request;
    const next = fake();

    await expect(
      authAdmin({ permission: faker.lorem.word() })(
        request,
        undefined as unknown as Response,
        next
      )
    ).to.eventually.rejected;
  });

  it('should allow wildcard permissions', async () => {
    const email = faker.internet.email();
    const permission = faker.lorem.word();
    const request = {
      headers: {
        authorization: `Bearer ${generateAccessToken(
          email,
          {
            audience: [process.env.ADMIN_API_ACCESS_TOKEN_AUDIENCE as string],
            issuer: process.env.ADMIN_ACCESS_TOKEN_ISSUER
          },
          { per: `${permission}:*` }
        )}`
      }
    } as unknown as Request;
    const next = fake();

    await authAdmin({ permission: `${permission}:${faker.lorem.word()}` })(
      request,
      undefined as unknown as Response,
      next
    );
  });
});
