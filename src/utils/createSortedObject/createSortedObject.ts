/**
 * Deep sort object keys alphabetically
 * @param data - The object to sort
 * @returns A new object with sorted keys
 */
export function createSortedObject<T>(data: T): T {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Input must be a non-null object');
  }

  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === 'object' && item !== null ? createSortedObject(item) : item
    ) as T;
  }

  const result: Record<string, unknown> = {};
  
  Object.keys(data)
    .sort()
    .forEach((key: string) => {
      const value = (data as Record<string, unknown>)[key];
      
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        result[key] = Array.isArray(value)
          ? value.map((item) =>
              typeof item === 'object' && item !== null
                ? createSortedObject(item)
                : item
            )
          : value;
      } else {
        result[key] = createSortedObject(value);
      }
    });
    
  return result as T;
}
