import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { securityHeaders } from './securityHeaders';

describe('Middleware - securityHeaders', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  const app = (): express.Application =>
    express()
      .use(securityHeaders())
      .get('/', (_req, res) => {
        res.json({});
      });

  it('sets the API security headers, without a content security policy', async () => {
    const res = await request(app()).get('/');
    expect(res.headers['x-content-type-options']).to.equal('nosniff');
    expect(res.headers['x-frame-options']).to.equal('SAMEORIGIN');
    expect(res.headers['content-security-policy']).to.equal(undefined);
    expect(res.headers['strict-transport-security']).to.equal(undefined);
  });

  it('adds HSTS in production', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(app()).get('/');
    expect(res.headers['strict-transport-security']).to.equal(
      'max-age=31536000; includeSubDomains'
    );
  });
});
