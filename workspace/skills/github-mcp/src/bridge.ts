/**
 * GitHub MCP Bridge - OpenClaw 集成桥接器
 * 
 * 封装 GitHub MCP 工具，对接 OpenClaw 工具执行系统
 * 支持 80+ GitHub 操作工具
 * 
 * v1.0.0 - 2026-04-23
 */

import { initialize, GitHubClient, TOOLS } from './index';
import * as reposTools from './tools/repos';
import * as issuesTools from './tools/issues';
import * as pullrequestsTools from './tools/pullrequests';
import * as actionsTools from './tools/actions';
import * as usersTools from './tools/users';
import * as gistsTools from './tools/gists';
import * as notificationsTools from './tools/notifications';
import { searchCode } from './tools/search';

// 工具名称前缀
const GITHUB_PREFIX = 'github_';

// 工具分类
export type GitHubToolCategory = 
  | 'repos' 
  | 'issues' 
  | 'pull_requests' 
  | 'actions' 
  | 'users' 
  | 'gists' 
  | 'notifications' 
  | 'search';

// 工具调用结果
export interface GitHubToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tool: string;
    category: string;
    duration: number;
  };
}

// GitHub MCP Bridge 类
export class GitHubMCPBridge {
  private client: GitHubClient | null = null;
  private initialized: boolean = false;
  private config: {
    apiUrl?: string;
    graphqlUrl?: string;
    token?: string;
    username?: string;
  };

  constructor(config?: {
    apiUrl?: string;
    graphqlUrl?: string;
    token?: string;
    username?: string;
  }) {
    this.config = config || {};
  }

  /**
   * 初始化 GitHub MCP Bridge
   */
  async start(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await initialize({
        apiUrl: this.config.apiUrl,
        graphqlUrl: this.config.graphqlUrl,
        token: this.config.token,
        githubUsername: this.config.username,
      });

      this.client = new GitHubClient({
        apiUrl: this.config.apiUrl,
        graphqlUrl: this.config.graphqlUrl,
        token: this.config.token,
        username: this.config.username,
      });

      if (this.config.token) {
        this.client.setToken(this.config.token);
      }

      this.initialized = true;
      console.log('[GitHub MCP Bridge] 初始化完成');
    } catch (error) {
      console.error('[GitHub MCP Bridge] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 停止 Bridge
   */
  async stop(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    this.client = null;
    this.initialized = false;
    console.log('[GitHub MCP Bridge] 已停止');
  }

  /**
   * 检查是否已初始化
   */
  isConnected(): boolean {
    return this.initialized;
  }

  /**
   * 获取客户端
   */
  getClient(): GitHubClient | null {
    return this.client;
  }

  /**
   * 获取工具列表
   */
  getToolList() {
    return TOOLS;
  }

  /**
   * 获取工具数量
   */
  getToolCount(): number {
    return TOOLS.length;
  }

  /**
   * 根据分类获取工具
   */
  getToolsByCategory(category: GitHubToolCategory) {
    return TOOLS.filter(tool => tool.category === category);
  }

  /**
   * 将 snake_case 转换为 camelCase
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 执行 GitHub 工具
   * 
   * @param toolName 工具名称 (如 github_search_repositories)
   * @param args 工具参数
   */
  async callTool(toolName: string, args: Record<string, any> = {}): Promise<GitHubToolResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      return {
        success: false,
        error: 'GitHub MCP Bridge 未初始化',
        metadata: {
          tool: toolName,
          category: 'unknown',
          duration: 0,
        },
      };
    }

    // 移除前缀进行匹配
    const baseName = toolName.startsWith(GITHUB_PREFIX) 
      ? toolName.slice(GITHUB_PREFIX.length) 
      : toolName;

    // 转换为 camelCase (因为导出的是 camelCase)
    const camelName = this.snakeToCamel(baseName);

    let category = 'unknown';

    try {
      let result: any;

      // 路由到对应工具 (工具函数只接收 args，内部通过 getGitHubClient() 获取客户端)
      // Repos 工具
      if (camelName in reposTools) {
        result = await (reposTools as any)[camelName](args);
        category = 'repos';
      }
      // Issues 工具
      else if (camelName in issuesTools) {
        result = await (issuesTools as any)[camelName](args);
        category = 'issues';
      }
      // Pull Requests 工具
      else if (camelName in pullrequestsTools) {
        result = await (pullrequestsTools as any)[camelName](args);
        category = 'pull_requests';
      }
      // Actions 工具
      else if (camelName in actionsTools) {
        result = await (actionsTools as any)[camelName](args);
        category = 'actions';
      }
      // Users 工具
      else if (camelName in usersTools) {
        result = await (usersTools as any)[camelName](args);
        category = 'users';
      }
      // Gists 工具
      else if (camelName in gistsTools) {
        result = await (gistsTools as any)[camelName](args);
        category = 'gists';
      }
      // Notifications 工具
      else if (camelName in notificationsTools) {
        result = await (notificationsTools as any)[camelName](args);
        category = 'notifications';
      }
      // Search 工具
      else if (camelName === 'searchCode') {
        result = await searchCode(args as any);
        category = 'search';
      }
      else {
        return {
          success: false,
          error: `未知工具: ${toolName}`,
          metadata: {
            tool: toolName,
            category: 'unknown',
            duration: Date.now() - startTime,
          },
        };
      }

      return {
        success: true,
        data: result,
        metadata: {
          tool: toolName,
          category,
          duration: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '未知错误',
        metadata: {
          tool: toolName,
          category,
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * 获取能力列表
   */
  getCapabilities(): string[] {
    return [
      'github-repos',
      'github-issues',
      'github-pull_requests',
      'github-actions',
      'github-users',
      'github-gists',
      'github-notifications',
      'github-search',
    ];
  }

  /**
   * 检查是否有特定能力
   */
  hasCapability(capability: string): boolean {
    return this.getCapabilities().includes(capability);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const categoryCount: Record<string, number> = {};
    TOOLS.forEach(tool => {
      const cat = tool.category;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    return {
      totalTools: TOOLS.length,
      categoryCount,
      connected: this.initialized,
      username: this.config.username,
    };
  }
}

// 创建 Bridge 实例
export function createGitHubMCPBridge(config?: {
  apiUrl?: string;
  graphqlUrl?: string;
  token?: string;
  username?: string;
}): GitHubMCPBridge {
  return new GitHubMCPBridge(config);
}

// 导出工具列表常量
export { TOOLS as GITHUB_TOOLS };
