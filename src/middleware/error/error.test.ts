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
});
