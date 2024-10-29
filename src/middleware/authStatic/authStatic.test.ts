import { expect } from 'chai';
import { Request, Response } from 'express';
import { faker } from '@faker-js/faker';
import { fake } from 'sinon';
import { authStatic } from './authStatic';

describe('Middleware - Auth Static', () => {
  beforeEach(() => {
    process.env.STATIC_TOKEN = faker.lorem.slug();
  });

  it('should authenticate with static token', () => {
    const bearer = `Bearer ${process.env.STATIC_TOKEN as string}`;
    const request = { headers: { authorization: bearer } };
    const next = fake();
    authStatic()(request as Request, undefined as unknown as Response, next);
    expect(next).to.have.been.calledOnceWithExactly();
  });

  it('should throw an error if the token is invalid', () => {
    const bearer = 'Bearer ' + faker.lorem.word();
    const request = { headers: { authorization: bearer } };
    const next = fake();
    expect(() => {
      authStatic()(request as Request, undefined as unknown as Response, next);
    }).to.throw();
  });

  it('should throw an error if there is no token', () => {
    const request = { headers: {} };
    const next = fake();
    expect(() => {
      authStatic()(request as Request, undefined as unknown as Response, next);
    }).to.throw();
  });
});
