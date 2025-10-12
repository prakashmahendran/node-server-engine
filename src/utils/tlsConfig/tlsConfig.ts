import fs from 'fs';
import https, { Agent } from 'https';
import { TlsConfig } from './tlsConfig.types';
import { validateTlsConfig } from './tlsConfig.validate';
import { EngineError } from 'entities/EngineError';

export let tlsConfig: undefined | TlsConfig;
export let httpsAgent: undefined | Agent;

/**
 * Load TLS config by its Environment setting.
 */
export function loadTlsConfig(): void {
  // Check that environment variables are correctly set
  validateTlsConfig();
  tlsConfig = undefined;

  if (process.env.TLS_REQUEST_KEY || process.env.TLS_SERVER_KEY) {
    tlsConfig = {
      key: fs.readFileSync(
        (process.env.TLS_REQUEST_KEY ?? process.env.TLS_SERVER_KEY) as string,
        'utf-8'
      ),
      cert: fs.readFileSync(
        (process.env.TLS_REQUEST_CERT ?? process.env.TLS_SERVER_CERT) as string,
        'utf-8'
      ),
      ca: fs.readFileSync(
        (process.env.TLS_REQUEST_CA ?? process.env.TLS_CA) as string,
        'utf-8'
      ),
      passphrase: fs.readFileSync(
        (process.env.TLS_REQUEST_KEY_PASSPHRASE ??
          process.env.TLS_SERVER_KEY_PASSPHRASE) as string,
        'utf-8'
      )
    } as TlsConfig;
    httpsAgent = new https.Agent({
      key: tlsConfig.key,
      cert: tlsConfig.cert,
      ca: tlsConfig.ca,
      passphrase: tlsConfig.passphrase
    });
  }
  if (!tlsConfig || !(tlsConfig.ca && tlsConfig.cert && tlsConfig.key)) {
    throw new EngineError({
      message: 'TLS environment variables are not set correctly'
    });
  }
}
