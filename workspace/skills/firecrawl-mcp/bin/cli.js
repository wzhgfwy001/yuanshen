#!/usr/bin/env node
/**
 * Firecrawl MCP CLI - 命令行工具
 */

const { getFirecrawlClient } = require('../dist/client');

// 解析命令
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const client = getFirecrawlClient();
  
  try {
    switch (command) {
      case 'scrape':
        // 爬取单个URL
        const url = args[1];
        if (!url) {
          console.error('用法: firecrawl-mcp scrape <url>');
          process.exit(1);
        }
        const scrapeResult = await client.scrapeUrl(url);
        console.log(JSON.stringify(scrapeResult, null, 2));
        break;
        
      case 'links':
        // 发现链接
        const linksUrl = args[1];
        if (!linksUrl) {
          console.error('用法: firecrawl-mcp links <url>');
          process.exit(1);
        }
        const linksResult = await client.discoverLinks(linksUrl);
        console.log(JSON.stringify(linksResult, null, 2));
        break;
        
      case 'crawl':
        // 爬取网站
        const crawlUrl = args[1];
        const depth = parseInt(args[2]) || 2;
        if (!crawlUrl) {
          console.error('用法: firecrawl-mcp crawl <url> [depth]');
          process.exit(1);
        }
        const crawlResult = await client.crawlWebsite(crawlUrl, depth);
        console.log(JSON.stringify(crawlResult, null, 2));
        break;
        
      case 'batch':
        // 批量爬取
        const urls = args.slice(1);
        if (urls.length === 0) {
          console.error('用法: firecrawl-mcp batch <url1> <url2> ...');
          process.exit(1);
        }
        const results = await Promise.all(urls.map(u => client.scrapeUrl(u)));
        console.log(JSON.stringify({ success: true, data: results }, null, 2));
        break;
        
      case 'help':
      default:
        console.log(`
Firecrawl MCP CLI - AI驱动的网页抓取工具

用法: firecrawl-mcp <command> [options]

命令:
  scrape <url>         爬取单个URL
  links <url>          发现页面链接
  crawl <url> [depth]  爬取整个网站 (默认深度: 2)
  batch <url1> <url2>   批量爬取多个URL
  help                 显示帮助

示例:
  firecrawl-mcp scrape https://example.com
  firecrawl-mcp links https://example.com
  firecrawl-mcp crawl https://example.com 3
  firecrawl-mcp batch https://example.com https://httpbin.org/html
        `);
        process.exit(command === 'help' ? 0 : 1);
    }
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
