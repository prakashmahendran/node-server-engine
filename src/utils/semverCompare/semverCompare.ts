import validator from 'validator';
import { EngineError } from 'entities/EngineError';

// Regex to validate our SemVer style and capture the different parts
const SEMVER_REGEX =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:(alpha|beta|rc)(?:\.(0|[1-9]\d*))))?$/;

/**
 * Comparison function for our SemVer strings, includes support for pre-releases
 * @param v1 - First version string to compare
 * @param v2 - Second version string to compare
 * @returns -1 if v1 < v2, 0 if v1 = v2, +1 if v1 > v2
 */
export function semverCompare(v1: string, v2: string): 1 | -1 | 0 {
  const [match1, match2] = [v1, v2].map((v) => v.match(SEMVER_REGEX));
  
  if (!match1 || !match2) {
    throw new EngineError({
      message: 'Provided invalid SemVer string, cannot compare',
      data: { v1, v2 }
    });
  }

  const [
    [, major1, minor1, patch1, preType1, preVersion1],
    [, major2, minor2, patch2, preType2, preVersion2]
  ] = [match1, match2].map((group) =>
    // Parse numeric values
    group.map((item) => (item && validator.isInt(item) ? parseInt(item, 10) : item))
  );

  // Compare majors first
  if (major1 < major2) return -1;
  if (major1 > major2) return 1;

  // Compare minors second
  if (minor1 < minor2) return -1;
  if (minor1 > minor2) return 1;

  // Compare patch third
  if (patch1 < patch2) return -1;
  if (patch1 > patch2) return 1;

  // Compare pre-release type
  // Release > pre-release
  if (!preType1 && !preType2) return 0;
  if (preType1 && !preType2) return -1;
  if (!preType1 && preType2) return 1;

  // RC > Beta > Alpha
  if (preType1 !== 'rc' && preType2 === 'rc') return -1;
  if (preType1 === 'rc' && preType2 !== 'rc') return 1;
  if (preType1 !== 'beta' && preType2 === 'beta') return -1;
  if (preType1 === 'beta' && preType2 !== 'beta') return 1;

  // Finally compare the pre-release versions
  if (preVersion1 < preVersion2) return -1;
  if (preVersion1 > preVersion2) return 1;

  return 0;
}
