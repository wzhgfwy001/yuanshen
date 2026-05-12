---
name: firecrawl-mcp
description: Firecrawl MCP - AI驱动的网页抓取/搜索工具，支持整站爬取、智能搜索、内容提取
trigger: firecrawl
parent: dynamic-multi-agent-system
author: 元神
version: 1.1.0
created: 2026-04-23
updated: 2026-04-23
tags:
  - firecrawl
  - mcp
  - web-scraping
  - crawl
  - search
  - ai
  - bridge
---

# Firecrawl MCP Skill

## 状态: ✅ Bridge 集成完成

**版本: v1.1.0** - Bridge 集成完成，支持 OpenClaw executeTool 路由

| 功能 | 状态 |
|------|------|
| Firecrawl Client | ✅ |
| 6+ 工具 | ✅ |
| Bridge 集成 | ✅ |
| TypeScript 编译 | ✅ |
| Jest 测试 | ✅ 23/23 passed |

## 功能概述

Firecrawl MCP 提供 AI 驱动的网页抓取能力，让元神能够：
- 🌐 整站爬取
- 🔍 智能搜索
- 📝 内容提取
- 📸 页面快照
- 📊 结构化数据

## Bridge 集成 (OpenClaw)

Firecrawl MCP 已集成到 OpenClaw 工具系统，支持 `executeTool` 路由和 capability 过滤。

### 创建 Bridge 实例

```typescript
import { createFirecrawlMCPBridge } from './src/bridge';

const bridge = createFirecrawlMCPBridge({
  apiUrl: 'https://api.firecrawl.dev',
  apiKey: process.env.FIRECRAWL_API_KEY,
  timeout: 60000,
});

await bridge.start();
console.log('Firecrawl MCP Bridge 已连接:', bridge.isConnected());
```

### 执行工具

```typescript
// 爬取单个URL
const result = await bridge.callTool('firecrawl_crawl_url', {
  url: 'https://example.com',
});

// 爬取整个网站
const websiteResult = await bridge.callTool('firecrawl_crawl_website', {
  url: 'https://example.com',
  maxDepth: 2,
});

// 提取链接
const linksResult = await bridge.callTool('firecrawl_extract_links', {
  url: 'https://example.com',
});

// 提取内容
const contentResult = await bridge.callTool('firecrawl_extract_content', {
  url: 'https://example.com',
});
```

### 能力过滤

```typescript
// 检查是否有特定能力
if (bridge.hasCapability('firecrawl-crawl')) {
  console.log('支持爬取操作');
}

// 获取所有能力
const capabilities = bridge.getCapabilities();
// ['firecrawl-crawl', 'firecrawl-extract']
```

### 统计信息

```typescript
const stats = bridge.getStats();
console.log('工具总数:', stats.totalTools);
console.log('分类统计:', stats.categoryCount);
console.log('连接状态:', stats.connected);
```

## 工具列表

### 爬取工具 (Crawl)

| 工具名 | 中文名 | 说明 |
|--------|--------|------|
| `firecrawl_crawl_url` | 爬取URL | 爬取单个URL |
| `firecrawl_scrape_url` | 抓取页面 | 抓取页面内容 |
| `firecrawl_batch_crawl` | 批量爬取 | 批量爬取多个URL |
| `firecrawl_crawl_website` | 爬取网站 | 爬取整个网站 |

### 搜索工具 (Search)

| 工具名 | 中文名 | 说明 |
|--------|--------|------|
| `firecrawl_search` | 搜索 | AI智能搜索 |
| `firecrawl_discover` | 发现链接 | 发现网站所有链接 |

### 提取工具 (Extract)

| 工具名 | 中文名 | 说明 |
|--------|--------|------|
| `firecrawl_extract_links` | 提取链接 | 提取页面所有链接 |
| `firecrawl_extract_content` | 提取内容 | 提取页面文本内容 |
| `firecrawl_extract_structured` | 提取结构化 | 提取结构化数据 |

## 配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FIRECRAWL_API_KEY` | Firecrawl API Key | (可选) |
| `FIRECRAWL_API_URL` | API 地址 | https://api.firecrawl.dev |
| `FIRECRAWL_TIMEOUT` | 超时时间 | 60000ms |

## 使用示例

### 爬取单个页面

```
用户：爬取 https://example.com

工具调用：firecrawl_scrape_url
输入：{ "url": "https://example.com" }
```

### 爬取整个网站

```
用户：爬取整个 https://example.com

工具调用：firecrawl_crawl_website
输入：{ "url": "https://example.com", "maxDepth": 3 }
```

### 搜索

```
用户：搜索 "AI news"

工具调用：firecrawl_search
输入：{ "query": "AI news", "limit": 10 }
```

### 批量爬取

```
用户：批量爬取这些URL

工具调用：firecrawl_batch_crawl
输入：{ "urls": ["url1", "url2", "url3"] }
```

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                      元神主Agent                          │
├─────────────────────────────────────────────────────────┤
│                     Firecrawl MCP Bridge                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │  Crawler Engine │  │  Search Engine   │               │
│  │  (爬取引擎)      │  │  (搜索引擎)      │               │
│  └────────┬────────┘  └────────┬────────┘               │
│           │                  │                         │
│           ▼                  ▼                         │
│  ┌─────────────────────────────────────┐               │
│  │        Firecrawl API / Cheerio       │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

## 与官方对比

| 特性 | 官方Firecrawl | 元神Skill版本 |
|------|---------------|---------------|
| 协议 | API | Skill + 直接调用 |
| 工具名语言 | 英文 | 中文 + 英文 |
| 集成度 | 需要API Key | 可选API Key |
| 离线爬取 | 需要API | ✅ 支持 |

## 🎯 快速使用

**触发场景：**
- 用户说"爬取"、"抓取"、"scrape"、"crawl" → 自动调用此Skill
- 用户说"搜索网页"、"搜索XX"、"search" → 自动调用此Skill
- 用户给了一个URL并说"提取内容"、"分析这个页面" → 自动调用此Skill
- 用户说"整站爬取"、"抓取整个网站" → 自动调用此Skill

**示例对话：**
- 用户："帮我爬取 https://example.com"
- AI自动使用此Skill调用 `firecrawl_scrape_url` 抓取页面

- 用户："搜索最新的AI新闻"
- AI自动使用此Skill调用 `firecrawl_search` 进行智能搜索

- 用户："提取这个页面的所有链接"
- AI自动使用此Skill调用 `firecrawl_extract_links`

- 用户："帮我分析整个网站的结构"
- AI自动使用此Skill调用 `firecrawl_crawl_website` 整站爬取

**不适用场景：**
- 简单问答不需要此Skill（如"1+1等于几"）
- 本地文件操作不需要网页抓取
- 用户已明确说"不需要联网"时

## 安装

```bash
cd skills/firecrawl-mcp
npm install
npm run build
```

## 更新日志

### v1.0.0 (2026-04-23)
- 初始版本
- 支持爬取、搜索、内容提取
- Cheerio 实现（无需API Key）
