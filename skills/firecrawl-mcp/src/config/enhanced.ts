/**
 * Firecrawl MCP Enhanced Configuration
 * 增强配置系统
 */

export interface EnhancedFirecrawlConfig {
  // API 配置
  apiKey?: string;
  apiUrl: string;
  timeout: number;
  maxRetries: number;
  
  // 爬取配置
  userAgent: string;
  maxDepth: number;
  maxPages: number;
  delayBetweenRequests: number;
  
  // 功能开关
  features: {
    useCheerio: boolean;       // 使用Cheerio而非API
    enableCache: boolean;       // 启用缓存
    respectRobotsTxt: boolean;  // 遵守robots.txt
    followExternalLinks: boolean; // 跟随外部链接
  };
  
  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableRequestLogging: boolean;
    enableResponseLogging: boolean;
  };
  
  // 速率限制
  rateLimit: {
    enabled: boolean;
    maxRequestsPerMinute: number;
  };
}

export const DEFAULT_ENHANCED_CONFIG: EnhancedFirecrawlConfig = {
  apiUrl: 'https://api.firecrawl.dev',
  timeout: 60000,
  maxRetries: 3,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  maxDepth: 2,
  maxPages: 100,
  delayBetweenRequests: 1000,
  features: {
    useCheerio: true,          // 默认使用Cheerio（无需API Key）
    enableCache: false,         // 默认禁用缓存
    respectRobotsTxt: true,    // 默认遵守robots.txt
    followExternalLinks: false, // 默认不跟随外部链接
  },
  logging: {
    level: 'info',
    enableRequestLogging: false,
    enableResponseLogging: false,
  },
  rateLimit: {
    enabled: true,
    maxRequestsPerMinute: 60,
  },
};

/**
 * 配置构建器 - Builder Pattern
 */
export class FirecrawlConfigBuilder {
  private config: Partial<EnhancedFirecrawlConfig>;
  
  constructor(baseConfig?: Partial<EnhancedFirecrawlConfig>) {
    this.config = { ...baseConfig };
  }
  
  withApiKey(apiKey: string): this {
    this.config.apiKey = apiKey;
    return this;
  }
  
  withApiUrl(url: string): this {
    this.config.apiUrl = url;
    return this;
  }
  
  withTimeout(timeout: number): this {
    this.config.timeout = timeout;
    return this;
  }
  
  withMaxRetries(retries: number): this {
    this.config.maxRetries = retries;
    return this;
  }
  
  withUserAgent(userAgent: string): this {
    this.config.userAgent = userAgent;
    return this;
  }
  
  withMaxDepth(maxDepth: number): this {
    this.config.maxDepth = maxDepth;
    return this;
  }
  
  withMaxPages(maxPages: number): this {
    this.config.maxPages = maxPages;
    return this;
  }
  
  withDelayBetweenRequests(delay: number): this {
    this.config.delayBetweenRequests = delay;
    return this;
  }
  
  withCheerio(enabled: boolean): this {
    if (!this.config.features) this.config.features = DEFAULT_ENHANCED_CONFIG.features;
    this.config.features.useCheerio = enabled;
    return this;
  }
  
  withCache(enabled: boolean): this {
    if (!this.config.features) this.config.features = DEFAULT_ENHANCED_CONFIG.features;
    this.config.features.enableCache = enabled;
    return this;
  }
  
  withRobotsTxt(enabled: boolean): this {
    if (!this.config.features) this.config.features = DEFAULT_ENHANCED_CONFIG.features;
    this.config.features.respectRobotsTxt = enabled;
    return this;
  }
  
  withExternalLinks(enabled: boolean): this {
    if (!this.config.features) this.config.features = DEFAULT_ENHANCED_CONFIG.features;
    this.config.features.followExternalLinks = enabled;
    return this;
  }
  
  withLogging(level: 'debug' | 'info' | 'warn' | 'error'): this {
    if (!this.config.logging) this.config.logging = DEFAULT_ENHANCED_CONFIG.logging;
    this.config.logging.level = level;
    return this;
  }
  
  withRequestLogging(enabled: boolean): this {
    if (!this.config.logging) this.config.logging = DEFAULT_ENHANCED_CONFIG.logging;
    this.config.logging.enableRequestLogging = enabled;
    return this;
  }
  
  withRateLimit(enabled: boolean, maxRequests?: number): this {
    if (!this.config.rateLimit) this.config.rateLimit = DEFAULT_ENHANCED_CONFIG.rateLimit;
    this.config.rateLimit.enabled = enabled;
    if (maxRequests !== undefined) {
      this.config.rateLimit.maxRequestsPerMinute = maxRequests;
    }
    return this;
  }
  
  validate(): EnhancedFirecrawlConfig {
    return {
      ...DEFAULT_ENHANCED_CONFIG,
      ...this.config,
      features: {
        ...DEFAULT_ENHANCED_CONFIG.features,
        ...(this.config.features || {}),
      },
      logging: {
        ...DEFAULT_ENHANCED_CONFIG.logging,
        ...(this.config.logging || {}),
      },
      rateLimit: {
        ...DEFAULT_ENHANCED_CONFIG.rateLimit,
        ...(this.config.rateLimit || {}),
      },
    };
  }
  
  static create(): FirecrawlConfigBuilder {
    return new FirecrawlConfigBuilder();
  }
  
  static fromEnv(): FirecrawlConfigBuilder {
    return new FirecrawlConfigBuilder({
      apiKey: process.env.FIRECRAWL_API_KEY,
      apiUrl: process.env.FIRECRAWL_API_URL,
    });
  }
}

/**
 * 验证配置
 */
export function validateFirecrawlConfig(config: Partial<EnhancedFirecrawlConfig>): EnhancedFirecrawlConfig {
  return new FirecrawlConfigBuilder(config).validate();
}

/**
 * 工具清单
 */
export interface FirecrawlToolEntry {
  name: string;
  description: string;
  requiresApiKey: boolean;
  category: string;
}

export const FIRECRAWL_TOOL_INVENTORY: FirecrawlToolEntry[] = [
  // Cheerio-based tools (no API key needed)
  { name: 'scrape_url', description: 'Scrape a single URL using Cheerio', requiresApiKey: false, category: 'scrape' },
  { name: 'discover_links', description: 'Discover all links on a page', requiresApiKey: false, category: 'scrape' },
  { name: 'crawl_website', description: 'Crawl entire website with depth control', requiresApiKey: false, category: 'crawl' },
  
  // API-based tools (API key required)
  { name: 'scrape_url_api', description: 'Scrape URL using Firecrawl API', requiresApiKey: true, category: 'scrape' },
  { name: 'crawl_website_api', description: 'Crawl website using Firecrawl API', requiresApiKey: true, category: 'crawl' },
  { name: 'search', description: 'Search using Firecrawl API', requiresApiKey: true, category: 'search' },
  { name: 'map', description: 'Get site map using Firecrawl API', requiresApiKey: true, category: 'crawl' },
];

/**
 * 根据配置获取可用的工具
 */
export function getAvailableTools(config: EnhancedFirecrawlConfig): FirecrawlToolEntry[] {
  const hasApiKey = !!config.apiKey;
  
  return FIRECRAWL_TOOL_INVENTORY.filter(tool => {
    // 如果工具需要 API Key 但没有配置，则不可用
    if (tool.requiresApiKey && !hasApiKey) {
      return false;
    }
    return true;
  });
}

/**
 * 按类别分组工具
 */
export function groupToolsByCategory(tools: FirecrawlToolEntry[]): Record<string, FirecrawlToolEntry[]> {
  return tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, FirecrawlToolEntry[]>);
}
