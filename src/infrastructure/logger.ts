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
        console.debug(formatMessage('debug', message, ...args));
      }
    },
    
    info: (message: string, ...args: any[]) => {
      if (shouldLog('info')) {
        console.info(formatMessage('info', message, ...args));
      }
    },
    
    warn: (message: string, ...args: any[]) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message, ...args));
      }
    },
    
    error: (message: string, ...args: any[]) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', message, ...args));
      }
    },
  };
}