import { expect } from 'chai';
import { Request, Response } from 'express';
import { stub, SinonStub } from 'sinon';
import { Endpoint, EndpointMethod, EndpointAuthType } from '../Endpoint';
import { runningInstances } from './LifecycleController';
import { Localizator } from 'entities/Localizator';
import { redisClient } from 'entities/Redis/Redis';
import { Server } from 'entities/Server';
import { stubPubSub } from 'test';

describe('Entity - LifecycleController', function () {
  let localizatorShutdownStub: SinonStub;

  beforeEach(() => {
    stubPubSub();
    stub(Localizator, 'synchronize').resolves();
    localizatorShutdownStub = stub(Localizator, 'shutdown').resolves();
  });

  it('Shutdown the running entities', async () => {
    const server = new Server({
      endpoints: [
        new Endpoint({
          method: EndpointMethod.GET,
          authType: EndpointAuthType.NONE,
          validator: {},
          path: '/',
          handler: (req: Request, res: Response): void => {
            res.json({ message: 'success' });
          }
        })
      ],
      initCallbacks: [
        Localizator.init.bind(Localizator)
      ]
    });

    await server.init();

    // Redis will always have been init
    expect([...runningInstances]).to.include(Localizator);

    await server.shutdown();

    expect(localizatorShutdownStub).to.have.been.calledOnce;
    expect(redisClient).to.be.undefined;
  });
});
