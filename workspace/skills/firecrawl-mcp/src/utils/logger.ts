/**
 * Firecrawl MCP Logger
 * 结构化日志输出
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  component?: string;
  [key: string]: any;
}

export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

/**
 * 格式化日志条目
 */
function formatLogEntry(entry: LogEntry): string {
  // Extract known fields and remaining meta
  const { timestamp, level, message, component, ...rest } = entry;
  const extraMeta = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  const componentStr = component ? ` [${component}]` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${componentStr}${extraMeta}`;
}

/**
 * Console Logger 实现
 */
export class ConsoleLogger implements Logger {
  private minLevel: LogLevel;
  private component?: string;
  
  constructor(minLevel: LogLevel = LogLevel.INFO, component?: string) {
    this.minLevel = minLevel;
    this.component = component;
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }
  
  private log(level: LogLevel, levelStr: string, message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelStr,
      message,
      ...(this.component && { component: this.component }),
      ...meta,
    };
    
    const formatted = formatLogEntry(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }
  
  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, 'debug', message, meta);
  }
  
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, 'info', message, meta);
  }
  
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, 'warn', message, meta);
  }
  
  error(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, 'error', message, meta);
  }
  
  child(component: string): Logger {
    return new ConsoleLogger(this.minLevel, component);
  }
}

/**
 * 创建 Logger
 */
export function createLogger(config?: {
  level?: 'debug' | 'info' | 'warn' | 'error';
  component?: string;
}): Logger {
  const levelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };
  
  const minLevel = levelMap[config?.level || 'info'] || LogLevel.INFO;
  
  return new ConsoleLogger(minLevel, config?.component);
}

/**
 * 默认 Logger
 */
export const logger = createLogger({ level: 'info', component: 'firecrawl-mcp' });

/**
 * 创建爬取专用 Logger
 */
export function createCrawlLogger(): Logger {
  return createLogger({ level: 'info', component: 'firecrawl-crawl' });
}

/**
 * 创建 API 专用 Logger
 */
export function createApiLogger(): Logger {
  return createLogger({ level: 'info', component: 'firecrawl-api' });
}
