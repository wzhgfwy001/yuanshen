/**
 * 阳神系统 - Capability Manager (能力管理器) v1.1.0
 * 
 * 核心功能：
 * 1. 统一注册表 - 集中管理所有MCP能力
 * 2. 能力查询 - 根据能力名称查找MCP
 * 3. 工具推荐 - 根据需求推荐最合适的MCP/工具
 * 4. 能力匹配 - 输入需求，输出可用MCP列表
 * 
 * 支持的MCP：
 * - Playwright MCP (浏览器自动化)
 * - GitHub MCP (GitHub API)
 * - Firecrawl MCP (网页爬取)
 * 
 * @author 元神
 * @version 1.1.0 - 增强中文匹配 + 模糊搜索
 * @date 2026-04-23
 */

const path = require('path');

// ==================== 能力定义 ====================

/**
 * MCP能力分类
 */
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

/**
 * 能力到MCP的映射
 */
const CAPABILITY_TO_MCP = {
  // Playwright MCP
  'browser-automation': 'playwright-mcp',
  'browser-control': 'playwright-mcp',
  'web-interaction': 'playwright-mcp',
  'screenshot': 'playwright-mcp',
  'page-navigation': 'playwright-mcp',
  'form-fill': 'playwright-mcp',
  'javascript-execution': 'playwright-mcp',
  
  // GitHub MCP
  'github-repos': 'github-mcp',
  'github-issues': 'github-mcp',
  'github-pull_requests': 'github-mcp',
  'github-actions': 'github-mcp',
  'github-users': 'github-mcp',
  'github-gists': 'github-mcp',
  'github-notifications': 'github-mcp',
  'github-search': 'github-mcp',
  
  // Firecrawl MCP
  'firecrawl-crawl': 'firecrawl-mcp',
  'firecrawl-extract': 'firecrawl-mcp',
  'web-scraping': 'firecrawl-mcp',
  'content-extraction': 'firecrawl-mcp',
  'link-discovery': 'firecrawl-mcp',
};

/**
 * 需求到能力的映射 (用于推荐) - 增强版
 * 支持中文关键词扩展匹配
 */
const NEED_TO_CAPABILITIES = {
  // 浏览器相关
  '浏览器': ['browser-automation', 'browser-control'],
  'browser': ['browser-automation', 'browser-control'],
  '网页交互': ['browser-automation', 'web-interaction'],
  'web-interaction': ['browser-automation', 'web-interaction'],
  '截图': ['screenshot', 'browser-automation'],
  'screenshot': ['screenshot', 'browser-automation'],
  '截屏': ['screenshot', 'browser-automation'],
  
  // 爬虫相关 - 扩展关键词
  '爬虫': ['web-scraping', 'firecrawl-crawl'],
  '爬取': ['web-scraping', 'firecrawl-crawl'],
  '抓取': ['web-scraping', 'firecrawl-crawl'],
  '网页爬取': ['web-scraping', 'firecrawl-crawl'],
  '网页抓取': ['web-scraping', 'firecrawl-crawl'],
  '抓取网页': ['web-scraping', 'firecrawl-crawl'],
  '网站爬取': ['web-scraping', 'firecrawl-crawl'],
  '数据采集': ['web-scraping', 'firecrawl-crawl'],
  '采集数据': ['web-scraping', 'firecrawl-crawl'],
  'scrape': ['web-scraping', 'firecrawl-crawl'],
  'crawl': ['firecrawl-crawl', 'web-scraping'],
  'scraping': ['web-scraping', 'firecrawl-crawl'],
  'web-scraping': ['web-scraping', 'firecrawl-crawl'],
  'web-scrap': ['web-scraping', 'firecrawl-crawl'],
  
  // 内容提取相关
  '提取内容': ['content-extraction', 'firecrawl-extract'],
  '内容提取': ['content-extraction', 'firecrawl-extract'],
  'extract': ['content-extraction', 'firecrawl-extract'],
  '提取': ['content-extraction', 'firecrawl-extract'],
  '抓取内容': ['content-extraction', 'firecrawl-extract'],
  
  // 链接发现
  '链接发现': ['link-discovery'],
  '发现链接': ['link-discovery'],
  '找链接': ['link-discovery'],
  'links': ['link-discovery'],
  
  // 搜索相关
  '搜索': ['web-search', 'github-search'],
  'search': ['web-search', 'github-search'],
  '查找': ['github-search', 'web-search'],
  
  // GitHub相关
  'github': ['github-repos', 'github-issues', 'github-pull_requests', 'github-actions', 'github-users'],
  'GitHub': ['github-repos', 'github-issues', 'github-pull_requests', 'github-actions', 'github-users'],
  '仓库': ['github-repos'],
  'repo': ['github-repos'],
  'repository': ['github-repos'],
  '代码': ['github-repos', 'github-search'],
  'code': ['github-repos', 'github-search'],
  'Issue': ['github-issues'],
  'issue': ['github-issues'],
  'issues': ['github-issues'],
  'PR': ['github-pull_requests'],
  'Pull Request': ['github-pull_requests'],
  'pull_request': ['github-pull_requests'],
  'Actions': ['github-actions'],
  'actions': ['github-actions'],
  '用户': ['github-users'],
  'user': ['github-users'],
  'users': ['github-users'],
  'Gist': ['github-gists'],
  'gist': ['github-gists'],
  '通知': ['github-notifications'],
  'notification': ['github-notifications'],
  'notifications': ['github-notifications'],
};

