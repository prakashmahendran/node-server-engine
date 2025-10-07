import https, { Agent } from 'https';
import { validateTlsConfig } from './tlsConfig.validate';
import { EngineError } from 'entities/EngineError';
import { getSecretOrFile } from 'utils';

let httpsAgent: Agent | undefined;
export function getHttpsAgent(): Agent {
  if (httpsAgent) return httpsAgent;

  validateTlsConfig();

  // Always pass env var *names*, not their values
  const key = getSecretOrFile(
    process.env.TLS_REQUEST_KEY ? 'TLS_REQUEST_KEY' : 'TLS_SERVER_KEY'
  );

  const cert = getSecretOrFile(
    process.env.TLS_REQUEST_CERT ? 'TLS_REQUEST_CERT' : 'TLS_SERVER_CERT'
  );

  // CA is optional → only load if env var is set
  const ca = process.env.TLS_REQUEST_CA
    ? getSecretOrFile('TLS_REQUEST_CA')
    : process.env.TLS_CA
      ? getSecretOrFile('TLS_CA')
      : undefined;

  const passphrase =
    process.env.TLS_REQUEST_KEY_PASSPHRASE ??
    process.env.TLS_SERVER_KEY_PASSPHRASE;

  if (!key || !cert || !ca || !passphrase) {
    throw new EngineError({
      message: 'TLS environment variables are not set correctly'
    });
  }

  httpsAgent = new https.Agent({
    key,
    cert,
    ca,
    passphrase
  });

  return httpsAgent;
}
