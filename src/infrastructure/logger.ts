/**
 * Logging infrastructure for roslyn-mcp
 */

import type { Logger } from '../types/index.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(level: LogLevel = 'info'): Logger {
  const currentLevel = LOG_LEVELS[level];

  const shouldLog = (logLevel: LogLevel): boolean => {
    return LOG_LEVELS[logLevel] >= currentLevel;
  };

  const formatMessage = (level: LogLevel, message: string, ...args: any[]): string => {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${argsStr}`;
  };

  return {
    debug: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) {
        process.stderr.write(formatMessage('debug', message, ...args) + '\n');
      }
    },
    
    info: (message: string, ...args: any[]) => {
      if (shouldLog('info')) {
        process.stderr.write(formatMessage('info', message, ...args) + '\n');
      }
    },
    
    warn: (message: string, ...args: any[]) => {
      if (shouldLog('warn')) {
        process.stderr.write(formatMessage('warn', message, ...args) + '\n');
      }
    },
    
    error: (message: string, ...args: any[]) => {
      if (shouldLog('error')) {
        process.stderr.write(formatMessage('error', message, ...args) + '\n');
      }
    },
  };
}