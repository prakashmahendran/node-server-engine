/** Deep sort the objects keys alphabetically */
export function createSortedObject<T>(data: T): T {
  if (!(data instanceof Object)) throw new Error('Non');
  const result: Record<string, unknown> = {};
  Object.keys(data)
    .sort()
    .forEach((key: string) => {
      const value = (data as Record<string, unknown>)[key];
      if (
        typeof value !== 'object' ||
        value instanceof Array ||
        value === null
      ) {
        result[key] = value;
      } else {
        result[key] = createSortedObject(value);
      }
    });
  return result as T;
}
