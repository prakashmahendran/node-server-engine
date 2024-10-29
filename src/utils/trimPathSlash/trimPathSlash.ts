/**
 * Remove slashes if they are the first or last chars of a string
 * @param url - URL to which slashes should be stripped
 * @return Cleaned-up string
 */
export function trimPathSlash(url: string): string {
  return url.replace(/\/$/, '').replace(/^\//, '');
}
