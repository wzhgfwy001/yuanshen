/**
 * Firecrawl MCP 配置
 */

export interface FirecrawlConfig {
  apiKey?: string;
  apiUrl: string;
  timeout: number;
  maxRetries: number;
  userAgent: string;
}

export const defaultConfig: FirecrawlConfig = {
  apiUrl: 'https://api.firecrawl.dev',
  timeout: 60000,
  maxRetries: 3,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export function loadConfig(): FirecrawlConfig {
  return {
    apiKey: process.env.FIRECRAWL_API_KEY || undefined,
    apiUrl: process.env.FIRECRAWL_API_URL || defaultConfig.apiUrl,
    timeout: parseInt(process.env.FIRECRAWL_TIMEOUT || '') || defaultConfig.timeout,
    maxRetries: defaultConfig.maxRetries,
    userAgent: defaultConfig.userAgent
  };
}
