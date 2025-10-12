import fs from 'fs';
import { createServer, RequestListener, Server } from 'http';
import {
  createServer as createSecureServer,
  Server as SecureServer
} from 'https';
import { Application } from 'express';
import { validateHttpEnvironment } from './createHttpServer.validate';

/** Create and configure an http/https server */
export function createHttpServer(
  handler?: Application | RequestListener
): Server | SecureServer {
  // Validate the environment variables
  validateHttpEnvironment();
  // Create a https server if env var are specified
  if (
    process.env.TLS_SERVER_KEY &&
    process.env.TLS_SERVER_CERT &&
    process.env.TLS_SERVER_KEY_PASSPHRASE
  ) {
    return createSecureServer(
      {
        key: fs.readFileSync(process.env.TLS_SERVER_KEY),
        passphrase: fs
          .readFileSync(process.env.TLS_SERVER_KEY_PASSPHRASE, 'utf8')
          .trim(),
        cert: fs.readFileSync(process.env.TLS_SERVER_CERT),
        ca: process.env.TLS_CA
          ? fs.readFileSync(process.env.TLS_CA)
          : undefined,
        requestCert: true,
        rejectUnauthorized: false
      },
      handler
    );
  } else {
    return createServer(handler);
  }
}
