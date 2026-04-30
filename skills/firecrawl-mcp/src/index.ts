/**
 * Firecrawl MCP - 主入口
 */

export { FirecrawlClient, getFirecrawlClient, ApiResult, PageData } from './client';
export { toolDefinitions } from './tools';

// 爬取工具
export {
  firecrawl_crawl_url,
  firecrawl_crawl_website,
  firecrawl_batch_crawl
} from './tools/crawl';

// 提取工具
export {
  firecrawl_extract_links,
  firecrawl_extract_content,
  firecrawl_extract_structured
} from './tools/extract';
