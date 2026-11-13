import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { rateLimit } from './rateLimit';

describe('Middleware - rateLimit', () => {
  const app = (key?: 'ip' | 'token'): express.Application =>
    express()
      .use(rateLimit({ windowMs: 60_000, max: 2, key }))
      .get('/', (_req, res) => {
        res.json({ ok: true });
      });

  it('answers 429 with the engine error body once the limit is reached', async () => {
    const server = app();
    await request(server).get('/').expect(200);
    await request(server).get('/').expect(200);
    const res = await request(server).get('/').expect(429);
    expect(res.body).to.deep.equal({
      errorCode: 'rate-limited',
      hint: 'Too many requests. Slow down and try again.'
    });
    expect(Number(res.headers['retry-after'])).to.be.greaterThan(0);
  });

  it('counts per token when asked', async () => {
    const server = app('token');
    for (let i = 0; i < 2; i++)
      await request(server)
        .get('/')
        .set('authorization', 'Bearer a')
        .expect(200);
    await request(server).get('/').set('authorization', 'Bearer a').expect(429);
    await request(server).get('/').set('authorization', 'Bearer b').expect(200);
  });

  it('counts clients without a token by address when keyed by token', async () => {
    const server = app('token');
    await request(server).get('/').expect(200);
    await request(server).get('/').expect(200);
    await request(server).get('/').expect(429);
  });
});
