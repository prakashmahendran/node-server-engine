import { expect } from 'chai';
import express from 'express';
import request from 'supertest';
import { requestId } from './requestId';

describe('Middleware - requestId', () => {
  it('gives each request an id, on the request and in X-Request-Id', async () => {
    const app = express()
      .use(requestId())
      .get('/', (req, res) => {
        res.json({ id: (req as typeof req & { id?: string }).id });
      });
    const a = await request(app).get('/');
    const b = await request(app).get('/');
    expect(a.headers['x-request-id']).to.match(/^[0-9a-f-]{36}$/);
    expect(a.body.id).to.equal(a.headers['x-request-id']);
    expect(b.headers['x-request-id']).to.not.equal(a.headers['x-request-id']);
  });
});
