/**
 * Firecrawl MCP Bridge - OpenClaw 集成桥接器
 * 
 * 封装 Firecrawl MCP 工具，对接 OpenClaw 工具执行系统
 * 支持网页爬取、内容提取、链接发现
 * 
 * v1.0.0 - 2026-04-23
 */

import { FirecrawlClient, getFirecrawlClient, toolDefinitions } from './index';
import * as crawlTools from './tools/crawl';
import * as extractTools from './tools/extract';

// 工具名称前缀
const FIRECRAWL_PREFIX = 'firecrawl_';

// 工具分类
export type FirecrawlToolCategory = 'crawl' | 'extract';

// 工具调用结果
export interface FirecrawlToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    tool: string;
    category: string;
    duration: number;
  };
}

// Firecrawl MCP Bridge 类
export class FirecrawlMCPBridge {
  private client: FirecrawlClient;
  private initialized: boolean = false;
  private config: {
    apiUrl?: string;
    apiKey?: string;
    timeout?: number;
    userAgent?: string;
  };

  constructor(config?: {
    apiUrl?: string;
    apiKey?: string;
    timeout?: number;
    userAgent?: string;
  }) {
    this.config = config || {};
    this.client = getFirecrawlClient({
      apiUrl: this.config.apiUrl,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      userAgent: this.config.userAgent,
    });
  }

  /**
   * 初始化 Firecrawl MCP Bridge
   */
  async start(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 初始化客户端
      this.client = getFirecrawlClient({
        apiUrl: this.config.apiUrl,
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
        userAgent: this.config.userAgent,
      });

      this.initialized = true;
      console.log('[Firecrawl MCP Bridge] 初始化完成');
    } catch (error) {
      console.error('[Firecrawl MCP Bridge] 初始化失败:', error);
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
    this.initialized = false;
    console.log('[Firecrawl MCP Bridge] 已停止');
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
  getClient(): FirecrawlClient {
    return this.client;
  }

  /**
   * 获取工具定义列表
   */
  getToolDefinitions() {
    return toolDefinitions;
  }

  /**
   * 获取工具数量
   */
  getToolCount(): number {
    return toolDefinitions.length;
  }

  /**
   * 根据分类获取工具
   */
  getToolsByCategory(category: FirecrawlToolCategory) {
    return toolDefinitions.filter(tool => tool.name.startsWith(`firecrawl_${category}`));
  }

  /**
   * 执行 Firecrawl 工具
   * 
   * @param toolName 工具名称 (如 firecrawl_crawl_url)
   * @param args 工具参数
   */
  async callTool(toolName: string, args: Record<string, any> = {}): Promise<FirecrawlToolResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      return {
        success: false,
        error: 'Firecrawl MCP Bridge 未初始化',
        metadata: {
          tool: toolName,
          category: 'unknown',
          duration: 0,
        },
      };
    }

    let category = 'unknown';

    try {
      let result: any;

      // 路由到对应工具 (工具函数只接收 args，内部通过 getFirecrawlClient() 获取客户端)
      // Crawl 工具
      if (toolName === 'firecrawl_crawl_url') {
        result = await crawlTools.firecrawl_crawl_url(args as any);
        category = 'crawl';
      }
      else if (toolName === 'firecrawl_crawl_website') {
        result = await crawlTools.firecrawl_crawl_website(args as any);
        category = 'crawl';
      }
      else if (toolName === 'firecrawl_batch_crawl') {
        result = await crawlTools.firecrawl_batch_crawl(args as any);
        category = 'crawl';
      }
      // Extract 工具
      else if (toolName === 'firecrawl_extract_links') {
        result = await extractTools.firecrawl_extract_links(args as any);
        category = 'extract';
      }
      else if (toolName === 'firecrawl_extract_content') {
        result = await extractTools.firecrawl_extract_content(args as any);
        category = 'extract';
      }
      else if (toolName === 'firecrawl_extract_structured') {
        result = await extractTools.firecrawl_extract_structured(args as any);
        category = 'extract';
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
      'firecrawl-crawl',
      'firecrawl-extract',
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
    toolDefinitions.forEach(tool => {
      if (tool.name.startsWith('firecrawl_crawl')) {
        categoryCount['crawl'] = (categoryCount['crawl'] || 0) + 1;
      } else if (tool.name.startsWith('firecrawl_extract')) {
        categoryCount['extract'] = (categoryCount['extract'] || 0) + 1;
      }
    });

    return {
      totalTools: toolDefinitions.length,
      categoryCount,
      connected: this.initialized,
    };
  }
}

// 创建 Bridge 实例
export function createFirecrawlMCPBridge(config?: {
  apiUrl?: string;
  apiKey?: string;
  timeout?: number;
  userAgent?: string;
}): FirecrawlMCPBridge {
  return new FirecrawlMCPBridge(config);
}

// 导出工具定义
export { toolDefinitions as FIRECRAWL_TOOLS };
