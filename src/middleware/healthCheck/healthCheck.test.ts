import express from 'express';
import request from 'supertest';
import { healthCheck } from './healthCheck';

describe('Middleware - healthCheck', () => {
  it('default healtcheck route', async () => {
    const app = express();
    app.use(healthCheck());
    await request(app).get('/').expect(200);
    await request(app).get('/heartbeat').expect(200);
  });
});
