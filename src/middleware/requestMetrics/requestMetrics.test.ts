import { expect } from 'chai';
import express from 'express';
import { faker } from '@faker-js/faker';
import { stub, match, SinonStub } from 'sinon';
import request from 'supertest';
import { requestMetrics } from './requestMetrics';
import { httpRequestCount, httpRequestDuration } from 'metrics/request';

describe('Middleware - requestMetrics', function () {
  let requestCountStub: SinonStub;
  let requestDurationStub: SinonStub;

  beforeEach(() => {
    requestCountStub = stub(httpRequestCount, 'inc').returns();
    requestDurationStub = stub(httpRequestDuration, 'observe').returns();
  });

  it('should handle metrics for the requests', async () => {
    const service = faker.lorem.word();
    process.env.CHART = service;

    const app = express();
    app.use(requestMetrics);
    app.get('/test', function (req, res) {
      res.sendStatus(200);
    });

    await request(app).get('/test').expect(200);

    const labels = { service, path: '/test', method: 'GET', status: '2XX' };
    expect(requestCountStub).to.have.been.calledOnceWithExactly(labels);
    expect(requestDurationStub).to.have.been.calledOnceWithExactly(
      labels,
      match.number
    );
  });

  it('should not keep query parameters in path', async () => {
    const service = faker.lorem.word();
    process.env.CHART = service;

    const app = express();
    app.use(requestMetrics);
    app.get('/test', function (req, res) {
      res.sendStatus(200);
    });

    await request(app).get('/test?param=value').expect(200);

    const labels = { service, path: '/test', method: 'GET', status: '2XX' };
    expect(requestCountStub).to.have.been.calledOnceWithExactly(labels);
    expect(requestDurationStub).to.have.been.calledOnceWithExactly(
      labels,
      match.number
    );
  });

  it('should not keep anchor in path', async () => {
    const service = faker.lorem.word();
    process.env.CHART = service;

    const app = express();
    app.use(requestMetrics);
    app.get('/test', function (req, res) {
      res.sendStatus(200);
    });

    await request(app).get('/test#place').expect(200);

    const labels = { service, path: '/test', method: 'GET', status: '2XX' };
    expect(requestCountStub).to.have.been.calledOnceWithExactly(labels);
    expect(requestDurationStub).to.have.been.calledOnceWithExactly(
      labels,
      match.number
    );
  });
});
