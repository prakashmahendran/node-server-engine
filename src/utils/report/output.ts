import { randomUUID } from 'crypto';
import callsite from 'callsite';
import stringify from 'json-stringify-safe';
import { LogEntry, FullLogEntry } from './output.types';
import { LogSeverity } from 'const';

// NOTE: Server instance id (helpful for distributed logs)
export const INSTANCE_ID = randomUUID();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

/**
 * Get color for log severity level
 */
function getSeverityColor(severity?: string): string {
  switch (severity) {
    case LogSeverity.DEBUG:
      return colors.cyan;
    case LogSeverity.INFO:
      return colors.green;
    case LogSeverity.WARNING:
      return colors.yellow;
    case LogSeverity.ERROR:
      return colors.red;
    case LogSeverity.CRITICAL:
      return `${colors.bright}${colors.red}`;
    default:
      return colors.white;
  }
}

/**
 * Format log entry for human-readable local development output
 */
function formatLocalLog(entry: FullLogEntry): string {
  const timestamp = new Date().toISOString();
  const severity = entry.severity || 'INFO';
  const severityColor = getSeverityColor(severity);
  
  const parts: string[] = [];
  
  // Timestamp and severity
  parts.push(
    `${colors.gray}[${timestamp}]${colors.reset} ${severityColor}${severity.padEnd(8)}${colors.reset}`
  );
  
  // File location
  if (entry.fileName) {
    parts.push(`${colors.dim}${entry.fileName}:${entry.lineNumber || '?'}${colors.reset}`);
  }
  
  // Message
  if (entry.message) {
    parts.push(`${colors.bright}${entry.message}${colors.reset}`);
  }
  
  let output = parts.join(' ');
  
  // Error details
  if (entry.errorType) {
    output += `\n  ${colors.red}Error Type:${colors.reset} ${entry.errorType}`;
  }
  
  if (entry.errorCode) {
    output += `\n  ${colors.red}Error Code:${colors.reset} ${entry.errorCode}`;
  }
  
  if (entry.statusCode) {
    const statusColor = entry.statusCode >= 500 ? colors.red : entry.statusCode >= 400 ? colors.yellow : colors.green;
    output += `\n  ${colors.cyan}Status:${colors.reset} ${statusColor}${entry.statusCode}${colors.reset}`;
  }
  
  // Stack trace
  if (entry.stack_trace) {
    output += `\n${colors.gray}Stack Trace:${colors.reset}\n${colors.dim}${entry.stack_trace}${colors.reset}`;
  }
  
  // Additional data
  if (entry.data && Object.keys(entry.data).length > 0) {
    output += `\n${colors.cyan}Data:${colors.reset}\n${colors.dim}${JSON.stringify(entry.data, null, 2)}${colors.reset}`;
  }
  
  // HTTP request context
  if (entry.context?.httpRequest) {
    const req = entry.context.httpRequest;
    output += `\n${colors.magenta}Request:${colors.reset}`;
    output += `\n  ${colors.dim}${req.method} ${req.url}${colors.reset}`;
    if (req.userAgent) {
      output += `\n  ${colors.dim}User-Agent: ${req.userAgent}${colors.reset}`;
    }
    if (req.remoteIp) {
      output += `\n  ${colors.dim}IP: ${req.remoteIp}${colors.reset}`;
    }
  }
  
  return output;
}

/**
 * Check if running in local development environment
 */
function isLocalDevelopment(): boolean {
  // Allow forcing local format via environment variable
  if (process.env.LOG_FORMAT === 'local') return true;
  if (process.env.LOG_FORMAT === 'json') return false;
  
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    (!process.env.NODE_ENV && !process.env.KUBERNETES_POD_NAME && !process.env.CLOUD_RUN_JOB)
  );
}

/** Add metadata to the log entry and print it */
export function output(data: LogEntry): FullLogEntry {
  // Gather useful information about where the logger was called from
  const call = callsite()[2];

  // Append additional metadata to the log entry
  const fullEntry: FullLogEntry = {
    ...data,
    lineNumber: call.getLineNumber(),
    fileName: call
      .getFileName()
      .replace(/.*node_modules\//, '')
      .replace(/.*src\//, 'src/'),
    serviceContext: {
      service: process.env.CHART ?? process.env.HOSTNAME,
      version: process.env.BUILD_ID,
      environment: process.env.NODE_ENV,
      instance: process.env.KUBERNETES_POD_NAME ?? INSTANCE_ID
    }
  };

  // Ignore when silenced
  if (process.env.SILENCE_REPORT) return fullEntry;

  if (process.env.NODE_ENV === 'test') {
    // In test mode pretty print with full depth
    console.dir(fullEntry, { depth: 5 });
  } else if (isLocalDevelopment()) {
    // Local development: use formatted, colorized output
    const formattedLog = formatLocalLog(fullEntry);
    if (data.severity === LogSeverity.ERROR || data.severity === LogSeverity.CRITICAL || (data.statusCode && data.statusCode >= 500)) {
      console.error(formattedLog);
    } else {
      console.log(formattedLog);
    }
  } else {
    // Production/GCP: use JSON format for structured logging
    const entry = stringify(fullEntry);
    if (data.statusCode && data.statusCode >= 500) {
      console.error(entry);
    } else {
      console.log(entry);
    }
  }
  
  return fullEntry;
}
