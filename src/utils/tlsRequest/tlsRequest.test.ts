import path from 'path';
import { AxiosRequestConfig } from 'axios';
import { expect } from 'chai';
import { tlsRequest } from './tlsRequest';
import { Endpoint, EndpointAuthType, EndpointMethod } from 'entities/Endpoint';
import { Server } from 'entities/Server';
import { stubPubSub } from 'test';
import { loadTlsConfig } from 'utils/tlsConfig';

describe('utils - TLS Request', () => {
  let server: Server;
  const testPath = '/test';
  const success = { success: true };
  let option: AxiosRequestConfig;

  before(async () => {
    process.env.TLS_SERVER_KEY = path.resolve('certs/server.key');
    process.env.TLS_SERVER_CERT = path.resolve('certs/server.crt');
    process.env.TLS_CA = path.resolve('certs/ca.crt');

    const endpoint = new Endpoint({
      path: testPath,
      method: EndpointMethod.GET,
      authType: EndpointAuthType.TLS,
      handler: (request, response): void => {
        response.json(success);
      },
      validator: {}
    });
    server = new Server({ endpoints: [endpoint] });

    await server.init();
  });

  beforeEach(() => {
    delete process.env.TLS_REQUEST_KEY;
    delete process.env.TLS_REQUEST_CERT;
    delete process.env.TLS_REQUEST_CA;
    delete process.env.TLS_SERVER_KEY;
    delete process.env.TLS_SERVER_CERT;
    delete process.env.TLS_CA;
    option = {
      url: testPath,
      baseURL: `https://localhost:${process.env.PORT as string}`
    };
    stubPubSub();
  });

  after(async () => {
    await server.shutdown();
  });

  it('should successfully establish a TLS connection', async () => {
    process.env.TLS_REQUEST_KEY = path.resolve('certs/client.key');
    process.env.TLS_REQUEST_CERT = path.resolve('certs/client.crt');
    process.env.TLS_REQUEST_CA = path.resolve('certs/ca.crt');

    loadTlsConfig();

    const { data } = await tlsRequest(option);
    expect(data).to.deep.equal(success);
  });
});
