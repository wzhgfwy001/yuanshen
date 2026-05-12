/**
 * Firecrawl MCP - 基础集成测试
 * 
 * 测试网页爬取核心功能
 * v1.0.0 - 包含 Bridge 集成测试
 */

import { createFirecrawlMCPBridge, FirecrawlMCPBridge } from '../src/bridge';
import { FirecrawlClient } from '../src/client';

describe('Firecrawl MCP Bridge', () => {
  let bridge: FirecrawlMCPBridge;

  beforeAll(async () => {
    bridge = createFirecrawlMCPBridge();
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  describe('Bridge Lifecycle', () => {
    test('should create bridge instance', () => {
      expect(bridge).toBeDefined();
    });

    test('should be connected after start', () => {
      expect(bridge.isConnected()).toBe(true);
    });

    test('should get client', () => {
      const client = bridge.getClient();
      expect(client).toBeDefined();
      expect(client instanceof FirecrawlClient).toBe(true);
    });
  });

  describe('Tool List', () => {
    test('should get tool definitions', () => {
      const tools = bridge.getToolDefinitions();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    test('should get tool count', () => {
      const count = bridge.getToolCount();
      expect(count).toBeGreaterThan(0);
    });

    test('should get tools by category', () => {
      const crawlTools = bridge.getToolsByCategory('crawl');
      expect(Array.isArray(crawlTools)).toBe(true);
      expect(crawlTools.length).toBeGreaterThan(0);
      
      const extractTools = bridge.getToolsByCategory('extract');
      expect(Array.isArray(extractTools)).toBe(true);
      expect(extractTools.length).toBeGreaterThan(0);
    });
  });

  describe('Capabilities', () => {
    test('should have firecrawl-crawl capability', () => {
      expect(bridge.hasCapability('firecrawl-crawl')).toBe(true);
    });

    test('should have firecrawl-extract capability', () => {
      expect(bridge.hasCapability('firecrawl-extract')).toBe(true);
    });

    test('should return false for unknown capability', () => {
      expect(bridge.hasCapability('unknown-capability')).toBe(false);
    });

    test('should get all capabilities', () => {
      const caps = bridge.getCapabilities();
      expect(Array.isArray(caps)).toBe(true);
      expect(caps.length).toBe(2);
    });
  });

  describe('Stats', () => {
    test('should get stats', () => {
      const stats = bridge.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.connected).toBe(true);
    });

    test('should have category count in stats', () => {
      const stats = bridge.getStats();
      expect(stats.categoryCount).toBeDefined();
      expect(stats.categoryCount['crawl']).toBeGreaterThan(0);
      expect(stats.categoryCount['extract']).toBeGreaterThan(0);
    });
  });
});

describe('Crawl Tools', () => {
  let bridge: FirecrawlMCPBridge;

  beforeAll(async () => {
    bridge = createFirecrawlMCPBridge();
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should crawl URL', async () => {
    const result = await bridge.callTool('firecrawl_crawl_url', {
      url: 'https://example.com',
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('firecrawl_crawl_url');
    expect(result.metadata?.category).toBe('crawl');
  });

  test('should crawl website', async () => {
    const result = await bridge.callTool('firecrawl_crawl_website', {
      url: 'https://example.com',
      maxDepth: 1,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('firecrawl_crawl_website');
    expect(result.metadata?.category).toBe('crawl');
  });

  test('should batch crawl', async () => {
    const result = await bridge.callTool('firecrawl_batch_crawl', {
      urls: ['https://example.com', 'https://example.org'],
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('firecrawl_batch_crawl');
    expect(result.metadata?.category).toBe('crawl');
  });
});

describe('Extract Tools', () => {
  let bridge: FirecrawlMCPBridge;

  beforeAll(async () => {
    bridge = createFirecrawlMCPBridge();
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should extract links', async () => {
    const result = await bridge.callTool('firecrawl_extract_links', {
      url: 'https://example.com',
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('firecrawl_extract_links');
    expect(result.metadata?.category).toBe('extract');
  });

  test('should extract content', async () => {
    const result = await bridge.callTool('firecrawl_extract_content', {
      url: 'https://example.com',
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('firecrawl_extract_content');
    expect(result.metadata?.category).toBe('extract');
  });

  test('should extract structured data', async () => {
    const result = await bridge.callTool('firecrawl_extract_structured', {
      url: 'https://example.com',
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('firecrawl_extract_structured');
    expect(result.metadata?.category).toBe('extract');
  });
});

describe('Error Handling', () => {
  let bridge: FirecrawlMCPBridge;

  beforeAll(async () => {
    bridge = createFirecrawlMCPBridge();
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should return error for unknown tool', async () => {
    const result = await bridge.callTool('firecrawl_nonexistent_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知工具');
  });

  test('should include metadata in result', async () => {
    const result = await bridge.callTool('firecrawl_crawl_url', {
      url: 'https://example.com',
    });
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.tool).toBe('firecrawl_crawl_url');
    expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('Tool Call Metadata', () => {
  let bridge: FirecrawlMCPBridge;

  beforeAll(async () => {
    bridge = createFirecrawlMCPBridge();
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should include correct category in metadata for crawl tools', async () => {
    const tools = [
      'firecrawl_crawl_url',
      'firecrawl_crawl_website',
      'firecrawl_batch_crawl',
    ];

    for (const toolName of tools) {
      const result = await bridge.callTool(toolName, {
        url: 'https://example.com',
        urls: ['https://example.com'],
      });
      expect(result.metadata?.category).toBe('crawl');
    }
  });

  test('should include correct category in metadata for extract tools', async () => {
    const tools = [
      'firecrawl_extract_links',
      'firecrawl_extract_content',
      'firecrawl_extract_structured',
    ];

    for (const toolName of tools) {
      const result = await bridge.callTool(toolName, {
        url: 'https://example.com',
      });
      expect(result.metadata?.category).toBe('extract');
    }
  });

  test('should measure duration in metadata', async () => {
    const result = await bridge.callTool('firecrawl_crawl_url', {
      url: 'https://example.com',
    });
    expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
  });
});
