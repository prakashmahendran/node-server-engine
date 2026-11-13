import express, { Application } from 'express';
import { faker } from '@faker-js/faker';
import request from 'supertest';
import { error } from './error';
import { WebError } from 'entities/WebError';

const PATH = '/test';
let app: Application;

describe('Middleware - error', () => {
  beforeEach(() => {
    app = express();
  });

  it('should handle WebError', async () => {
    const errorCode = faker.lorem.word();
    const message = faker.lorem.sentence();
    const hint = faker.lorem.sentence();
    const statusCode = 505;
    app.get(PATH, () => {
      throw new WebError({ statusCode, errorCode, message, hint });
    });
    app.use(error);
    await request(app).get(PATH).expect(statusCode, { errorCode, hint });
  });

  it('should return public details and the Retry-After header', async () => {
    app.get(PATH, () => {
      throw new WebError({
        statusCode: 429,
        errorCode: 'otp-blocked',
        hint: 'Wait',
        details: { attemptsLeft: 0 },
        retryAfterSec: 299.6
      });
    });
    app.use(error);
    const res = await request(app)
      .get(PATH)
      .expect(429, {
        errorCode: 'otp-blocked',
        hint: 'Wait',
        details: { attemptsLeft: 0 }
      });
    if (res.headers['retry-after'] !== '300')
      throw new Error(`Retry-After was ${res.headers['retry-after']}`);
  });

  it('should not return hint if none is specified', async () => {
    const errorCode = faker.lorem.word();
    const message = faker.lorem.sentence();
    const statusCode = 505;
    app.get(PATH, () => {
      throw new WebError({ statusCode, errorCode, message });
    });
    app.use(error);
    await request(app).get(PATH).expect(statusCode, { errorCode });
  });

  it('should return server error 500 for unknown error', async () => {
    app.get(PATH, () => {
      throw new Error();
    });
    app.use(error);
    await request(app).get(PATH).expect(500, { errorCode: 'server-error' });
  });

  it('should not trigger if no errors', async () => {
    app.get(PATH, (req: any, res: any) => res.sendStatus(200));
    app.use(error);
    await request(app).get(PATH).expect(200);
  });

  it('should pass to next if no error to handle', async () => {
    app.get(PATH, (req, res, next) => {
      next();
    });
    app.use(error);
    app.get(PATH, (req: any, res: any) => res.sendStatus(200));
    await request(app).get(PATH).expect(200);
  });

  it('should answer an unreadable or oversized JSON body as a client error', async () => {
    app.use(express.json({ limit: '10b' }));
    app.post(PATH, (_req, res) => {
      res.json({});
    });
    app.use(error);
    await request(app)
      .post(PATH)
      .set('content-type', 'application/json')
      .send('{"a":')
      .expect(400, {
        errorCode: 'invalid-json',
        hint: 'The request body is not valid JSON'
      });
    await request(app)
      .post(PATH)
      .send({ text: 'more than ten bytes' })
      .expect(413, {
        errorCode: 'request-too-large',
        hint: 'The request body is too large'
      });
  });
});
