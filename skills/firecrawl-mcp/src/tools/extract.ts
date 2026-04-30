/**
 * Firecrawl 内容提取工具
 */

import { getFirecrawlClient } from '../client';

export interface ExtractLinksParams {
  url: string;
}

export interface ExtractContentParams {
  url: string;
}

export interface ExtractStructuredParams {
  url: string;
  schema?: Record<string, string>;
}

/**
 * 提取页面所有链接
 */
export async function firecrawl_extract_links(params: ExtractLinksParams) {
  const client = getFirecrawlClient();
  const { url } = params;
  return await client.discoverLinks(url);
}

/**
 * 提取页面文本内容
 */
export async function firecrawl_extract_content(params: ExtractContentParams) {
  const client = getFirecrawlClient();
  const { url } = params;
  
  const result = await client.scrapeUrl(url);
  if (result.success && result.data) {
    return {
      success: true,
      data: {
        url: result.data.url,
        title: result.data.title,
        content: result.data.content,
        wordCount: result.data.content?.split(/\s+/).length || 0
      }
    };
  }
  return result;
}

/**
 * 提取结构化数据
 */
export async function firecrawl_extract_structured(params: ExtractStructuredParams) {
  const client = getFirecrawlClient();
  const { url, schema } = params;
  
  const result = await client.scrapeUrl(url);
  if (result.success && result.data) {
    // 如果提供了schema，尝试按照schema提取
    if (schema) {
      const structured: Record<string, any> = {};
      // 简单的schema匹配实现
      // 实际使用时可能需要更复杂的解析逻辑
      structured['_raw'] = result.data;
      return { success: true, data: structured };
    }
    
    // 默认返回完整数据
    return {
      success: true,
      data: {
        url: result.data.url,
        title: result.data.title,
        description: result.data.description,
        content: result.data.content,
        links: result.data.links,
        images: result.data.images,
        metadata: result.data.metadata
      }
    };
  }
  return result;
}
