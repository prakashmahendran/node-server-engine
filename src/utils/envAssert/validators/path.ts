import { makeValidator } from 'envalid';

const pathRegex = /^(\.\.\/(?:\.\.\/)*)?(?!.*?\/\/)(?!(?:.*\/)?\.+(?:\/|$)).+$/;

/**
 * Validate that a string is a system path (linux only)
 */
export const envIsPath = makeValidator((value): boolean => {
  if (!value) throw new Error('expected a path');
  const valid = pathRegex.test(value);
  if (!valid) throw new Error('expected a path');
  return valid;
});
