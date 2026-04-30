---
name: capability-manager
description: 能力管理器，统一管理所有 MCP 能力，提供能力查询、工具推荐、智能匹配和可视化功能
parent: dynamic-multi-agent-system
version: 1.1.0
---

# Capability Manager (能力管理器) v1.1

## 功能概述

| 功能 | 说明 | 优先级 |
|------|------|--------|
| MCP 注册表 | 集中管理所有 MCP 能力 | ⭐⭐⭐⭐⭐ |
| 能力查询 | 根据能力名称查找可用 MCP | ⭐⭐⭐⭐⭐ |
| 智能推荐 | 根据需求推荐最优 MCP/工具 | ⭐⭐⭐⭐⭐ |
| 中文匹配 | 支持中文关键词模糊匹配 | ⭐⭐⭐⭐ |
| 可视化 | 提供能力地图和依赖关系图 | ⭐⭐⭐ |
| 统计分析 | 统计 MCP 使用情况和能力覆盖 | ⭐⭐⭐ |

---

## 支持的 MCP

| MCP | 能力 | 工具数 |
|-----|------|--------|
| Playwright MCP | 浏览器自动化、控制、交互 | 16 |
| GitHub MCP | 仓库、Issue、PR、用户等 | 80+ |
| Firecrawl MCP | 网页爬取、内容提取、链接发现 | - |

---

## 核心类

### CapabilityManager

主类，负责：
- MCP 注册和管理
- 能力查询和匹配
- 智能推荐
- 可视化数据生成

### MCPRegistry

MCP 注册表，负责：
- MCP 注册（register）
- MCP 查询（get, getAll）
- 状态检查（has）

---

## API 接口

### 初始化

```javascript
const { CapabilityManager } = require('./capability-manager');

const manager = new CapabilityManager();
await manager.initialize();  // 自动加载所有 MCP
```

### 能力查询

```javascript
// 查询能力详情
const details = manager.getCapabilityDetails('browser-automation');
// 返回: { capability, mcps: [{name, toolCount}], count }

// 根据能力查找 MCP
const mcps = manager.findMCPsByCapability('web-scraping');

// 获取所有能力列表
const capabilities = manager.getAllCapabilities();

// 模糊搜索能力
const results = manager.searchCapabilities('browser');
```

### 智能推荐

```javascript
// 根据需求推荐 MCP
const recommendations = manager.recommendMCPsForNeed('需要爬取网页数据');
// 返回: { need, matchedKeywords, matchedCapabilities, recommendations: [{name, matchedCapabilities, score, matchedKeywords}] }

// 根据需求推荐工具
const tools = manager.recommendToolsForNeed('抓取网页内容');
// 返回: { need, tools: [{mcp, tool, description}] }
```

### 中文关键词匹配

```javascript
// smartKeywordMatch 支持：
// 1. 精确子串匹配
// 2. 中文分词匹配（2-4字组合）
// 3. 英文单词前缀/后缀匹配

const matched = manager.smartKeywordMatch('需要爬取一些网页数据');
// 返回: ['爬虫', '爬取', '抓取', 'scrape', 'crawl', ...]
```

### MCP 对比

```javascript
const comparison = manager.compareMCPs(['playwright-mcp', 'github-mcp']);
// 返回: { mcps, commonCapabilities, uniqueCapabilities }
```

### 可视化数据

```javascript
// 获取可视化节点和边
const vizData = manager.getVisualizationData();
// 返回: { nodes: [{id, type, label, ...}], edges: [{source, target, type}] }

// 获取能力地图
const map = manager.getCapabilityMap();
// 返回: { 'browser-automation': ['playwright-mcp'], ... }

// 按类别获取能力
const byCategory = manager.getCapabilitiesByCategory();
// 返回: { browser: {name, capabilities, mcps}, web_scraping: {...}, github: {...} }
```

### 统计分析

```javascript
// 获取系统概览
const overview = manager.getOverview();
// 返回: { mcpCount, totalCapabilities, totalTools, mcps: [{name, capabilities, tools, connected}] }

// 获取能力统计
const stats = manager.getCapabilityStats();
// 返回: { totalMcps, totalCapabilities, totalTools, mcpToolDistribution, topCapabilities }

// 获取 MCP 详细信息
const mcpDetails = manager.getMCPDetails('playwright-mcp');
// 返回: { found, name, capabilities, tools: [{name, description, category}], ... }

// 获取查询历史
const history = manager.getQueryHistory();  // 最近 20 条
```

