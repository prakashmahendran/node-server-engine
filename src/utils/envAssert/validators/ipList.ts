import { makeValidator } from 'envalid';
import validator from 'validator';

/**
 * Validate that a string is a list of comma separated ip (V4/V6) addresses
 */
export const envIsIpList = makeValidator((value): boolean => {
  if (!value) throw new Error('expected an ip address');
  const ips = value.split(',');
  const valid = ips.every((v) => validator.isIP(v));
  if (!valid) throw new Error('expected an ip address');
  return valid;
});
