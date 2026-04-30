/**
 * Firecrawl MCP 工具索引
 */

// 爬取工具
export {
  firecrawl_crawl_url,
  firecrawl_crawl_website,
  firecrawl_batch_crawl
} from './crawl';

// 提取工具
export {
  firecrawl_extract_links,
  firecrawl_extract_content,
  firecrawl_extract_structured
} from './extract';

/**
 * 工具列表
 */
export const toolDefinitions = [
  {
    name: 'firecrawl_crawl_url',
    description: '爬取单个URL的页面内容',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '要爬取的URL' },
        useApi: { type: 'boolean', description: '是否使用API（需要API Key）', default: false }
      },
      required: ['url']
    }
  },
  {
    name: 'firecrawl_crawl_website',
    description: '爬取整个网站',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '网站基础URL' },
        maxDepth: { type: 'number', description: '最大爬取深度', default: 2 },
        useApi: { type: 'boolean', description: '是否使用API（需要API Key）', default: false }
      },
      required: ['url']
    }
  },
  {
    name: 'firecrawl_batch_crawl',
    description: '批量爬取多个URL',
    parameters: {
      type: 'object',
      properties: {
        urls: { type: 'array', items: { type: 'string' }, description: 'URL列表' }
      },
      required: ['urls']
    }
  },
  {
    name: 'firecrawl_extract_links',
    description: '提取页面所有链接',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '页面URL' }
      },
      required: ['url']
    }
  },
  {
    name: 'firecrawl_extract_content',
    description: '提取页面文本内容',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '页面URL' }
      },
      required: ['url']
    }
  },
  {
    name: 'firecrawl_extract_structured',
    description: '提取结构化数据',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '页面URL' },
        schema: { type: 'object', description: '数据结构定义（可选）' }
      },
      required: ['url']
    }
  }
];
