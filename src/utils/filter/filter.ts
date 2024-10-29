/**
 * Filters an object, returns a copy of that object with only the keys specified in the whitelist
 * @param object - The object to filter
 * @param whitelist - A list of keys to keep
 */
export function filter<T extends Record<string, unknown>>(
  object: T,
  whitelist: Array<string>
): T {
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(object)) {
    if (whitelist.includes(key)) {
      copy[key] = object[key];
    }
  }
  return copy as T;
}
