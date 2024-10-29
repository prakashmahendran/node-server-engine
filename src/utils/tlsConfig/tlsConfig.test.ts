import path from 'path';
import { expect } from 'chai';
import { validateTlsConfig } from './tlsConfig.validate';

describe('utils - TLS Config', () => {
  beforeEach(() => {
    delete process.env.TLS_REQUEST_KEY;
    delete process.env.TLS_REQUEST_CERT;
    delete process.env.TLS_REQUEST_CA;
    delete process.env.TLS_SERVER_KEY;
    delete process.env.TLS_SERVER_CERT;
    delete process.env.TLS_CA;
  });

  it('should accept Request TLS environment variables', () => {
    process.env.TLS_REQUEST_KEY = path.resolve('certs/client.key');
    process.env.TLS_REQUEST_CERT = path.resolve('certs/client.crt');
    process.env.TLS_REQUEST_CA = path.resolve('certs/ca.crt');
    expect(validateTlsConfig).to.throw;
  });

  it('should accept Server TLS environment variables', () => {
    process.env.TLS_SERVER_KEY = path.resolve('certs/server.key');
    process.env.TLS_SERVER_CERT = path.resolve('certs/server.crt');
    process.env.TLS_CA = path.resolve('certs/ca.crt');
    expect(validateTlsConfig).to.throw;
  });

  it('should throw an EngineError if no environment setting', () => {
    expect(validateTlsConfig).to.throw;
  });
});
