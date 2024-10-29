import { expect } from 'chai';
import express, { Response, Request, NextFunction } from 'express';
import request from 'supertest';
import { validate } from './validate';
import { ValidationError } from 'entities/ValidationError';

describe('Middleware - validate', () => {
  it('should validate according to the schema', async () => {
    const app = express();
    const middleware = validate({
      size: {
        in: 'query',
        isInt: true
      }
    });

    app.get('/example', ...middleware, (req: any, res: any) =>
      res.sendStatus(200)
    );

    app.use(
      (
        error: ValidationError,
        req: Request,
        res: Response,
        next: NextFunction
      ) => {
        expect(error.errorCode).to.equal('invalid-request');
        expect((error.data as Record<string, string>).size).to.deep.equal(
          'Invalid value'
        );
        res.sendStatus(error.statusCode);
      }
    );

    await request(app).get('/example').query({ size: 4000 }).expect(200);

    // await request(app)
    //   .get('/example')
    //   .query({ size: 'not number' })
    //   .expect(400);
  });
});
