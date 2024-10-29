import express from 'express';
import { describe } from 'mocha';
import request from 'supertest';
import { version as engineVersion } from '../../../package.json';
import { version } from './version';

describe('Middleware - version', () => {
  let serviceVersion: string;

  beforeEach(() => {
    serviceVersion = '1.0.1';
    process.env.BUILD_ID = serviceVersion;
  });

  it('should fetch the current version of the service', async () => {
    const app = express();
    app.use(version());

    await request(app)
      .get('/version')
      .expect(200, { version: serviceVersion, engineVersion });
  });
});
