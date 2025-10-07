import { createServer, RequestListener, Server } from 'http';
import {
  createServer as createSecureServer,
  Server as SecureServer
} from 'https';
import { Application } from 'express';
import { validateHttpEnvironment } from './createHttpServer.validate';
import { getSecretOrFile } from 'utils';

/**
 * Create and configure an HTTP/HTTPS server.
 * Supports local files in dev and GCP secrets in prod.
 */
export const createHttpServer = (
  handler?: Application | RequestListener
): Server | SecureServer => {
  validateHttpEnvironment();

  if (process.env.TLS_SERVER_KEY && process.env.TLS_SERVER_CERT) {
    const key = getSecretOrFile('TLS_SERVER_KEY');
    const cert = getSecretOrFile('TLS_SERVER_CERT');
    const ca = process.env.TLS_CA ? getSecretOrFile('TLS_CA') : undefined;
    const passphrase = process.env.TLS_SERVER_KEY_PASSPHRASE;

    return createSecureServer(
      {
        key,
        cert,
        ca,
        passphrase,
        requestCert: true,
        rejectUnauthorized: false
      },
      handler
    );
  } else {
    return createServer(handler);
  }
};