---

## 单例模式

```javascript
const { getCapabilityManager } = require('./capability-manager');

// 获取单例实例
const manager = getCapabilityManager();

// 初始化
await manager.initialize();
```

---

## 数据结构

### MCP 注册信息

```javascript
{
  name: 'playwright-mcp',
  mcp: MCPBridgeInstance,
  capabilities: ['browser-automation', 'browser-control', ...],
  toolCount: 16,
  stats: { totalTools: 16, connected: true, browserName: 'chromium' },
  registeredAt: '2026-04-23T10:00:00.000Z'
}
```

### 推荐结果

```javascript
{
  need: '需要爬取网页数据',
  matchedKeywords: ['爬虫', '爬取', '抓取'],
  matchedCapabilities: ['web-scraping', 'firecrawl-crawl'],
  recommendations: [
    {
      name: 'firecrawl-mcp',
      matchedCapabilities: ['web-scraping', 'firecrawl-crawl'],
      score: 2,
      matchedKeywords: ['爬虫', '爬取', '抓取']
    }
  ]
}
```

---

## 常量

### 能力分类

```javascript
const CAPABILITY_CATEGORIES = {
  BROWSER: 'browser',
  WEB_SCRAPING: 'web_scraping',
  WEB_SEARCH: 'web_search',
  CODE: 'code',
  REPOSITORY: 'repository',
  ISSUE: 'issue',
  PULL_REQUEST: 'pull_request',
  ACTIONS: 'actions',
  USER: 'user',
  GIST: 'gist',
  NOTIFICATION: 'notification',
  EXTRACT: 'extract',
  CRAWL: 'crawl',
};
```

### 能力到 MCP 的映射

```javascript
const CAPABILITY_TO_MCP = {
  'browser-automation': 'playwright-mcp',
  'github-repos': 'github-mcp',
  'web-scraping': 'firecrawl-mcp',
  // ... 更多映射
};
```

### 需求到能力的映射

```javascript
const NEED_TO_CAPABILITIES = {
  '爬虫': ['web-scraping', 'firecrawl-crawl'],
  'browser': ['browser-automation', 'browser-control'],
  'github': ['github-repos', 'github-issues', ...],
  // ... 支持中文和英文关键词
};
```

---

## 使用示例

### 完整示例

```javascript
const { CapabilityManager } = require('./capability-manager');

async function main() {
  // 创建并初始化
  const manager = new CapabilityManager();
  await manager.initialize();
  
  console.log('=== 系统概览 ===');
  console.log(manager.getOverview());
  
  console.log('\n=== 查询能力 ===');
  const details = manager.getCapabilityDetails('web-scraping');
  console.log(details);
  
  console.log('\n=== 智能推荐 ===');
  const rec = manager.recommendMCPsForNeed('需要爬取一些新闻网站的内容');
  console.log(rec);
  
  console.log('\n=== 可视化数据 ===');
  console.log(manager.getVisualizationData());
  
  console.log('\n=== MCP 对比 ===');
  const compare = manager.compareMCPs(['playwright-mcp', 'firecrawl-mcp']);
  console.log(compare);
}
```

---

## 最佳实践

### ✅ 推荐

1. **使用单例** - 避免重复初始化
2. **启用中文匹配** - 充分利用 smartKeywordMatch
3. **缓存查询结果** - 减少重复查询开销
4. **定期获取统计** - 监控系统健康状态

### ❌ 避免

1. **频繁初始化** - 每次初始化会重新加载 MCP
2. **忽略未连接的 MCP** - loadMCP 会跳过未连接的 MCP
3. **不使用推荐功能** - 手动选择 MCP 可能不是最优

---

## 版本历史

| 版本 | 日期 | 变化 |
|------|------|------|
| 1.1.0 | 2026-04-23 | 增强中文匹配 + 模糊搜索 |
| 1.0.0 | 2026-04-05 | 初始版本 |

---

*Capability Manager v1.1.0*  
*核心功能：MCP 注册表 + 智能推荐 + 可视化*