// ==================== MCP注册表 ====================

/**
 * MCP注册表 - 存储所有已注册的MCP信息
 */
class MCPRegistry {
  constructor() {
    this.mcps = new Map();
  }

  /**
   * 注册MCP
   */
  register(name, mcp) {
    this.mcps.set(name, {
      name,
      mcp,
      capabilities: mcp.getCapabilities ? mcp.getCapabilities() : [],
      toolCount: mcp.getToolCount ? mcp.getToolCount() : 0,
      stats: mcp.getStats ? mcp.getStats() : {},
      registeredAt: new Date().toISOString(),
    });
    console.log(`[CapabilityManager] MCP注册: ${name} (${mcp.getToolCount ? mcp.getToolCount() : '?'} 工具)`);
  }

  /**
   * 获取所有MCP
   */
  getAll() {
    return Array.from(this.mcps.values());
  }

  /**
   * 获取单个MCP
   */
  get(name) {
    return this.mcps.get(name);
  }

  /**
   * 检查MCP是否存在
   */
  has(name) {
    return this.mcps.has(name);
  }

  /**
   *获取MCP数量
   */
  getCount() {
    return this.mcps.size;
  }
}

// ==================== 能力管理器 ====================

/**
 * Capability Manager - 能力管理器主类
 */
class CapabilityManager {
  constructor() {
    this.registry = new MCPRegistry();
    this.capabilityCache = new Map();
    this.queryHistory = [];
  }

  /**
   * 初始化 - 加载所有MCP Bridges
   */
  async initialize() {
    console.log('[CapabilityManager] 初始化中...');
    
    // 尝试加载Playwright MCP
    await this.loadMCP('playwright-mcp', this.tryLoadPlaywrightMCP);
    
    // 尝试加载GitHub MCP
    await this.loadMCP('github-mcp', this.tryLoadGitHubMCP);
    
    // 尝试加载Firecrawl MCP
    await this.loadMCP('firecrawl-mcp', this.tryLoadFirecrawlMCP);
    
    console.log(`[CapabilityManager] 初始化完成: ${this.registry.getCount()} 个MCP已注册`);
    return this;
  }

