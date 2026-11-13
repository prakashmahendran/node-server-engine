import { makeValidator } from 'envalid';

/**
 * Validate that a value is a non-empty string, and return it (so `choices` and `default` are strings)
 */
export const envIsString = makeValidator<string>((value): string => {
  if (!value || typeof value !== 'string') throw new Error('expected a string');
  return value;
});
