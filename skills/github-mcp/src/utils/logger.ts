/**
 * Structured Logger
 * 
 * 基于官方 GitHub MCP Server 的 slog 设计
 * 提供结构化日志输出
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
 * 创建日志条目
 */
function createLogEntry(level: string, message: string, meta?: Record<string, any>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
}

/**
 * 格式化日志输出
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
    
    const entry = createLogEntry(levelStr, message, {
      ...(this.component && { component: this.component }),
      ...meta,
    });
    
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
  
  /**
   * 创建子 Logger
   */
  child(component: string): Logger {
    return new ConsoleLogger(this.minLevel, component);
  }
}

/**
 * File Logger 实现
 */
export class FileLogger implements Logger {
  private minLevel: LogLevel;
  private component?: string;
  private filePath: string;
  
  constructor(filePath: string, minLevel: LogLevel = LogLevel.INFO, component?: string) {
    this.minLevel = minLevel;
    this.component = component;
    this.filePath = filePath;
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }
  
  private async write(entry: LogEntry): Promise<void> {
    const formatted = formatLogEntry(entry) + '\n';
    // 注意：实际使用时需要使用 fs.appendFileSync
    // 这里只是返回格式化后的字符串
    return formatted as any;
  }
  
  debug(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = createLogEntry('debug', message, { ...(this.component && { component: this.component }), ...meta });
    console.log(formatLogEntry(entry));
  }
  
  info(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = createLogEntry('info', message, { ...(this.component && { component: this.component }), ...meta });
    console.log(formatLogEntry(entry));
  }
  
  warn(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = createLogEntry('warn', message, { ...(this.component && { component: this.component }), ...meta });
    console.warn(formatLogEntry(entry));
  }
  
  error(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const entry = createLogEntry('error', message, { ...(this.component && { component: this.component }), ...meta });
    console.error(formatLogEntry(entry));
  }
  
  child(component: string): Logger {
    return new FileLogger(this.filePath, this.minLevel, component);
  }
}

/**
 * 创建 Logger
 */
export function createLogger(config?: {
  level?: 'debug' | 'info' | 'warn' | 'error';
  component?: string;
  filePath?: string;
}): Logger {
  const levelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };
  
  const minLevel = levelMap[config?.level || 'info'] || LogLevel.INFO;
  
  if (config?.filePath) {
    return new FileLogger(config.filePath, minLevel, config.component);
  }
  
  return new ConsoleLogger(minLevel, config?.component);
}

/**
 * 默认 Logger
 */
export const logger = createLogger({ level: 'info', component: 'github-mcp' });

/**
 * GitHub MCP 专用 Logger
 */
export function createGitHubMCPLogger(component: string): Logger {
  return createLogger({ level: 'info', component });
}
