import { Server } from 'http';
import { Server as SecureServer } from 'https';
import { expect } from 'chai';
import { createHttpServer } from './createHttpServer';
import { validateHttpEnvironment } from './createHttpServer.validate';

describe('App - httpServer', () => {
  it('should create an httpServer', () => {
    delete process.env.TLS_SERVER_KEY;
    delete process.env.TLS_SERVER_CERT;
    const httpServer = createHttpServer();
    expect(httpServer instanceof Server).to.be.ok;
  });

  it('should create an httpsServer', () => {
    const httpServer = createHttpServer();
    expect(httpServer instanceof SecureServer).to.be.ok;
  });

  it('should accept TLS environment variables', () => {
    process.env.TLS_SERVER_KEY_PASSPHRASE = 'password';
    expect(validateHttpEnvironment).to.not.throw;
  });

  it('should refuse a TLS key without its certificate instead of serving plain HTTP', () => {
    const saved = {
      key: process.env.TLS_SERVER_KEY,
      cert: process.env.TLS_SERVER_CERT
    };
    process.env.TLS_SERVER_KEY = saved.key ?? 'certs/server.key';
    delete process.env.TLS_SERVER_CERT;
    try {
      expect(validateHttpEnvironment).to.throw(/TLS_SERVER_CERT/);
    } finally {
      if (saved.key === undefined) delete process.env.TLS_SERVER_KEY;
      else process.env.TLS_SERVER_KEY = saved.key;
      if (saved.cert !== undefined) process.env.TLS_SERVER_CERT = saved.cert;
    }
  });
});
