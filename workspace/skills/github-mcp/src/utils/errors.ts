/**
 * GitHub MCP Error Types
 * 
 * 基于官方 GitHub MCP Server 的错误处理设计
 */

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 认证相关
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_SCOPES = 'INSUFFICIENT_SCOPES',
  
  // 权限相关
  ACCESS_DENIED = 'ACCESS_DENIED',
  REPOSITORY_NOT_FOUND = 'REPOSITORY_NOT_FOUND',
  REPOSITORY_ACCESS_RESTRICTED = 'REPOSITORY_ACCESS_RESTRICTED',
  
  // 限流相关
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ABUSE_RATE_LIMIT = 'ABUSE_RATE_LIMIT',
  
  // 验证相关
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_PARAMETER = 'MISSING_REQUIRED_PARAMETER',
  
  // 资源相关
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_GONE = 'RESOURCE_GONE',
  
  // 服务器相关
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // 网络相关
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // 工具相关
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_DISABLED = 'TOOL_DISABLED',
  
  // 通用
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * GitHub MCP 错误类
 */
export class GitMCPCError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly retryAfter?: number;
  public readonly details?: Record<string, any>;
  
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode?: number,
    options?: {
      retryAfter?: number;
      details?: Record<string, any>;
    }
  ) {
    super(message);
    this.name = 'GitMCPCError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfter = options?.retryAfter;
    this.details = options?.details;
    
    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitMCPCError);
    }
  }
  
  /**
   * 判断是否为可重试的错误
   */
  isRetryable(): boolean {
    // 限流错误可重试
    if (this.code === ErrorCode.RATE_LIMIT_EXCEEDED) return true;
    // 网络错误可重试
    if (this.code === ErrorCode.NETWORK_ERROR) return true;
    // 服务器错误可重试
    if (this.code === ErrorCode.SERVER_ERROR) return true;
    if (this.code === ErrorCode.SERVICE_UNAVAILABLE) return true;
    // 超时可重试
    if (this.code === ErrorCode.TIMEOUT) return true;
    
    return false;
  }
  
  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.AUTHENTICATION_FAILED:
        return '认证失败。请检查您的 GitHub Token 是否正确。';
      case ErrorCode.TOKEN_INVALID:
        return 'GitHub Token 无效。请提供一个有效的 Token。';
      case ErrorCode.TOKEN_EXPIRED:
        return 'GitHub Token 已过期。请刷新您的 Token。';
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return `API 请求次数超限。请等待 ${this.retryAfter || 60} 秒后重试。`;
      case ErrorCode.REPOSITORY_NOT_FOUND:
        return '仓库未找到。请检查仓库名称和所有权是否正确。';
      case ErrorCode.ACCESS_DENIED:
        return '访问被拒绝。您可能没有权限访问此资源。';
      case ErrorCode.VALIDATION_FAILED:
        return `输入验证失败: ${this.message}`;
      case ErrorCode.TOOL_NOT_FOUND:
        return `工具不存在: ${this.message}`;
      case ErrorCode.TOOL_DISABLED:
        return `工具已被禁用: ${this.message}`;
      default:
        return this.message;
    }
  }
  
  /**
   * 转换为 JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryAfter: this.retryAfter,
      details: this.details,
      isRetryable: this.isRetryable(),
      userMessage: this.getUserMessage(),
    };
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends GitMCPCError {
  constructor(message: string, statusCode?: number) {
    super(message, ErrorCode.AUTHENTICATION_FAILED, statusCode);
    this.name = 'AuthenticationError';
  }
}

/**
 * 限流错误
 */
export class RateLimitError extends GitMCPCError {
  constructor(retryAfter: number, message: string = 'API rate limit exceeded') {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 403, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends GitMCPCError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorCode.VALIDATION_FAILED, 400, { details });
    this.name = 'ValidationError';
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends GitMCPCError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.RESOURCE_NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 工具执行错误
 */
export class ToolExecutionError extends GitMCPCError {
  constructor(toolName: string, reason: string) {
    super(
      `Tool '${toolName}' execution failed: ${reason}`,
      ErrorCode.TOOL_EXECUTION_FAILED,
      undefined,
      { details: { toolName, reason } }
    );
    this.name = 'ToolExecutionError';
  }
}

/**
 * 工具未找到错误
 */
export class ToolNotFoundError extends GitMCPCError {
  constructor(toolName: string) {
    super(
      `Tool '${toolName}' not found`,
      ErrorCode.TOOL_NOT_FOUND,
      404,
      { details: { toolName } }
    );
    this.name = 'ToolNotFoundError';
  }
}

/**
 * 工具已禁用错误
 */
export class ToolDisabledError extends GitMCPCError {
  constructor(toolName: string, reason?: string) {
    super(
      `Tool '${toolName}' is disabled${reason ? `: ${reason}` : ''}`,
      ErrorCode.TOOL_DISABLED,
      403,
      { details: { toolName, reason } }
    );
    this.name = 'ToolDisabledError';
  }
}

/**
 * 从 Axios 错误创建 GitMCPCError
 */
export function createErrorFromAxiosError(error: any): GitMCPCError {
  const response = error.response;
  const status = response?.status;
  const data = response?.data;
  
  // GitHub API 错误消息
  const message = data?.message || error.message || 'Unknown error';
  
  // 根据状态码和错误类型分类
  if (status === 401) {
    return new AuthenticationError(message, status);
  }
  
  if (status === 403) {
    // 检查是否是限流
    if (data?.message?.includes('rate limit')) {
      const retryAfter = parseInt(response?.headers?.['retry-after'] || '60', 10);
      return new RateLimitError(retryAfter, message);
    }
    // 检查是否是 Abuse 限流
    if (data?.message?.includes('Abuse')) {
      return new RateLimitError(60, message);
    }
    // 否则是权限问题
    return new GitMCPCError(message, ErrorCode.ACCESS_DENIED, status);
  }
  
  if (status === 404) {
    return new NotFoundError('Resource', data?.resource);
  }
  
  if (status === 422) {
    return new ValidationError(message, data?.errors);
  }
  
  if (status === 503) {
    return new GitMCPCError('GitHub API 服务不可用', ErrorCode.SERVICE_UNAVAILABLE, status);
  }
  
  // 其他错误
  return new GitMCPCError(message, ErrorCode.UNKNOWN_ERROR, status);
}

/**
 * 错误工具函数
 */
export const errors = {
  authentication: (message: string, statusCode?: number) => 
    new AuthenticationError(message, statusCode),
  
  rateLimit: (retryAfter: number, message?: string) => 
    new RateLimitError(retryAfter, message),
  
  validation: (message: string, details?: Record<string, any>) => 
    new ValidationError(message, details),
  
  notFound: (resource: string, identifier?: string) => 
    new NotFoundError(resource, identifier),
  
  toolExecution: (toolName: string, reason: string) => 
    new ToolExecutionError(toolName, reason),
  
  toolNotFound: (toolName: string) => 
    new ToolNotFoundError(toolName),
  
  toolDisabled: (toolName: string, reason?: string) => 
    new ToolDisabledError(toolName, reason),
  
  fromAxios: (error: any) => createErrorFromAxiosError(error),
};
