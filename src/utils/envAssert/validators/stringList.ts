import { makeValidator } from 'envalid';

/**
 * Validate that a string is a list of comma separated strings

 */
export const envIsStringList = makeValidator((value): boolean => {
  if (!value) throw new Error('expected a string');
  const strings = value.split(',');
  const valid = strings.every((v) => typeof v === 'string');
  if (!valid) throw new Error('expected a string');
  return valid;
});