  /**
   * 加载MCP的通用方法
   * 只有当MCP成功启动并连接后才注册
   */
  async loadMCP(name, loader) {
    try {
      const mcp = await loader();
      // 检查MCP是否成功连接
      if (mcp && mcp.isConnected && mcp.isConnected()) {
        this.registry.register(name, mcp);
        // 清空缓存
        this.capabilityCache.clear();
        return true;
      } else {
        console.log(`[CapabilityManager] ${name} 未连接，跳过注册`);
        return false;
      }
    } catch (error) {
      console.log(`[CapabilityManager] ${name} 加载失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 尝试加载Playwright MCP
   */
  async tryLoadPlaywrightMCP() {
    return new Promise((resolve) => {
      try {
        const bridgePath = path.join(
          process.env.OPENCLAW_WORKSPACE || 'C:/Users/DELL/.openclaw/workspace',
          'skills/playwright-mcp/dist/bridge'
        );
        const { createPlaywrightMCPBridge } = require(bridgePath);
        const bridge = createPlaywrightMCPBridge();
        
        // 添加错误事件监听器，防止崩溃
        bridge.on('error', (error) => {
          console.log(`[CapabilityManager] Playwright MCP错误: ${error.message}`);
        });
        
        bridge.start().then(() => {
          resolve(bridge);
        }).catch((error) => {
          console.log(`[CapabilityManager] Playwright MCP启动失败: ${error.message}`);
          resolve(null);
        });
      } catch (error) {
        console.log(`[CapabilityManager] Playwright MCP加载失败: ${error.message}`);
        resolve(null);
      }
    });
  }

  /**
   * 尝试加载GitHub MCP
   */
  async tryLoadGitHubMCP() {
    try {
      const bridgePath = path.join(
        process.env.OPENCLAW_WORKSPACE || 'C:/Users/DELL/.openclaw/workspace',
        'skills/github-mcp/dist/bridge'
      );
      const { createGitHubMCPBridge } = require(bridgePath);
      const bridge = createGitHubMCPBridge({
        username: 'wzhgfwy001',
      });
      await bridge.start();
      return bridge;
    } catch (error) {
      console.log(`[CapabilityManager] GitHub MCP加载失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 尝试加载Firecrawl MCP
   */
  async tryLoadFirecrawlMCP() {
    try {
      const bridgePath = path.join(
        process.env.OPENCLAW_WORKSPACE || 'C:/Users/DELL/.openclaw/workspace',
        'skills/firecrawl-mcp/dist/bridge'
      );
      const { createFirecrawlMCPBridge } = require(bridgePath);
      const bridge = createFirecrawlMCPBridge();
      await bridge.start();
      return bridge;
    } catch (error) {
      console.log(`[CapabilityManager] Firecrawl MCP加载失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 注册MCP (手动方式)
   */
  registerMCP(name, mcp) {
    this.registry.register(name, mcp);
    this.capabilityCache.clear();
  }

  /**
   * 获取所有能力列表
   */
  getAllCapabilities() {
    const capabilities = new Set();
    for (const mcpInfo of this.registry.getAll()) {
      for (const cap of mcpInfo.capabilities) {
        capabilities.add(cap);
      }
    }
    return Array.from(capabilities);
  }

  /**
   * 获取能力详情
   */
  getCapabilityDetails(capability) {
    const mcps = this.findMCPsByCapability(capability);
    if (mcps.length === 0) {
      return null;
    }
    
    return {
      capability,
      mcps: mcps.map(mcp => ({
        name: mcp.name,
        toolCount: mcp.toolCount,
      })),
      count: mcps.length,
    };
  }

  /**
   * 根据能力查找MCP
   */
  findMCPsByCapability(capability) {
    // 检查缓存
    const cacheKey = `cap:${capability}`;
    if (this.capabilityCache.has(cacheKey)) {
      return this.capabilityCache.get(cacheKey);
    }
    
    const result = this.registry.getAll().filter(mcp => 
      mcp.capabilities.includes(capability)
    );
    
    // 缓存结果
    this.capabilityCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * 根据关键词查找工具
   */
  findToolsByKeyword(keyword) {
    const results = [];
    const lowerKeyword = keyword.toLowerCase();
    
    for (const mcpInfo of this.registry.getAll()) {
      const tools = mcpInfo.mcp.getToolList ? mcpInfo.mcp.getToolList() : [];
      for (const tool of tools) {
        if (tool.name.toLowerCase().includes(lowerKeyword) ||
            tool.description.toLowerCase().includes(lowerKeyword)) {
          results.push({
            mcp: mcpInfo.name,
            tool: tool.name,
            description: tool.description,
            category: tool.category,
          });
        }
      }
    }
    
    return results;
  }

  /**
   * 智能关键词匹配 - 支持中文分词和模糊匹配
   * @param {string} text - 用户输入
   * @returns {string[]} 匹配到的关键词列表
   */
  smartKeywordMatch(text) {
    const lowerText = text.toLowerCase();
    const matchedKeywords = [];
    
    // 1. 精确子串匹配
    for (const keyword of Object.keys(NEED_TO_CAPABILITIES)) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }
    
    // 2. 中文分词匹配 - 将连续中文字符分段尝试匹配
    const chineseChars = text.match(/[\u4e00-\u9fa5]+/g) || [];
    for (const chunk of chineseChars) {
      // 尝试2-4字组合
      for (let len = 2; len <= 4 && len <= chunk.length; len++) {
        for (let i = 0; i <= chunk.length - len; i++) {
          const subWord = chunk.substring(i, i + len);
          if (NEED_TO_CAPABILITIES[subWord]) {
            matchedKeywords.push(subWord);
          }
        }
      }
    }
    
    // 3. 英文单词匹配 - 提取英文单词进行匹配
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    for (const word of englishWords) {
      const lowerWord = word.toLowerCase();
      // 匹配完整单词或前缀
      for (const keyword of Object.keys(NEED_TO_CAPABILITIES)) {
        if (keyword.toLowerCase() === lowerWord || 
            lowerWord.startsWith(keyword.toLowerCase()) ||
            keyword.toLowerCase().startsWith(lowerWord)) {
          matchedKeywords.push(keyword);
        }
      }
    }
    
    // 去重
    return [...new Set(matchedKeywords)];
  }

  /**
   * 根据需求推荐MCP - 增强版
   */
  recommendMCPsForNeed(needDescription) {
    const matchedKeywords = this.smartKeywordMatch(needDescription);
    const matchedCapabilities = [];
    
    // 根据匹配到的关键词获取对应能力
    for (const keyword of matchedKeywords) {
      const capabilities = NEED_TO_CAPABILITIES[keyword];
      if (capabilities) {
        matchedCapabilities.push(...capabilities);
      }
    }
    
    // 去重
    const uniqueCapabilities = [...new Set(matchedCapabilities)];
    
    // 查找有这些能力的MCP
    const recommendedMCPs = new Map();
    for (const capability of uniqueCapabilities) {
      const mcps = this.findMCPsByCapability(capability);
      for (const mcp of mcps) {
        if (!recommendedMCPs.has(mcp.name)) {
          recommendedMCPs.set(mcp.name, {
            name: mcp.name,
            matchedCapabilities: [],
            score: 0,
            matchedKeywords: [],
          });
        }
        recommendedMCPs.get(mcp.name).matchedCapabilities.push(capability);
        recommendedMCPs.get(mcp.name).score++;
        // 记录匹配的关键词（去重）
        const mcpRec = recommendedMCPs.get(mcp.name);
        for (const kw of matchedKeywords) {
          if (NEED_TO_CAPABILITIES[kw]?.some(cap => mcp.capabilities.includes(cap))) {
            if (!mcpRec.matchedKeywords.includes(kw)) {
              mcpRec.matchedKeywords.push(kw);
            }
          }
        }
      }
    }
    
    // 转换为数组并按分数排序
    const results = Array.from(recommendedMCPs.values())
      .sort((a, b) => b.score - a.score);
    
    return {
      need: needDescription,
      matchedKeywords,  // 新增：显示匹配到的关键词
      matchedCapabilities: uniqueCapabilities,
      recommendations: results,
    };
  }

  /**
   * 推荐工具
   */
  recommendToolsForNeed(needDescription) {
    const recommendations = this.recommendMCPsForNeed(needDescription);
    const tools = [];
    
    for (const rec of recommendations.recommendations) {
      const mcpInfo = this.registry.get(rec.name);
      if (mcpInfo && mcpInfo.mcp.getToolList) {
        const mcpTools = mcpInfo.mcp.getToolList();
        // 取前3个工具作为推荐
        tools.push(...mcpTools.slice(0, 3).map(t => ({
          mcp: rec.name,
          tool: t.name,
          description: t.description,
        })));
      }
    }
    
    return {
      need: needDescription,
      tools: tools.slice(0, 10), // 最多返回10个工具
    };
  }

  /**
   * 查询能力 - 统一的查询入口
   */
  query(capability) {
    // 记录查询历史
    this.queryHistory.push({
      capability,
      timestamp: new Date().toISOString(),
    });
    
    const details = this.getCapabilityDetails(capability);
    if (!details) {
      return {
        found: false,
        capability,
        message: `未找到能力: ${capability}`,
      };
    }
    
    return {
      found: true,
      ...details,
    };
  }

  /**
   * 获取系统概览
   */
  getOverview() {
    const mcps = this.registry.getAll();
    const totalCapabilities = this.getAllCapabilities().length;
    const totalTools = mcps.reduce((sum, mcp) => sum + mcp.toolCount, 0);
    
    return {
      mcpCount: mcps.length,
      totalCapabilities,
      totalTools,
      mcps: mcps.map(mcp => ({
        name: mcp.name,
        capabilities: mcp.capabilities.length,
        tools: mcp.toolCount,
        connected: mcp.stats.connected || false,
      })),
    };
  }

  /**
   * 获取查询历史
   */
  getQueryHistory() {
    return this.queryHistory.slice(-20); // 返回最近20条
  }

  /**
   * 获取能力地图 (用于可视化)
   */
  getCapabilityMap() {
    const map = new Map();
    
    for (const mcpInfo of this.registry.getAll()) {
      for (const capability of mcpInfo.capabilities) {
        if (!map.has(capability)) {
          map.set(capability, []);
        }
        map.get(capability).push(mcpInfo.name);
      }
    }
    
    return Object.fromEntries(map);
  }

  /**
   * 能力分类 - 按类别分组
   */
  getCapabilitiesByCategory() {
    const categories = {
      'browser': {
        name: '浏览器控制',
        capabilities: [],
        mcps: [],
      },
      'web_scraping': {
        name: '网页爬取',
        capabilities: [],
        mcps: [],
      },
      'github': {
        name: 'GitHub操作',
        capabilities: [],
        mcps: [],
      },
      'other': {
        name: '其他能力',
        capabilities: [],
        mcps: [],
      },
    };

    const capabilityToCategory = {
      'browser-automation': 'browser',
      'browser-control': 'browser',
      'web-interaction': 'browser',
      'screenshot': 'browser',
      'page-navigation': 'browser',
      'form-fill': 'browser',
      'javascript-execution': 'browser',
      'web-scraping': 'web_scraping',
      'firecrawl-crawl': 'web_scraping',
      'firecrawl-extract': 'web_scraping',
      'content-extraction': 'web_scraping',
      'link-discovery': 'web_scraping',
      'github-repos': 'github',
      'github-issues': 'github',
      'github-pull_requests': 'github',
      'github-actions': 'github',
      'github-users': 'github',
      'github-gists': 'github',
      'github-notifications': 'github',
      'github-search': 'github',
    };

    for (const mcpInfo of this.registry.getAll()) {
      for (const capability of mcpInfo.capabilities) {
        const category = capabilityToCategory[capability] || 'other';
        if (!categories[category].capabilities.includes(capability)) {
          categories[category].capabilities.push(capability);
        }
        if (!categories[category].mcps.includes(mcpInfo.name)) {
          categories[category].mcps.push(mcpInfo.name);
        }
      }
    }

    return categories;
  }

  /**
   * 获取可视化数据 - 节点和边
   */
  getVisualizationData() {
    const nodes = [];
    const edges = [];
    const addedCapabilities = new Set();

    // 添加MCP节点
    for (const mcpInfo of this.registry.getAll()) {
      nodes.push({
        id: mcpInfo.name,
        type: 'mcp',
        label: mcpInfo.name.replace('-mcp', '').toUpperCase(),
        toolCount: mcpInfo.toolCount,
        capabilityCount: mcpInfo.capabilities.length,
        connected: mcpInfo.stats.connected || false,
      });

      // 添加MCP到能力的边
      for (const capability of mcpInfo.capabilities) {
        if (!addedCapabilities.has(capability)) {
          const category = this.getCapabilityCategory(capability);
          nodes.push({
            id: capability,
            type: 'capability',
            label: capability,
            category,
          });
          addedCapabilities.add(capability);
        }

        edges.push({
          source: mcpInfo.name,
          target: capability,
          type: 'provides',
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * 获取能力所属类别
   */
  getCapabilityCategory(capability) {
    if (capability.startsWith('browser-') || capability.startsWith('screenshot')) return 'browser';
    if (capability.startsWith('web-') || capability.startsWith('firecrawl') || capability.startsWith('content') || capability.startsWith('link')) return 'web_scraping';
    if (capability.startsWith('github-')) return 'github';
    return 'other';
  }

  /**
   * 获取MCP详细状态
   */
  getMCPDetails(mcpName) {
    const mcpInfo = this.registry.get(mcpName);
    if (!mcpInfo) {
      return { found: false, message: `MCP ${mcpName} 未找到` };
    }

    const tools = mcpInfo.mcp.getToolList ? mcpInfo.mcp.getToolList() : [];

    return {
      found: true,
      name: mcpInfo.name,
      capabilities: mcpInfo.capabilities,
      capabilityCount: mcpInfo.capabilities.length,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        category: t.category || 'unknown',
      })),
      toolCount: mcpInfo.toolCount,
      connected: mcpInfo.stats.connected || false,
      registeredAt: mcpInfo.registeredAt,
    };
  }

  /**
   * 搜索能力 - 模糊搜索
   */
  searchCapabilities(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const mcpInfo of this.registry.getAll()) {
      // 搜索能力名称
      for (const cap of mcpInfo.capabilities) {
        if (cap.toLowerCase().includes(lowerQuery)) {
          results.push({
            capability: cap,
            mcp: mcpInfo.name,
            matchType: 'capability_name',
          });
        }
      }

      // 搜索工具名称和描述
      const tools = mcpInfo.mcp.getToolList ? mcpInfo.mcp.getToolList() : [];
      for (const tool of tools) {
        if (tool.name.toLowerCase().includes(lowerQuery) ||
            (tool.description && tool.description.toLowerCase().includes(lowerQuery))) {
          results.push({
            capability: 'tool',
            mcp: mcpInfo.name,
            toolName: tool.name,
            description: tool.description,
            matchType: tool.name.toLowerCase().includes(lowerQuery) ? 'tool_name' : 'tool_description',
          });
        }
      }
    }

    return results;
  }

  /**
   * MCP对比 - 对比多个MCP的能力
   */
  compareMCPs(mcpNames) {
    const comparison = {
      mcps: {},
      commonCapabilities: [],
      uniqueCapabilities: {},
    };

    const mcpCapabilityMap = new Map();

    // 收集每个MCP的能力
    for (const name of mcpNames) {
      const mcpInfo = this.registry.get(name);
      if (mcpInfo) {
        mcpCapabilityMap.set(name, new Set(mcpInfo.capabilities));
        comparison.mcps[name] = {
          capabilities: mcpInfo.capabilities,
          capabilityCount: mcpInfo.capabilities.length,
        };
      }
    }

    // 找出共同能力
    if (mcpCapabilityMap.size > 1) {
      const firstMCP = mcpCapabilityMap.values().next().value;
      const common = [...firstMCP];

      for (const [, caps] of mcpCapabilityMap) {
        for (const cap of common) {
          if (!caps.has(cap)) {
            common.splice(common.indexOf(cap), 1);
          }
        }
      }

      comparison.commonCapabilities = common;
    }

    // 找出每个MCP独有的能力
    for (const [name, caps] of mcpCapabilityMap) {
      const unique = [];
      for (const cap of caps) {
        let isUnique = true;
        for (const [otherName, otherCaps] of mcpCapabilityMap) {
          if (otherName !== name && otherCaps.has(cap)) {
            isUnique = false;
            break;
          }
        }
        if (isUnique) {
          unique.push(cap);
        }
      }
      comparison.uniqueCapabilities[name] = unique;
    }

    return comparison;
  }

  /**
   * 获取能力统计
   */
  getCapabilityStats() {
    const stats = {
      totalMcps: this.registry.getCount(),
      totalCapabilities: this.getAllCapabilities().length,
      totalTools: 0,
      mcpToolDistribution: [],
      topCapabilities: [],
    };

    const capabilityCount = new Map();

    for (const mcpInfo of this.registry.getAll()) {
      stats.totalTools += mcpInfo.toolCount;
      stats.mcpToolDistribution.push({
        mcp: mcpInfo.name,
        tools: mcpInfo.toolCount,
      });

      for (const cap of mcpInfo.capabilities) {
        capabilityCount.set(cap, (capabilityCount.get(cap) || 0) + 1);
      }
    }

    // 按出现次数排序能力
    stats.topCapabilities = [...capabilityCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cap, count]) => ({ capability: cap, mcpCount: count }));

    return stats;
  }
}

// ==================== 导出 ====================

module.exports = {
  CapabilityManager,
  MCPRegistry,
  CAPABILITY_CATEGORIES,
  CAPABILITY_TO_MCP,
  NEED_TO_CAPABILITIES,
};

// 创建单例实例
let instance = null;

/**
 * 获取CapabilityManager单例
 */
function getCapabilityManager() {
  if (!instance) {
    instance = new CapabilityManager();
  }
  return instance;
}

module.exports.getCapabilityManager = getCapabilityManager;
