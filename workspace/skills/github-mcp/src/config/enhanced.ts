/**
 * GitHub MCP Enhanced Configuration
 * 
 * 基于官方 GitHub MCP Server 的架构设计
 * 参考: https://github.com/github/github-mcp-server
 */

import { Logger } from '../utils/logger';

/**
 * Feature Flags - 动态功能开关
 */
export enum FeatureFlag {
  // 代码安全相关
  CODE_SCANNING = 'code_scanning',
  SECRET_PROTECTION = 'secret_protection',
  SECURITY_ADVISORIES = 'security_advisories',
  
  // 高级功能
  DEPENDABOT = 'dependabot',
  DISCUSSIONS = 'discussions',
  PROJECTS = 'projects',
  
  // 实验性功能
  INSIDERS_MODE = 'insiders_mode',
  DYNAMIC_TOOLSETS = 'dynamic_toolsets',
  
  // UI功能
  MCP_APPS = 'remote_mcp_ui_apps',
}

/**
 * Feature Flag 配置
 */
export interface FeatureFlags {
  // 是否启用 lockdown 模式 (限制仓库访问)
  lockdownMode: boolean;
  
  // 是否启用 insiders 实验性功能
  insidersMode: boolean;
  
  // 是否启用动态工具集发现
  dynamicToolsets: boolean;
  
  // 启用的功能列表
  enabledFeatures: FeatureFlag[];
  
  // 禁用的工具列表
  excludedTools: string[];
  
  // 只读模式 (只注册只读工具)
  readOnly: boolean;
}

/**
 * 日志配置
 */
export interface LogConfig {
  // 是否启用命令日志
  enableCommandLogging: boolean;
  
  // 日志文件路径 (为空则输出到stderr)
  logFilePath: string;
  
  // 日志级别
  level: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  // 仓库访问缓存 TTL (毫秒)
  repoAccessTTL: number;
  
  // 是否启用缓存
  enabled: boolean;
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  // 启用速率限制
  enabled: boolean;
  
  // 每分钟请求数限制
  maxRequestsPerMinute: number;
  
  // 达到限制后的退避时间 (毫秒)
  backoffMs: number;
}

/**
 * 完整的增强配置
 */
export interface EnhancedGitHubMCPConfig {
  // 基础配置
  sshKeyPath: string;
  githubUsername: string;
  token?: string;
  
  // API 配置
  apiUrl: string;
  graphqlUrl: string;
  rawUrl?: string;  // Raw content URL
  
  // 分页和超时
  defaultPerPage: number;
  timeout: number;
  retries: number;
  
  // 内容窗口大小 (用于分页)
  contentWindowSize: number;
  
  // 功能开关
  features: FeatureFlags;
  
  // 日志配置
  log: LogConfig;
  
  // 缓存配置
  cache: CacheConfig;
  
  // 速率限制
  rateLimit: RateLimitConfig;
  
  // 工具集配置
  enabledToolsets: string[];
  enabledTools: string[];
  
  // 翻译配置
  exportTranslations: boolean;
}

/**
 * 默认 Feature Flags
 */
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  lockdownMode: false,
  insidersMode: false,
  dynamicToolsets: false,
  enabledFeatures: [],
  excludedTools: [],
  readOnly: false,
};

/**
 * 默认日志配置
 */
const DEFAULT_LOG_CONFIG: LogConfig = {
  enableCommandLogging: false,
  logFilePath: '',
  level: 'info',
};

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  repoAccessTTL: 5 * 60 * 1000,  // 5分钟
  enabled: true,
};

/**
 * 默认速率限制配置
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: true,
  maxRequestsPerMinute: 60,
  backoffMs: 60000,
};

/**
 * 默认增强配置
 */
export const DEFAULT_ENHANCED_CONFIG: EnhancedGitHubMCPConfig = {
  sshKeyPath: 'C:\\Users\\DELL\\.ssh\\id_ed25519_github',
  githubUsername: 'wzhgfwy001',
  apiUrl: 'https://api.github.com',
  graphqlUrl: 'https://api.github.com/graphql',
  rawUrl: 'https://raw.githubusercontent.com',
  defaultPerPage: 30,
  timeout: 30000,
  retries: 3,
  contentWindowSize: 100,
  features: DEFAULT_FEATURE_FLAGS,
  log: DEFAULT_LOG_CONFIG,
  cache: DEFAULT_CACHE_CONFIG,
  rateLimit: DEFAULT_RATE_LIMIT_CONFIG,
  enabledToolsets: ['default'],
  enabledTools: [],
  exportTranslations: false,
};

/**
 * 配置构建器 - Builder Pattern
 */
export class ConfigBuilder {
  private config: Partial<EnhancedGitHubMCPConfig>;
  
  constructor(baseConfig?: Partial<EnhancedGitHubMCPConfig>) {
    this.config = { ...baseConfig };
  }
  
  // 基础配置
  withToken(token: string): this {
    this.config.token = token;
    return this;
  }
  
  withSSHKey(path: string, username: string): this {
    this.config.sshKeyPath = path;
    this.config.githubUsername = username;
    return this;
  }
  
