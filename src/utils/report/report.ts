import { Request } from 'express';
import { output } from './output';
import { LogEntry, FullLogEntry } from './output.types';
import { DebugLogEntry, InfoLogEntry } from './report.types';
import { LogSeverity } from 'const';
import { EngineError } from 'entities/EngineError';
import { WebError } from 'entities/WebError';
import {} from 'middleware/authHmac/authHmac.types';
import {} from 'middleware/authJwt/authJwt.types';
import {} from 'middleware/authTls/authTls.types';

/** Default generic logger */
export function reportInfo(data: InfoLogEntry | string): FullLogEntry {
  return output({
    severity: LogSeverity.INFO,
    ...(typeof data === 'string' ? { message: data } : data)
  });
}

/** Error specific logger */
export function reportError(
  error: unknown | Error | EngineError | WebError,
  request?: Request
): FullLogEntry {
  let logEntry: LogEntry =
    error instanceof Error
      ? {
          message: error.message,
          stack_trace: error.stack,
          severity: LogSeverity.ERROR
        }
      : {
          message: 'An unknown error occurred',
          data: error,
          severity: LogSeverity.CRITICAL
        };

  if (error instanceof EngineError) {
    logEntry = {
      ...logEntry,
      severity: error.severity,
      errorType: error.constructor.name,
      data: error.data,
      '@type':
        !(error instanceof WebError) || error.statusCode >= 500
          ? 'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent'
          : undefined
    };
  }

  if (error instanceof WebError) {
    logEntry = {
      ...logEntry,
      errorCode: error.errorCode,
      statusCode: error.statusCode
    };
  }

  if (request) {
    logEntry = {
      ...logEntry,
      context: {
        user:
          request.user?.id ?? request.hosts?.join(','),
        httpRequest: {
          url: request.originalUrl,
          method: request.method,
          referrer: request.header('Referer'),
          userAgent: request.header('User-Agent'),
          remoteIp: request.ip,
          responseStatusCode:
            error instanceof WebError ? error.statusCode : undefined
        }
      }
    };
  }

  return output(logEntry);
}

export let NAMESPACE_SELECTORS: Array<RegExp> | undefined;

/**
 * Generate the namespace selectors based on the DEBUG environment variable
 */
function initNamespaceSelector(): void {
  if (process.env.DEBUG) {
    NAMESPACE_SELECTORS = process.env.DEBUG.split(',').map(
      (namespace) => new RegExp(`^${namespace.replace(/\*/g, '.*?')}$`)
    );
  }
}

/**
 * Reset the namespace selectors
 */
export function resetNamespaceSelector(): void {
  NAMESPACE_SELECTORS = undefined;
}

let debugNamespace: string | undefined;

/**
 * Log a message for debugging purposes, based on a namespace specified in an environment variable
 * @param data - Debug log entry data
 * @returns The full log entry if namespace matches, undefined otherwise
 */
export function reportDebug(data: DebugLogEntry): FullLogEntry | undefined {
  if (!NAMESPACE_SELECTORS) {
    initNamespaceSelector();
  }
  
  let { namespace } = data;
  const isEngineReport = namespace?.startsWith('engine') ?? false;

  if (debugNamespace && !isEngineReport && namespace) {
    namespace = `${debugNamespace}:${namespace}`;
  }

  const match =
    namespace &&
    NAMESPACE_SELECTORS &&
    NAMESPACE_SELECTORS.some((selector) => selector.test(namespace));
    
  if (!match) return undefined;

  // Generate a prefix with the rightmost part of the namespace
  const spaces = namespace.split(':');
  const prefix = spaces[spaces.length - 1];

  return output({
    severity: LogSeverity.DEBUG,
    ...data,
    message: `[${prefix}] ${data.message}`
  });
}

/**
 * Specify a global debugging namespace
 * @param globalNamespace - The namespace to set globally
 */
reportDebug.setNameSpace = function (globalNamespace: string): void {
  debugNamespace = globalNamespace;
};

/**
 * Remove any defined global namespace
 */
reportDebug.clearNamespace = function (): void {
  debugNamespace = undefined;
};
