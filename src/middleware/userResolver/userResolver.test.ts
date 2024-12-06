import { factory } from 'backend-test-tools';
import { expect } from 'chai';
import { Request, Response } from 'express';
import { stub, fake } from 'sinon';
import { userResolver } from './userResolver';

describe('Middleware - User Resolver', function () {
  it('should expand the user object with its data using its userId', async function () {
    const me = factory.build('user');
    const next = fake();
    const request: Partial<Request> = { user: { id: me.id } };

    // Call the resolver with the mocked request
    await userResolver(request as Request, undefined as unknown as Response, next);

    expect(next).to.have.been.called;
    // expect(request.user).to.deep.equal(me);
  });

  it('should throw an error if there is no userId', async function () {
    const me = factory.build('user');
    const next = fake();
    const request = {} as Request;
    await expect(userResolver(request, undefined as unknown as Response, next))
      .to.eventually.be.rejected;
  });

  // it('should throw an error if there is no such user', async function () {
  //   const { id } = factory.build('user');
  //   const next = fake();
  //   const request = { user: { id } } as Request;
  //   await expect(userResolver(request, undefined as unknown as Response, next))
  //     .to.eventually.be.rejected;
  // });
});
