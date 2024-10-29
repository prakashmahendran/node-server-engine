import crypto from 'crypto';
import express, { json, Request, Response, Application } from 'express';
import { faker } from '@faker-js/faker';
import request from 'supertest';
import {
  Endpoint,
  EndpointAuthType,
  EndpointMethod,
  EndpointOptions
} from 'entities/Endpoint';
import { signPayload } from 'utils/hmac';

describe('Middleware - authHmac', () => {
  let app: Application;

  const PATH = '/test';
  const config: EndpointOptions<EndpointAuthType.HMAC> = {
    path: PATH,
    method: EndpointMethod.POST,
    handler: (req: Request, res: Response) => {
      res.sendStatus(200);
    },
    authType: EndpointAuthType.HMAC,
    validator: {}
  };

  beforeEach(() => {
    app = express();
    app.use(json());
    process.env.PAYLOAD_SIGNATURE_SECRET = faker.lorem.slug();
  });

  it('should allow properly signed requests', async () => {
    const payload = signPayload({ test: 'test' });
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.HMAC
    });
    endpoint.register(app);
    await request(app).post(PATH).send(payload).expect(200);
  });

  it('should allow properly signed requests with a custom secret', async () => {
    const secret = faker.lorem.word();
    const payload = signPayload({ test: 'test' }, { secret });
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.HMAC,
      authParams: { secret }
    });
    endpoint.register(app);
    await request(app).post(PATH).send(payload);
  });

  it('should not allow wrongly signed requests', async () => {
    const payload = signPayload({ test: 'test' }, { secret: 'hacker' });
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.HMAC
    });
    endpoint.register(app);
    await request(app).post(PATH).send(payload).expect(401);
  });

  it('should allow signed requests from Github', async () => {
    const payload = {
      z: faker.lorem.word(),
      a: { z: faker.lorem.word(), a: faker.lorem.word() }
    };
    const signature = crypto
      .createHmac('sha1', process.env.PAYLOAD_SIGNATURE_SECRET as string)
      .update(JSON.stringify(payload))
      .digest('hex');
    const endpoint = new Endpoint({
      ...config,
      authType: EndpointAuthType.HMAC,
      authParams: { isGithub: true }
    });
    endpoint.register(app);
    await request(app)
      .post(PATH)
      .send(payload)
      .set({ 'X-Hub-Signature': `sha1=${signature}` })
      .expect(200);
  });
});
