import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { EngineError } from 'entities/EngineError';
import { reportDebug } from 'utils/report';

// Cache to store preloaded secrets
export const secretCache: { [key: string]: string } = {};
let secretClient: SecretManagerServiceClient;

/**
 * Initialize the Secret Manager client and preload secrets.
 * @param secretEnvVars List of env var names that contain secret paths
 */
export const initializeSecrets = async (
  secretEnvVars: string[]
): Promise<void> => {
  if (process.env.NODE_ENV !== 'production') {
    reportDebug({
      namespace: 'engine:secretManager',
      message: 'Development mode → using local files for secrets'
    });
    return; // No need to preload anything
  }

  try {
    // Default creds (for GCP runtime)
    secretClient = new SecretManagerServiceClient();

    const secretNames = secretEnvVars.filter((name) => process.env[name]);
    if (secretNames.length === 0) {
      throw new EngineError({
        message: 'No secret names defined in environment variables'
      });
    }

    // Fetch all secrets from GCP Secret Manager
    for (const name of secretNames) {
      const secretPath = process.env[name];
      if (!secretPath) {
        throw new EngineError({
          message: `Secret path for ${name} is not defined`
        });
      }

      try {
        const [version] = await secretClient.accessSecretVersion({
          name: secretPath
        });
        const payload = version.payload?.data?.toString('utf-8');
        if (!payload) {
          throw new EngineError({
            message: `Secret ${name} not found or empty`
          });
        }
        secretCache[name] = payload;
      } catch (err) {
        throw new EngineError({
          message: `Error accessing secret ${name}: ${(err as Error).message}`
        });
      }
    }
  } catch (err) {
    throw new EngineError({
      message: `Failed to initialize secrets: ${(err as Error).message}`
    });
  }
};
