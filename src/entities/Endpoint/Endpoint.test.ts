import { randomUUID } from 'crypto';
import { generateAccessToken } from 'backend-test-tools';
import { expect } from 'chai';
import express, { Request, Response, NextFunction } from 'express';
import { faker } from '@faker-js/faker';
import { fake } from 'sinon';
import request from 'supertest';
import { Endpoint } from './Endpoint';
import {
  EndpointMethod,
  EndpointAuthType,
  EndpointOptions
} from './Endpoint.types';
import { Server } from 'entities/Server';
import { request as httpRequest } from 'utils/request';
import { tlsRequest } from 'utils/tlsRequest';

const PATH = '/test';
let app = express();

const config: EndpointOptions<EndpointAuthType.NONE> = {
  method: EndpointMethod.GET,
  path: PATH,
  handler: (req: Request, res: Response) => {
    res.sendStatus(200);
  },
  validator: {},
  authType: EndpointAuthType.NONE
};

describe('Entity - Endpoint', () => {
  beforeEach(() => {
    app = express();
  });

  // Base

  it('should create a valid Endpoint', async () => {
    const endpoint = new Endpoint(config);
    endpoint.register(app);
    await request(app).get(PATH).expect(200);
  });

  // Async

  it('should handle asynchronous errors', async () => {
    const endpoint = new Endpoint({
      ...config,
      handler: async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          reject(new Error());
        });
      }
    });
    endpoint.register(app);
    await request(app).get(PATH).expect(500);
  });

  // Middleware

  it('should handle specific middleware', async () => {
    const middleware = fake(
      (req: Request, res: Response, next: NextFunction) => {
        next();
      }
    );
    const endpoint = new Endpoint({
      ...config,
      middleware: [middleware]
    });
    endpoint.register(app);
    await request(app).get(PATH).expect(200);
    expect(middleware).to.have.been.called;
  });

  it('should handle specific error middleware', async () => {
    const middleware = fake(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        res.sendStatus(200);
      }
    );
    const endpoint = new Endpoint({
      ...config,
      handler: (): void => {
        throw new Error();
      },
      errorMiddleware: [middleware]
    });
    endpoint.register(app);
    await request(app).get(PATH).expect(200);
    expect(middleware).to.have.been.called;
  });

  // Validator

  it('should accept request with a valid shape', async () => {
    const endpoint = new Endpoint({
      ...config,
      validator: { number: { in: 'query', isInt: true } }
    });
    endpoint.register(app);
    await request(app)
      .get(PATH)
      .query({ number: faker.number.int() })
      .expect(200);
  });

  it('should reject request with an invalid shape', async () => {
    const endpoint = new Endpoint({
      ...config,
      validator: { number: { in: 'query', isInt: true } }
    });
    endpoint.register(app);
    await request(app)
      .get(PATH)
      .query({ number: faker.lorem.word() })
      .expect(400);
  });

  // Middleware
  it('should inject middlewares', async () => {
    const middleware = fake(
      (req: Request, res: Response, next: NextFunction) => {
        next();
      }
    );
    const endpoint = new Endpoint({
      ...config,
      middleware
    });
    endpoint.register(app);
    await request(app).get(PATH).expect(200);
    expect(middleware.called).to.be.true;
  });

  it('should inject multiple middlewares', async () => {
    const middleware = [
      fake((req: Request, res: Response, next: NextFunction) => {
        next();
      }),
      fake((req: Request, res: Response, next: NextFunction) => {
        next();
      })
    ];
    const endpoint = new Endpoint({
      ...config,
      middleware
    });
    endpoint.register(app);
    await request(app).get(PATH).expect(200);
    expect(middleware[0].called).to.be.true;
    expect(middleware[1].called).to.be.true;
  });

  // AUTH JWT

  it('it should authenticate with authJwt middleware', async () => {
    const id = randomUUID();
    const token = generateAccessToken(id);
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.JWT,
      handler: (req: Request, res: Response) => {
        res.sendStatus(200);
      }
    } as EndpointOptions<EndpointAuthType.JWT>);
    const server = new Server({ endpoints: [endpoint] });

    await server.init();

    await request(server.getApp())
      .get(PATH)
      .set('Authorization', 'Bearer ' + token)
      .expect(200);

    await server.shutdown();
  });

  it('it should reject if the user has no valid JWT', async () => {
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.JWT,
      handler: (req: Request, res: Response) => {
        res.sendStatus(200);
      }
    } as EndpointOptions<EndpointAuthType.JWT>);
    endpoint.register(app);
    await request(app).get(PATH).expect(401);
  });

  it('it should not trigger JWT error if acceptInvalid is set', async () => {
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.JWT,
      authParams: { acceptInvalid: true },
      handler: (req: Request, res: Response) => {
        res.sendStatus(200);
      }
    } as EndpointOptions<EndpointAuthType.JWT>);
    endpoint.register(app);
    await request(app).get(PATH).expect(200);
  });

  // TLS
  it('it should authenticate with authTLS middleware', async () => {
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.TLS,
      handler: (req: Request, res: Response) => {
        res.sendStatus(200);
      }
    } as EndpointOptions<EndpointAuthType.TLS>);
    const server = new Server({ endpoints: [endpoint] });

    await server.init();

    await expect(
      tlsRequest({
        method: 'get',
        url: `https://127.0.0.1:${process.env.PORT as string}${PATH}`
      })
    ).to.not.be.rejected;

    await server.shutdown();
  });

  it('it should reject if the user has no valid TLS credentials', async () => {
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.TLS,
      handler: (req: Request, res: Response) => {
        res.sendStatus(200);
      }
    } as EndpointOptions<EndpointAuthType.TLS>);
    const server = new Server({ endpoints: [endpoint] });

    await server.init();

    await expect(
      httpRequest({
        method: 'get',
        url: `https://127.0.0.1:${process.env.PORT as string}${PATH}`
      })
    ).to.be.rejected;

    await server.shutdown();
  });
});
