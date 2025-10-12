import { assertEnvironment, envAssert } from 'utils';
/**
 * Verify that the environment variables
 */
export function validateTlsConfig(): void {
  // We only check if there is at least the host specified
  if (process.env.TLS_REQUEST_CERT) {
    assertEnvironment({ TLS_REQUEST_KEY: envAssert.isPath() });
    assertEnvironment({ TLS_REQUEST_CERT: envAssert.isPath() });
    assertEnvironment({ TLS_REQUEST_CA: envAssert.isPath() });
    // Optional variables
    if (process.env.TLS_REQUEST_KEY_PASSPHRASE) {
      assertEnvironment({ TLS_REQUEST_KEY_PASSPHRASE: envAssert.isPath() });
    }
  } else if (process.env.TLS_SERVER_CERT) {
    // if no TLS Request setting, TLS Server setting is essential.
    assertEnvironment({ TLS_SERVER_KEY: envAssert.isPath() });
    assertEnvironment({ TLS_SERVER_CERT: envAssert.isPath() });
    assertEnvironment({ TLS_CA: envAssert.isPath() });
    // Optional variables
    if (process.env.TLS_SERVER_KEY_PASSPHRASE) {
      assertEnvironment({ TLS_SERVER_KEY_PASSPHRASE: envAssert.isPath() });
    }
  }
}
