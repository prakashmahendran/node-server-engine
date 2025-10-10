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
 * Always uses HTTP in Cloud Run (TLS is terminated by the platform).
 */
export const createHttpServer = (
  handler?: Application | RequestListener
): Server | SecureServer => {
  validateHttpEnvironment();

  // Cloud Run and similar managed environments handle TLS externally.
  // Detect Cloud Run by K_SERVICE or K_REVISION.
  const runningInCloudRun = !!process.env.K_SERVICE || !!process.env.K_REVISION;

  if (
    !runningInCloudRun &&
    process.env.TLS_SERVER_KEY &&
    process.env.TLS_SERVER_CERT
  ) {
    const key = getSecretOrFile('TLS_SERVER_KEY');
    const cert = getSecretOrFile('TLS_SERVER_CERT');
    const ca = process.env.TLS_CA ? getSecretOrFile('TLS_CA') : undefined;
    const passphrase = process.env.TLS_SERVER_KEY_PASSPHRASE;

    console.log('[createHttpServer] Starting HTTPS server (local mode)');
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
    console.log(
      '[createHttpServer] Starting HTTP server (Cloud Run or no TLS)'
    );
    return createServer(handler);
  }
};
