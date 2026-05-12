/**
 * Firecrawl 爬取工具
 */

import { getFirecrawlClient } from '../client';

export interface CrawlUrlParams {
  url: string;
  useApi?: boolean;
}

export interface CrawlWebsiteParams {
  url: string;
  maxDepth?: number;
  useApi?: boolean;
}

export interface BatchCrawlParams {
  urls: string[];
}

/**
 * 爬取单个URL
 */
export async function firecrawl_crawl_url(params: CrawlUrlParams) {
  const client = getFirecrawlClient();
  const { url, useApi = false } = params;

  if (useApi) {
    return await client.scrapeUrlApi(url);
  }
  return await client.scrapeUrl(url);
}

/**
 * 爬取整个网站
 */
export async function firecrawl_crawl_website(params: CrawlWebsiteParams) {
  const client = getFirecrawlClient();
  const { url, maxDepth = 2, useApi = false } = params;

  if (useApi) {
    return await client.crawlWebsiteApi(url, maxDepth);
  }
  return await client.crawlWebsite(url, maxDepth);
}

/**
 * 批量爬取多个URL
 */
export async function firecrawl_batch_crawl(params: BatchCrawlParams) {
  const client = getFirecrawlClient();
  const { urls } = params;

  const results = await Promise.all(
    urls.map(async (url) => {
      const result = await client.scrapeUrl(url);
      return { url, ...result };
    })
  );

  return {
    success: true,
    data: results
  };
}
