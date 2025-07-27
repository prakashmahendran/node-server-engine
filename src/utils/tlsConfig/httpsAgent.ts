import fs from 'fs';
import https, { Agent } from 'https';
import { validateTlsConfig } from './tlsConfig.validate';
import { EngineError } from 'entities/EngineError';

let httpsAgent: Agent | undefined;

export function getHttpsAgent(): Agent {
  if (httpsAgent) return httpsAgent;

  validateTlsConfig();

  const key = fs.readFileSync(
    process.env.TLS_REQUEST_KEY ?? process.env.TLS_SERVER_KEY!,
    'utf-8'
  );
  const cert = fs.readFileSync(
    process.env.TLS_REQUEST_CERT ?? process.env.TLS_SERVER_CERT!,
    'utf-8'
  );
  const ca = fs.readFileSync(
    process.env.TLS_REQUEST_CA ?? process.env.TLS_CA!,
    'utf-8'
  );
  const passphrase =
    process.env.TLS_REQUEST_KEY_PASSPHRASE ??
    process.env.TLS_SERVER_KEY_PASSPHRASE;

  if (!key || !cert || !ca || !passphrase) {
    throw new EngineError({
      message: 'TLS environment variables are not set correctly'
    });
  }

  httpsAgent = new https.Agent({ key, cert, ca, passphrase });
  return httpsAgent;
}
