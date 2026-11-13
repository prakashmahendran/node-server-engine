import { ParamSchema } from 'express-validator';

/**
 * Field rules for endpoint validators (express-validator schemas), so every service checks input the same
 * strict way:
 * - body values are checked by JSON type: a number must be a number, a boolean a boolean, a string a string
 *   ("5" is not a number in a JSON body);
 * - query and path values are strings; numbers there are converted (`toInt`);
 * - a field with a `default` gets it when missing; `optional` fields stay absent.
 */
export type Location = 'body' | 'query' | 'params';

/** A calendar date 'YYYY-MM-DD' */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A time of day 'HH:MM' (24 h) */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StringRule {
  min?: number;
  max: number;
  optional?: boolean;
  /** Trim before checking (the trimmed value is what the handler gets) */
  trim?: boolean;
  matches?: RegExp;
  message?: string;
  default?: string;
}

/** A string, optionally trimmed, with a length and pattern */
export function string(location: Location, rule: StringRule): ParamSchema {
  const message =
    rule.message ?? `Must be text of ${rule.min ?? 0}–${rule.max} characters`;
  return {
    in: [location],
    ...(rule.optional ? { optional: true } : {}),
    ...(rule.default !== undefined
      ? { default: { options: rule.default } }
      : {}),
    isString: { errorMessage: message, bail: true },
    ...(rule.trim ? { trim: true } : {}),
    isLength: {
      options: { min: rule.min ?? 0, max: rule.max },
      errorMessage: message
    },
    ...(rule.matches
      ? { matches: { options: rule.matches, errorMessage: message } }
      : {})
  };
}

/** An email address, trimmed and in lower case */
export function email(
  location: Location,
  options: { optional?: boolean; message?: string } = {}
): ParamSchema {
  const message = options.message ?? 'Enter a valid email address';
  return {
    in: [location],
    ...(options.optional ? { optional: true } : {}),
    isString: { errorMessage: message, bail: true },
    trim: true,
    toLowerCase: true,
    isEmail: { errorMessage: message, bail: true },
    isLength: { options: { max: 254 }, errorMessage: message }
  };
}

/**
 * A UUID. `nullable` also accepts null (e.g. to clear a link); `orValues` also accepts these words
 * (e.g. 'none' in a filter).
 */
export function uuid(
  location: Location,
  options: {
    optional?: boolean;
    nullable?: boolean;
    orValues?: ReadonlyArray<string>;
  } = {}
): ParamSchema {
  const words = options.orValues ?? [];
  return {
    in: [location],
    ...(options.optional || options.nullable
      ? {
          optional: {
            options: { values: options.nullable ? 'null' : 'undefined' }
          }
        }
      : {}),
    custom: {
      options: (v: unknown) =>
        typeof v === 'string' && (UUID_RE.test(v) || words.includes(v)),
      errorMessage: words.length
        ? `Must be an id or one of: ${words.join(', ')}`
        : 'Must be an id'
    }
  };
}

/** One of a fixed list of strings */
export function oneOf(
  location: Location,
  values: ReadonlyArray<string>,
  options: { optional?: boolean; default?: string; message?: string } = {}
): ParamSchema {
  return {
    in: [location],
    ...(options.optional ? { optional: true } : {}),
    ...(options.default !== undefined
      ? { default: { options: options.default } }
      : {}),
    custom: {
      options: (v: unknown) => typeof v === 'string' && values.includes(v),
      errorMessage: options.message ?? `Must be one of: ${values.join(', ')}`
    }
  };
}

interface IntRule {
  min?: number;
  max?: number;
  optional?: boolean;
  /** Also accept null (stored as NULL) */
  nullable?: boolean;
  default?: number;
  /** Extra condition, e.g. "0 or 5–480" */
  check?: (n: number) => boolean;
  message?: string;
}

/** A whole number. In the body it must be a JSON number; in the query it is converted. */
export function int(location: Location, rule: IntRule = {}): ParamSchema {
  const min = rule.min ?? Number.MIN_SAFE_INTEGER;
  const max = rule.max ?? Number.MAX_SAFE_INTEGER;
  const message =
    rule.message ??
    (rule.min !== undefined && rule.max !== undefined
      ? `Must be a whole number from ${min} to ${max}`
      : 'Must be a whole number');
  const ok = (n: number): boolean =>
    Number.isInteger(n) &&
    n >= min &&
    n <= max &&
    (!rule.check || rule.check(n));
  if (location === 'query')
    return {
      in: [location],
      ...(rule.optional ? { optional: true } : {}),
      ...(rule.default !== undefined
        ? { default: { options: String(rule.default) } }
        : {}),
      isInt: { errorMessage: message, bail: true },
      toInt: true,
      custom: { options: (v: number) => ok(v), errorMessage: message }
    };
  return {
    in: [location],
    ...(rule.optional || rule.nullable
      ? {
          optional: {
            options: { values: rule.nullable ? 'null' : 'undefined' }
          }
        }
      : {}),
    ...(rule.default !== undefined
      ? { default: { options: rule.default } }
      : {}),
    custom: {
      options: (v: unknown) => typeof v === 'number' && ok(v),
      errorMessage: message
    }
  };
}

/** A JSON boolean */
export function bool(
  location: Location,
  options: { optional?: boolean; default?: boolean } = {}
): ParamSchema {
  return {
    in: [location],
    ...(options.optional ? { optional: true } : {}),
    ...(options.default !== undefined
      ? { default: { options: options.default } }
      : {}),
    custom: {
      options: (v: unknown) => typeof v === 'boolean',
      errorMessage: 'Must be true or false'
    }
  };
}

/** A calendar date 'YYYY-MM-DD' */
export function date(
  location: Location,
  options: { optional?: boolean } = {}
): ParamSchema {
  return string(location, {
    max: 10,
    optional: options.optional,
    matches: DATE_RE,
    message: 'Must be a date (YYYY-MM-DD)'
  });
}

/** A time of day 'HH:MM'; `nullable` accepts null and makes it the default */
export function time(
  location: Location,
  options: { optional?: boolean; nullable?: boolean } = {}
): ParamSchema {
  const message = 'Must be a time (HH:MM)';
  if (options.nullable)
    return {
      in: [location],
      default: { options: null },
      custom: {
        options: (v: unknown) =>
          v === null || (typeof v === 'string' && TIME_RE.test(v)),
        errorMessage: message
      }
    };
  return string(location, {
    max: 5,
    optional: options.optional,
    matches: TIME_RE,
    message
  });
}

/** page (from 1) and pageSize of a list, in the query string */
export function page(
  options: { maxPageSize?: number; pageSize?: number } = {}
): Record<string, ParamSchema> {
  return {
    page: int('query', { min: 1, default: 1 }),
    pageSize: int('query', {
      min: 1,
      max: options.maxPageSize ?? 100,
      default: options.pageSize ?? 25
    })
  };
}
