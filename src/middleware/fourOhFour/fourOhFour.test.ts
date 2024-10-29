import express from 'express';
import supertest from 'supertest';
import { fourOhFour } from './fourOhFour';

describe('Middleware - fourOhFour', () => {
  it('should 404 everything', async () => {
    const app = express();
    app.get('/example', (req: any, res: any) => res.sendStatus(200));
    app.use(fourOhFour);

    await supertest(app).get('/example').expect(200);
    await supertest(app).get('/nope').expect(404);
  });
});
