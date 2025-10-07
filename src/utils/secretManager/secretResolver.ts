import fs from 'fs';
import { EngineError } from 'entities/EngineError';
import { secretCache } from './secretLoader';

/**
 * Retrieve a secret value (production) or file content (development).
 * @param name The env var name that contains either the secret path (prod) or local file path (dev)
 */
export const getSecretOrFile = (name: string): string => {
  if (process.env.NODE_ENV === 'production') {
    const secretValue = secretCache[name];
    console.log('SecrrtCj', secretCache);

    if (!secretValue) {
      throw new EngineError({
        message: `Secret value for ${name} not found in cache`
      });
    }
    return secretValue;
  } else {
    const localPath = process.env[name];
    if (!localPath) {
      throw new EngineError({
        message: `Local path for ${name} is not defined`
      });
    }

    try {
      return fs.readFileSync(localPath, 'utf-8');
    } catch (err) {
      throw new EngineError({
        message: `Error reading local file for ${name}: ${(err as Error).message}`
      });
    }
  }
};
