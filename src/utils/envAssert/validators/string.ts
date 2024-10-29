import { makeValidator } from 'envalid';

/**
 * Validate that aa value is a string
 */
export const envIsString = makeValidator((value): boolean => {
  if (!value || typeof value !== 'string') throw new Error('expected a string');
  return value.length > 0;
});
