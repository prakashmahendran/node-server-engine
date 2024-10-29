import crypto from 'crypto';
import { assertPayloadSignatureSecret } from '../checkEnv';
import { HmacOptions } from '../index.types';
import { createSortedObject } from 'utils/createSortedObject';

/** Calculates the HMAC signature for a given payload */
export function createHmac(
  payload: unknown,
  options: HmacOptions = {}
): Buffer | string {
  // Check env if no secret is specified
  if (!options.secret) {
    assertPayloadSignatureSecret();
  }
  // Set default values
  const settings = {
    algorithm: options.algorithm ?? 'sha512',
    sort: options.sort ?? true,
    encode: options.encode,
    secret: options.secret ?? (process.env.PAYLOAD_SIGNATURE_SECRET as string)
  };

  // Stringify the payload
  const sortedPayload = settings.sort ? createSortedObject(payload) : payload;
  const stringifiedPayload = JSON.stringify(sortedPayload);

  // Calculate the hash
  const hmac = crypto
    .createHmac(settings.algorithm, settings.secret)
    .update(stringifiedPayload);

  return settings.encode ? hmac.digest(settings.encode) : hmac.digest();
}