  withAPIUrls(apiUrl: string, graphqlUrl: string, rawUrl?: string): this {
    this.config.apiUrl = apiUrl;
    this.config.graphqlUrl = graphqlUrl;
    if (rawUrl) this.config.rawUrl = rawUrl;
    return this;
  }
  
  // 功能开关
  withLockdownMode(enabled: boolean): this {
    if (!this.config.features) this.config.features = { ...DEFAULT_FEATURE_FLAGS };
    this.config.features.lockdownMode = enabled;
    return this;
  }
  
  withInsidersMode(enabled: boolean): this {
    if (!this.config.features) this.config.features = { ...DEFAULT_FEATURE_FLAGS };
    this.config.features.insidersMode = enabled;
    return this;
  }
  
  withDynamicToolsets(enabled: boolean): this {
    if (!this.config.features) this.config.features = { ...DEFAULT_FEATURE_FLAGS };
    this.config.features.dynamicToolsets = enabled;
    return this;
  }
  
  withFeature(flag: FeatureFlag, enabled: boolean = true): this {
    if (!this.config.features) this.config.features = { ...DEFAULT_FEATURE_FLAGS };
    if (enabled) {
      this.config.features.enabledFeatures.push(flag);
    }
    return this;
  }
  
  withExcludedTools(tools: string[]): this {
    if (!this.config.features) this.config.features = { ...DEFAULT_FEATURE_FLAGS };
    this.config.features.excludedTools = tools;
    return this;
  }
  
  withReadOnly(readOnly: boolean): this {
    if (!this.config.features) this.config.features = { ...DEFAULT_FEATURE_FLAGS };
    this.config.features.readOnly = readOnly;
    return this;
  }
  
  // 工具集配置
  withEnabledToolsets(toolsets: string[]): this {
    this.config.enabledToolsets = toolsets;
    return this;
  }
  
  withEnabledTools(tools: string[]): this {
    this.config.enabledTools = tools;
    return this;
  }
  
  // 日志配置
  withLogging(config: Partial<LogConfig>): this {
    this.config.log = { ...DEFAULT_LOG_CONFIG, ...config };
    return this;
  }
  
  // 缓存配置
  withCache(config: Partial<CacheConfig>): this {
    this.config.cache = { ...DEFAULT_CACHE_CONFIG, ...config };
    return this;
  }
  
  // 速率限制配置
  withRateLimit(config: Partial<RateLimitConfig>): this {
    this.config.rateLimit = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    return this;
  }
  
  // 验证并构建最终配置
  validate(): EnhancedGitHubMCPConfig {
    return {
      ...DEFAULT_ENHANCED_CONFIG,
      ...this.config,
      features: {
        ...DEFAULT_FEATURE_FLAGS,
        ...(this.config.features || {}),
      },
      log: {
        ...DEFAULT_LOG_CONFIG,
        ...(this.config.log || {}),
      },
      cache: {
        ...DEFAULT_CACHE_CONFIG,
        ...(this.config.cache || {}),
      },
      rateLimit: {
        ...DEFAULT_RATE_LIMIT_CONFIG,
        ...(this.config.rateLimit || {}),
      },
    };
  }
  
  // 静态工厂方法
  static create(): ConfigBuilder {
    return new ConfigBuilder();
  }
  
  static fromEnv(): ConfigBuilder {
    return new ConfigBuilder({
      token: process.env.GITHUB_TOKEN,
      githubUsername: process.env.GITHUB_USERNAME,
    });
  }
}

/**
 * 验证配置
 */
export function validateEnhancedConfig(config: Partial<EnhancedGitHubMCPConfig>): EnhancedGitHubMCPConfig {
  return new ConfigBuilder(config).validate();
}

/**
 * Feature Flag 检查器
 */
export function isFeatureEnabled(config: EnhancedGitHubMCPConfig, flag: FeatureFlag): boolean {
  if (!config.features) return false;
  
  // 检查是否在启用列表中
  return config.features.enabledFeatures.includes(flag);
}

/**
 * 获取工具集包含的默认工具列表
 */
export const TOOLSET_DEFAULT_TOOLS: Record<string, string[]> = {
  context: ['get_current_user', 'get_user_context'],
  repos: [
    'search_repositories',
    'get_repository',
    'list_commits',
    'list_branches',
    'list_tags',
    'get_latest_release',
  ],
  issues: [
    'search_issues',
    'get_issue',
    'create_issue',
    'update_issue',
    'add_issue_comment',
  ],
  pull_requests: [
    'search_pull_requests',
    'get_pull_request',
    'create_pull_request',
    'update_pull_request',
    'merge_pull_request',
  ],
  users: [
    'get_user',
    'list_user_repos',
    'list_user_gists',
  ],
  actions: [
    'list_workflows',
    'run_workflow',
    'get_workflow_run',
  ],
  notifications: [
    'list_notifications',
    'mark_notification_as_read',
  ],
  discussions: [
    'list_discussions',
    'get_discussion',
    'create_discussion',
  ],
  projects: [
    'list_projects',
    'get_project',
    'create_project',
  ],
  dependabot: [
    'list_dependabot_alerts',
    'get_dependabot_alert',
  ],
  code_security: [
    'list_code_scanning_alerts',
    'get_code_scanning_alert',
  ],
  secret_protection: [
    'list_secret_scanning_alerts',
    'get_secret_scanning_alert',
  ],
};
