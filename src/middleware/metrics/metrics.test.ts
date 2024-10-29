import { expect } from 'chai';
import express from 'express';
import { Counter } from 'prom-client';
import request from 'supertest';
import { metrics } from './metrics';
import { serviceRegistry, instanceRegistry } from 'const/metrics';

describe('Middleware - metrics', () => {
  beforeEach(() => {
    instanceRegistry.clear();
    serviceRegistry.clear();
  });

  it('should export instance metrics', async () => {
    new Counter({
      name: 'instance_test',
      help: 'instance_test',
      registers: [instanceRegistry]
    });

    const app = express();
    app.use(metrics());

    const { text } = await request(app).get('/metrics/instance').expect(200);
    expect(text).to.equal(
      '# HELP instance_test instance_test\n# TYPE instance_test counter\ninstance_test 0\n'
    );
  });

  it('should export service metrics', async () => {
    new Counter({
      name: 'service_test',
      help: 'service_test',
      registers: [serviceRegistry]
    });

    const app = express();
    app.use(metrics());

    const { text } = await request(app).get('/metrics/service').expect(200);

    expect(text).to.equal(
      '# HELP service_test service_test\n# TYPE service_test counter\nservice_test 0\n'
    );
  });
});
