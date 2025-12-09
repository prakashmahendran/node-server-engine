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
 * Format timestamp as HH:MM:SS
 */
function formatTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

/**
 * Format log entry for human-readable local development output
 */
function formatLocalLog(entry: FullLogEntry): string {
  const time = formatTime();
  const severity = entry.severity || 'INFO';
  const severityColor = getSeverityColor(severity);
  const showDetailedLogs = process.env.DETAILED_LOGS === 'true';
  
  const parts: string[] = [];
  
  // Timestamp and severity
  parts.push(
    `${colors.gray}[${time}]${colors.reset} ${severityColor}${severity.padEnd(8)}${colors.reset}`
  );
  
  // Message
  if (entry.message) {
    parts.push(`${entry.message}`);
  }
  
  let output = parts.join(' ');
  
  // Error details (compact format)
  if (entry.errorType || entry.errorCode || entry.statusCode) {
    const errorParts: string[] = [];
    if (entry.errorCode) errorParts.push(`${colors.red}${entry.errorCode}${colors.reset}`);
    if (entry.statusCode) {
      const statusColor = entry.statusCode >= 500 ? colors.red : entry.statusCode >= 400 ? colors.yellow : colors.green;
      errorParts.push(`${statusColor}${entry.statusCode}${colors.reset}`);
    }
    if (errorParts.length > 0) {
      output += ` ${colors.dim}[${errorParts.join(' ')}]${colors.reset}`;
    }
  }
  
  // HTTP request context (compact)
  if (entry.context?.httpRequest) {
    const req = entry.context.httpRequest;
    output += ` ${colors.dim}${req.method} ${req.url}${colors.reset}`;
  }
  
  // Stack trace (only in detailed mode)
  if (showDetailedLogs && entry.stack_trace) {
    output += `\n${colors.gray}Stack Trace:${colors.reset}\n${colors.dim}${entry.stack_trace}${colors.reset}`;
  }
  
  // Additional data (only in detailed mode or if no message)
  if (showDetailedLogs && entry.data && Object.keys(entry.data).length > 0) {
    output += `\n${colors.cyan}Data:${colors.reset}\n${colors.dim}${JSON.stringify(entry.data, null, 2)}${colors.reset}`;
  }
  
  // File location (only in detailed mode)
  if (showDetailedLogs && entry.fileName) {
    output += `\n  ${colors.dim}${entry.fileName}:${entry.lineNumber || '?'}${colors.reset}`;
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
