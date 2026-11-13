import { assertEnvironment, envAssert } from 'utils';

/**
 * Environment variable validator for the creation of a HTTP(S) server
 */
export function validateHttpEnvironment(): void {
  // HTTPS as soon as either file is given: both must then exist, rather than falling back to plain HTTP
  if (process.env.TLS_SERVER_KEY || process.env.TLS_SERVER_CERT) {
    assertEnvironment({ TLS_SERVER_KEY: envAssert.isPath() });
    assertEnvironment({ TLS_SERVER_CERT: envAssert.isPath() });
    // Optional variables
    if (process.env.TLS_SERVER_KEY_PASSPHRASE) {
      assertEnvironment({ TLS_SERVER_KEY_PASSPHRASE: envAssert.isString() });
    }
    if (process.env.TLS_CA) assertEnvironment({ TLS_CA: envAssert.isPath() });
  }
}
