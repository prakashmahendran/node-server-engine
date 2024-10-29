import { createHmac } from '../createHmac';
import { HmacOptions } from '../index.types';

/** Add signature to a payload */
export function signPayload<T>(
  payload: T,
  options: HmacOptions = {}
): T & {
  /** HMAC signature of the payload */
  signature: string;
} {
  return {
    ...payload,
    signature: createHmac(payload, { ...options, encode: 'base64' }) as string
  };
}
