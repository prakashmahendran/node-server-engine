import { randomUUID } from 'crypto';
import callsite from 'callsite';
import stringify from 'json-stringify-safe';
import { LogEntry, FullLogEntry } from './output.types';

// NOTE: Server instance id (helpful for distributed logs)
export const INSTANCE_ID = randomUUID();

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

  const entry = stringify(fullEntry);
  // Ignore when silenced
  if (process.env.SILENCE_REPORT) return fullEntry;

  if (process.env.NODE_ENV === 'test') {
    // In test mode pretty print
    console.dir(fullEntry, { depth: 5 });
  } else if (data.statusCode && data.statusCode >= 500) {
    // Log to stderr when it is a 500+ error
    console.error(entry);
  } else {
    // Default to regular logging
    console.log(entry);
  }
  return fullEntry;
}
