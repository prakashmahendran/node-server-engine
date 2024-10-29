import { makeValidator } from 'envalid';
import validator from 'validator';

/**
 * Validate that a string is a list of comma separated host names
 */
export const envIsHostList = makeValidator((value): boolean => {
  if (!value) throw new Error('expected a host name');
  const hosts = value.split(',');
  const valid = hosts.every(
    (host) =>
      validator.isIP(host.trim()) ||
      validator.isFQDN(host.trim(), { require_tld: false })
  );
  if (!valid) throw new Error('expected a host name');
  return valid;
});
