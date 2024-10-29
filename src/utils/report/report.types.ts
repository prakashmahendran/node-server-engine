import { LogEntry } from './output.types';
import { LogSeverity } from 'const';

/** Structure of debug logs */
export interface DebugLogEntry extends Omit<LogEntry, 'severity'> {
  /** Debugging namespace in which the entry is */
  namespace: string;
}

export type InfoLogEntry = Omit<LogEntry, 'severity'> & {
  /** Severity level of the entries */
  severity?: LogSeverity;
};
