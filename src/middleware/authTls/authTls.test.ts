import { expect } from 'chai';
import { NextFunction, Request, Response } from 'express';
import { faker } from '@faker-js/faker';
import { fake } from 'sinon';
import { authTlsMiddleware, loadEnv } from './authTls';

describe('Middleware - Auth TLS', () => {
  const response = {} as unknown as Response;
  afterEach(() => {
    delete process.env.ALLOWED_CLIENT_HOSTS;
    loadEnv();
  });

  it('should reject unauthenticated requests', () => {
    const request = { client: { authorized: false } } as unknown as Request;
    const next = fake();
    expect(() => {
      authTlsMiddleware(request, response, next);
    }).to.throw();
    expect(next).to.not.have.been.called;
  });

  it('should accept properly authenticated requests', () => {
    const request = {
      socket: {
        getPeerCertificate: () => ({
          subject: { CN: faker.internet.domainName() }
        }),
        authorized: true
      }
    } as unknown as Request;
    const next = fake();
    authTlsMiddleware(request, response, next);
    expect(next).to.have.been.calledOnceWithExactly();
  });

  it('should reject when not on whitelist', () => {
    process.env.ALLOWED_CLIENT_HOSTS = faker.internet.domainName();
    loadEnv();
    const request = {
      socket: {
        getPeerCertificate: () => ({
          subject: { CN: faker.internet.domainName() }
        }),
        authorized: true
      }
    } as unknown as Request;
    const next = fake();
    expect(() => {
      authTlsMiddleware(request, response, next);
    }).to.throw();
    expect(next).to.not.have.been.called;
  });

  it('should accept when subject is in whitelist', () => {
    const domain = faker.internet.domainName();
    process.env.ALLOWED_CLIENT_HOSTS = domain;
    loadEnv();
    const request = {
      socket: {
        getPeerCertificate: () => ({ subject: { CN: domain } }),
        authorized: true
      }
    } as unknown as Request;
    const next = fake();
    authTlsMiddleware(request, response, next);
    expect(next).to.have.been.calledOnceWithExactly();
  });

  it('should accept when subject is in whitelist specific to this domain', () => {
    const domain = faker.internet.domainName();
    loadEnv();
    const request = {
      socket: {
        getPeerCertificate: () => ({ subject: { CN: domain } }),
        authorized: true
      }
    } as unknown as Request;
    const next = fake();
    authTlsMiddleware(request, response, next, { whitelist: [domain] });
    expect(next).to.have.been.calledOnceWithExactly();
  });

  it('should accept when subject is in altnames as domain', () => {
    const domain = faker.internet.domainName();
    process.env.ALLOWED_CLIENT_HOSTS = domain;
    loadEnv();
    const request = {
      socket: {
        getPeerCertificate: () => ({
          subject: { CN: faker.internet.domainName() },
          subjectaltname: `DNS:${domain}, IP Address:${faker.internet.ip()}`
        }),
        authorized: true
      }
    } as unknown as Request;
    const next = fake();
    authTlsMiddleware(request, response, next);
    expect(next).to.have.been.calledOnceWithExactly();
  });

  // it('should accept when subject is in altnames as ip', () => {
  //   const ip = faker.internet.ip();
  //   process.env.ALLOWED_CLIENT_HOSTS = ip;
  //   loadEnv();
  //   const request = {
  //     socket: {
  //       getPeerCertificate: () => ({
  //         subject: { CN: faker.internet.domainName() },
  //         subjectaltname: `DNS:${faker.internet.domainName()}, IP Address:${ip}`
  //       }),
  //       authorized: true
  //     }
  //   } as unknown as Request;
  //   const next = fake();
  //   authTlsMiddleware(request, response, next);
  //   expect(next).to.have.been.calledOnceWithExactly();
  // });

  // it('should pass down subjects', () => {
  //   const host = faker.internet.domainName();
  //   const altHost = faker.internet.domainName();
  //   const ip = faker.internet.ip();
  //   process.env.ALLOWED_CLIENT_HOSTS = ip;
  //   loadEnv();
  //   const request = {
  //     socket: {
  //       getPeerCertificate: () => ({
  //         subject: { CN: host },
  //         subjectaltname: `DNS:${altHost}, IP Address:${ip}`
  //       }),
  //       authorized: true
  //     }
  //   } as unknown as Request;
  //   authTlsMiddleware(request, response, fake() as unknown as NextFunction);
  //   expect(request.hosts).to.have.members([host, altHost, ip]);
  // });
});
