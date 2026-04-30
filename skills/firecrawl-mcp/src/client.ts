/**
 * Firecrawl MCP 客户端
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { loadConfig, FirecrawlConfig } from './config/default';

export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PageData {
  url: string;
  title?: string;
  description?: string;
  content?: string;
  links?: string[];
  images?: string[];
  metadata?: Record<string, any>;
}

export class FirecrawlClient {
  private config: FirecrawlConfig;
  private apiClient?: AxiosInstance;

  constructor(config?: Partial<FirecrawlConfig>) {
    this.config = { ...loadConfig(), ...config };
    
    if (this.config.apiKey) {
      this.apiClient = axios.create({
        baseURL: this.config.apiUrl,
        timeout: this.config.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
    }
  }

  /**
   * 爬取单个URL（使用Cheerio，无需API Key）
   */
  async scrapeUrl(url: string): Promise<ApiResult<PageData>> {
    try {
      const response = await axios.get(url, {
        timeout: this.config.timeout,
        headers: { 'User-Agent': this.config.userAgent },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // 移除脚本和样式
      $('script, style, noscript, iframe').remove();
      
      const pageData: PageData = {
        url,
        title: $('title').text().trim() || undefined,
        description: $('meta[name="description"]').attr('content') || undefined,
        content: $('body').text().replace(/\s+/g, ' ').trim(),
        links: this.extractLinks($),
        images: this.extractImages($),
        metadata: this.extractMetadata($)
      };

      return { success: true, data: pageData };
    } catch (error: any) {
      return { success: false, error: error.message || '爬取失败' };
    }
  }

  /**
   * 使用Firecrawl API爬取（需要API Key）
   */
  async scrapeUrlApi(url: string): Promise<ApiResult<any>> {
    if (!this.apiClient) {
      return { success: false, error: '需要 API Key 才能使用此功能' };
    }

    try {
      const response = await this.apiClient.post('/v0/scrape', { url });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message || 'API调用失败' };
    }
  }

  /**
   * 爬取网站（使用Cheerio，无需API Key）
   */
  async crawlWebsite(baseUrl: string, maxDepth: number = 2): Promise<ApiResult<PageData[]>> {
    try {
      const visited = new Set<string>();
      const results: PageData[] = [];
      const toVisit = [{ url: baseUrl, depth: 0 }];

      while (toVisit.length > 0) {
        const { url, depth } = toVisit.shift()!;
        
        if (visited.has(url) || depth > maxDepth) continue;
        visited.add(url);

        const scrapeResult = await this.scrapeUrl(url);
        if (scrapeResult.success && scrapeResult.data) {
          results.push(scrapeResult.data);
          
          // 添加新发现的链接
          if (scrapeResult.data.links) {
            for (const link of scrapeResult.data.links) {
              if (link.startsWith(baseUrl) && !visited.has(link)) {
                toVisit.push({ url: link, depth: depth + 1 });
              }
            }
          }
        }
      }

      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message || '爬取失败' };
    }
  }

  /**
   * 使用Firecrawl API爬取网站（需要API Key）
   */
  async crawlWebsiteApi(url: string, maxDepth: number = 2): Promise<ApiResult<any>> {
    if (!this.apiClient) {
      return { success: false, error: '需要 API Key 才能使用此功能' };
    }

    try {
      const response = await this.apiClient.post('/v0/crawl', {
        url,
        maxDepth,
        pageLimit: 100
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message || 'API调用失败' };
    }
  }

  /**
   * 搜索（使用Firecrawl API，需要API Key）
   */
  async search(query: string, limit: number = 10): Promise<ApiResult<any>> {
    if (!this.apiClient) {
      return { success: false, error: '需要 API Key 才能使用搜索功能' };
    }

    try {
      const response = await this.apiClient.post('/v0/search', {
        query,
        limit
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.message || '搜索失败' };
    }
  }

  /**
   * 发现链接（使用Cheerio，无需API Key）
   */
  async discoverLinks(url: string): Promise<ApiResult<string[]>> {
    try {
      const scrapeResult = await this.scrapeUrl(url);
      if (scrapeResult.success && scrapeResult.data?.links) {
        return { success: true, data: scrapeResult.data.links };
      }
      return { success: false, error: '未找到链接' };
    } catch (error: any) {
      return { success: false, error: error.message || '发现链接失败' };
    }
  }

  /**
   * 提取页面所有链接
   */
  private extractLinks($: cheerio.CheerioAPI): string[] {
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) {
        links.push(href);
      }
    });
    return [...new Set(links)];
  }

  /**
   * 提取页面所有图片
   */
  private extractImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) {
        images.push(src);
      }
    });
    return [...new Set(images)];
  }

  /**
   * 提取元数据
   */
  private extractMetadata($: cheerio.CheerioAPI): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });

    return metadata;
  }
}

// 创建默认客户端
let defaultClient: FirecrawlClient | null = null;

export function getFirecrawlClient(config?: Partial<FirecrawlConfig>): FirecrawlClient {
  if (!defaultClient || config) {
    defaultClient = new FirecrawlClient(config);
  }
  return defaultClient;
}
