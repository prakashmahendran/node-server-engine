import crypto from 'crypto';
import { createHmac } from '../createHmac';
import { HmacOptions } from '../index.types';

/** Checks the signature of a payload */
export function verifySignature(
  payload: Record<string, unknown>,
  signature: string,
  options: HmacOptions = {}
): boolean {
  if (!payload || !signature) return false;
  // Obtain a buffer digest
  const digest = createHmac(payload, {
    ...options,
    encode: undefined
  }) as Buffer;
  // Transform the signature to buffer
  const checksum = Buffer.from(signature, options.encode ?? 'base64');
  // Compare signature with the calculated digest
  return (
    checksum.length === digest.length &&
    crypto.timingSafeEqual(digest, checksum)
  );
}
