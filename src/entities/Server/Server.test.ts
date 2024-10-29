import { randomUUID } from 'crypto';
// eslint-disable-next-line import/no-unresolved
import { setTimeout } from 'timers/promises';
import { generateAccessToken } from 'backend-test-tools';
import Ajv, { JSONSchemaType } from 'ajv';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { Sequelize } from 'sequelize';
import { fake, SinonStub, stub } from 'sinon';
import supertest from 'supertest';
import WS from 'ws';
import { Server } from './Server';
import { Endpoint, EndpointMethod, EndpointAuthType } from 'entities/Endpoint';
import { SocketClient, SocketMessage } from 'entities/SocketClient';
import { stubPubSub } from 'test';
import { httpsAgent, loadTlsConfig } from 'utils';
import * as jwt from 'utils/jwt/jwt';

describe('Entity - Server', function () {
  let token: string;
  let initKeySetsStub: SinonStub;

  before(() => {
    if (!httpsAgent) loadTlsConfig();

    const id = randomUUID();
    token = generateAccessToken(id);
  });

  beforeEach(() => {
    initKeySetsStub = stub(jwt, 'initKeySets').resolves();
    stub(Sequelize.prototype, 'close');
    stubPubSub();
  });

  afterEach(() => {
  });

  it('init and shutdown', async () => {
    const server = new Server({ endpoints: [] });
    await server.init();
    await server.shutdown();
  });

  it('init with callbacks (async)', async () => {
    const callbacks = [fake(), fake(), fake()];
    const server = new Server({
      endpoints: [],
      initCallbacks: callbacks,
      syncCallbacks: false
    });

    await server.init();
    await server.shutdown();

    callbacks.forEach((callback) =>
      expect(callback).to.have.been.calledOnceWithExactly()
    );
  });

  it('init with callbacks with parameters (async)', async () => {
    const callbacks = [
      {
        function: fake(),
        parameters: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()]
      }
    ];
    const server = new Server({
      endpoints: [],
      initCallbacks: callbacks,
      syncCallbacks: false
    });

    await server.init();
    await server.shutdown();

    callbacks.forEach((callback) =>
      expect(callback.function).to.have.been.calledOnceWithExactly(
        ...callback.parameters
      )
    );
  });

  it('init with callbacks (sync)', async () => {
    const callbacks = [fake(), fake(), fake()];
    const server = new Server({
      endpoints: [],
      initCallbacks: callbacks,
      syncCallbacks: true
    });

    await server.init();
    await server.shutdown();

    callbacks.forEach((callback) =>
      expect(callback).to.have.been.calledOnceWithExactly()
    );
  });

  it('init with callbacks with parameters (sync)', async () => {
    const callbacks = [
      {
        function: fake(),
        parameters: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()]
      }
    ];
    const server = new Server({
      endpoints: [],
      initCallbacks: callbacks,
      syncCallbacks: true
    });

    await server.init();
    await server.shutdown();

    callbacks.forEach((callback) =>
      expect(callback.function).to.have.been.calledOnceWithExactly(
        ...callback.parameters
      )
    );
  });

  it('should handle Endpoints', async () => {
    const sayHello = new Endpoint({
      method: EndpointMethod.GET,
      authType: EndpointAuthType.NONE,
      path: '/hello/:name',
      handler: (req, res): void => {
        res.json({ content: 'hello ' + req.params.name });
      },
      validator: {
        name: {
          in: 'params',
          isString: true
        }
      }
    });

    const sayGoodbye = new Endpoint({
      method: EndpointMethod.POST,
      authType: EndpointAuthType.NONE,
      path: '/hello',
      handler: (req, res): void => {
        res.json({
          content: `goodbye ${
            (
              req.body as {
                /** */ name: string;
              }
            ).name
          }`
        });
      },
      validator: {
        name: {
          in: 'body',
          isString: true
        }
      }
    });

    const server = new Server({ endpoints: [sayHello, sayGoodbye] });

    await server.init();

    await supertest(server.getApp())
      .get('/hello/example')
      .expect(200, { content: 'hello example' });

    await supertest(server.getApp())
      .post('/hello')
      .send({ name: 'example' })
      .expect(200, { content: 'goodbye example' });

    await server.shutdown();
  });

  it('should handle the cronjob', async () => {
    const handler = fake();
    const interval = 0.01; // 10ms

    const server = new Server({
      endpoints: [],
      cron: [{ handler, interval }]
    });

    await server.init();
    await Promise.resolve();
    expect(handler).to.have.been.calledOnce;

    await setTimeout(5);
    await Promise.resolve();
    expect(handler).to.have.been.calledOnce;

    await setTimeout(5);
    await Promise.resolve();
    expect(handler).to.have.been.calledTwice;

    await server.shutdown();

    await setTimeout(20);
    await Promise.resolve();
    expect(handler).to.have.been.calledTwice;
  });

  it('should init the KeySets', async () => {
    process.env.NODE_ENV = 'development';
    const server = new Server({ endpoints: [] });

    await server.init();

    expect(initKeySetsStub).to.have.been.called;

    await server.shutdown();
  });

  it('should not init KeySet in test env', async () => {
    const server = new Server({ endpoints: [] });

    await server.init();

    expect(initKeySetsStub).to.not.have.been.called;

    await server.shutdown();
  });

  it('should not init the KeySets when specified', async () => {
    process.env.NODE_ENV = 'development';
    const server = new Server({ endpoints: [], auth: { noFetch: true } });

    await server.init();

    expect(initKeySetsStub).to.not.have.been.called;

    await server.shutdown();
  });

  it('should serve metrics on the secondary IP', async () => {
    const server = new Server({ endpoints: [] });

    await server.init();

    await supertest(server.getSecondaryApp())
      .get('/metrics/instance')
      .expect(200);
    await supertest(server.getSecondaryApp())
      .get('/metrics/service')
      .expect(200);

    await server.shutdown();
  });

  it('should serve versions on the secondary IP', async () => {
    const server = new Server({ endpoints: [] });

    await server.init();

    await supertest(server.getSecondaryApp()).get('/version').expect(200);

    await server.shutdown();
  });

  it('should return 404 on the secondary IP', async () => {
    const server = new Server({ endpoints: [] });

    await server.init();

    await supertest(server.getSecondaryApp()).get('/random').expect(404);

    await server.shutdown();
  });
});
