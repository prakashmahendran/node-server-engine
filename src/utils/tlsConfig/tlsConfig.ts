import https, { Agent } from 'https';
import { TlsConfig } from './tlsConfig.types';
import { validateTlsConfig } from './tlsConfig.validate';
import { EngineError } from 'entities/EngineError';
import { getSecretOrFile } from 'utils';

export let tlsConfig: undefined | TlsConfig;
export let httpsAgent: undefined | Agent;

/**
 * Load TLS config by its environment setting (local files or GCP secrets)
 */
export function loadTlsConfig(): void {
  validateTlsConfig();
  tlsConfig = undefined;

  const runningInCloudRun = !!process.env.K_SERVICE || !!process.env.K_REVISION;
  if (runningInCloudRun) {
    console.log('[loadTlsConfig] Skipping TLS config load (Cloud Run)');
    return;
  }

  if (process.env.TLS_REQUEST_KEY || process.env.TLS_SERVER_KEY) {
    // Fetch TLS secrets using unified utility
    const key = getSecretOrFile('TLS_SERVER_KEY');
    const cert = getSecretOrFile('TLS_SERVER_CERT');
    const ca = getSecretOrFile('TLS_CA');

    // Passphrase is read directly from env variables
    const passphrase =
      process.env.TLS_REQUEST_KEY_PASSPHRASE ??
      process.env.TLS_SERVER_KEY_PASSPHRASE;

    tlsConfig = { key, cert, ca, passphrase } as TlsConfig;

    httpsAgent = new https.Agent({
      key: tlsConfig.key,
      cert: tlsConfig.cert,
      ca: tlsConfig.ca,
      passphrase: tlsConfig.passphrase
    });
  }

  if (!tlsConfig || !(tlsConfig.key && tlsConfig.cert && tlsConfig.ca)) {
    throw new EngineError({
      message: 'TLS environment variables are not set correctly'
    });
  }
}
