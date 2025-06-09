import { nanoid } from 'nanoid';

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  data?: any;
  level: 'info' | 'warn' | 'error';
}

const MAX_LOGS = 1000;

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(level: LogEntry['level'], message: string, data?: any) {
    const logEntry: LogEntry = {
      id: nanoid(),
      timestamp: new Date().toISOString(),
      message,
      data,
      level
    };

    this.logs.unshift(logEntry);

    // Keep only the last MAX_LOGS entries
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    // Save to localStorage
    localStorage.setItem('appLogs', JSON.stringify(this.logs));

    // Also log to console
    const consoleData = data ? [message, data] : [message];
    switch (level) {
      case 'warn':
        console.warn(...consoleData);
        break;
      case 'error':
        console.error(...consoleData);
        break;
      default:
        console.log(...consoleData);
    }
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('appLogs');
  }

  loadLogsFromStorage() {
    const storedLogs = localStorage.getItem('appLogs');
    if (storedLogs) {
      this.logs = JSON.parse(storedLogs);
    }
  }
}

export const logger = Logger.getInstance();

// Initialize logs from storage
logger.loadLogsFromStorage();

export function log(message: string, data?: any) {
  logger.info(message, data);
}

export function warn(message: string, data?: any) {
  logger.warn(message, data);
}

export function error(message: string, data?: any) {
  logger.error(message, data);
}

export default logger;