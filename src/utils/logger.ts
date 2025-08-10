import * as fs from 'fs';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logFile?: string;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public configure(logFile?: string, logLevel: LogLevel = LogLevel.INFO): void {
    this.logFile = logFile;
    this.logLevel = logLevel;
  }

  public debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const formattedMessage = this.formatMessage(message, ...args);
    const logEntry = `[${timestamp}] ${levelName}: ${formattedMessage}`;

    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, logEntry + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    } else {
      console.log(logEntry);
    }
  }

  private formatMessage(message: string, ...args: any[]): string {
    let formattedMessage = message;
    
    // Simple placeholder replacement for {} style formatting
    let argIndex = 0;
    formattedMessage = formattedMessage.replace(/\{\}/g, () => {
      if (argIndex < args.length) {
        return String(args[argIndex++]);
      }
      return '{}';
    });

    return formattedMessage;
  }
}