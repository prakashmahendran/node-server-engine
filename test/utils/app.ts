import express, { Application, Request, Response } from 'express';
import {
  Endpoint,
  EndpointMethod,
  EndpointOptions,
  EndpointAuthType
} from 'entities/Endpoint';
import { error } from 'middleware';

/**
 * Create a test application with the given endpoint and error handling
 */

export function createTestApp(
  config: Partial<EndpointOptions<EndpointAuthType.NONE>>
): Application {
  const app = express();
  const endpoint = new Endpoint({
    path: '/test',
    method: EndpointMethod.POST,
    handler: (req: Request, res: Response): void => {
      res.sendStatus(200);
    },
    authType: EndpointAuthType.NONE,
    validator: {},
    ...config
  });
  endpoint.register(app);
  app.use(error);
  return app;
}
