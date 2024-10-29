import { assertEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';

/**
 * Check that secret used to sign payloads is properly set in the environment
 */
export function assertPayloadSignatureSecret(): void {
  assertEnvironment({ PAYLOAD_SIGNATURE_SECRET: envAssert.isString() });
}
