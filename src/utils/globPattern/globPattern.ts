/**
 * A glob pattern for files under `directory`. Glob libraries only accept forward slashes (a backslash
 * escapes the next character), so a Windows path such as C:\app\dist must become C:/app/dist first.
 *   globPattern('C:\\app\\dist\\db\\migrations', '*.js') === 'C:/app/dist/db/migrations/*.js'
 */
export function globPattern(directory: string, pattern: string): string {
  return `${directory.replace(/\\/g, '/').replace(/\/+$/, '')}/${pattern}`;
}
