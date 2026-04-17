/**
 * Agency Agent 关键词检测器
 * 
 * 在任务分类后检测是否需要加载Agency Agent专业知识
 */

// 中国市场关键词
const CHINA_PLATFORMS = [
  '小红书', '抖音', '微信公众号', '微信小程序', 'B站', '哔哩哔哩',
  '微博', '知乎', '快手', '小红书运营', '抖音运营', '微信生态',
  '飞书', '钉钉', '企业微信', '微信视频号', '私域', '公众号'
];

const MARKETING_KEYWORDS = [
  '内容运营', '用户增长', '增长黑客', '私域流量', 'KOL', 'KOC',
  '品牌营销', '电商运营', '跨境电商', '直播带货', '短视频',
  'SEO', 'SEM', '广告投放', '社群运营', '粉丝运营'
];

const ENGINEERING_KEYWORDS = [
  '代码审查', '代码审计', '安全测试', '渗透测试', '漏洞扫描',
  '前端开发', '后端开发', '全栈开发', '架构设计', '系统设计',
  '数据库优化', '性能优化', 'DevOps', 'CI/CD', '容器化',
  '微服务', '分布式', '云原生', '小程序开发', 'API设计',
  '接口设计', '技术选型', '代码规范', '重构', '单元测试',
  '集成测试', 'E2E测试', '测试用例', '压力测试', '安全加固'
];

const PRODUCT_KEYWORDS = [
  'PRD', '需求文档', '产品经理', '产品设计', '需求分析',
  '竞品分析', '用户研究', '用户画像', '产品规划', ' roadmap',
  '产品迭代', '功能设计', '交互设计', '原型设计', '需求评审',
  '用户故事', '故事地图', '优先级', 'MVP', 'PRD评审'
];

const DATA_KEYWORDS = [
  '数据分析', '数据可视化', '报表', '数据挖掘', 'BI',
  '数据清洗', 'ETL', '数据仓库', '指标体系', 'AB测试',
  '统计', '机器学习', '深度学习', 'AI', '模型训练'
];

const DESIGN_KEYWORDS = [
  'UI设计', 'UX设计', '交互设计', '视觉设计', '品牌设计',
  '平面设计', '原型设计', '设计系统', 'UI规范', '设计稿',
  '设计评审', '设计切图', '设计交付', '动效设计', '插画'
];

const GAME_KEYWORDS = [
  'Unity', 'Unreal', '游戏开发', '游戏策划', '游戏运营',
  '游戏测试', '游戏美术', '2D', '3D', '角色设计',
  '场景设计', '关卡设计', '数值策划', '剧情策划'
];

export interface DetectionResult {
  detected: boolean;
  keywords: string[];
  matchedCategories: string[];
  suggestedAgents: string[];
  confidence: number;
}

/**
 * 检测用户输入是否包含需要Agency Agent的关键词
 */
export function detectAgencyAgentNeed(input: string): DetectionResult {
  const inputLower = input.toLowerCase();
  const inputCn = input; // 保留中文
  
  const detectedKeywords: string[] = [];
  const matchedCategories: string[] = [];
  const suggestedAgents: string[] = [];

  // 1. 检测中国市场平台
  for (const keyword of CHINA_PLATFORMS) {
    if (input.includes(keyword)) {
      detectedKeywords.push(keyword);
      if (!matchedCategories.includes('china')) {
        matchedCategories.push('china');
      }
    }
  }

  // 2. 检测营销关键词
  for (const keyword of MARKETING_KEYWORDS) {
    if (input.includes(keyword)) {
      detectedKeywords.push(keyword);
      if (!matchedCategories.includes('marketing')) {
        matchedCategories.push('marketing');
      }
    }
  }

  // 3. 检测工程关键词
  for (const keyword of ENGINEERING_KEYWORDS) {
    if (input.includes(keyword)) {
      detectedKeywords.push(keyword);
      if (!matchedCategories.includes('engineering')) {
        matchedCategories.push('engineering');
      }
    }
  }

  // 4. 检测产品关键词
  for (const keyword of PRODUCT_KEYWORDS) {
    if (input.includes(keyword)) {
      detectedKeywords.push(keyword);
      if (!matchedCategories.includes('product')) {
        matchedCategories.push('product');
      }
    }
  }

  // 5. 检测数据关键词
  for (const keyword of DATA_KEYWORDS) {
    if (input.includes(keyword)) {
      detectedKeywords.push(keyword);
      if (!matchedCategories.includes('data')) {
        matchedCategories.push('data');
      }
    }
  }

  // 6. 检测设计关键词
  for (const keyword of DESIGN_KEYWORDS) {
    if (input.includes(keyword)) {
      detectedKeywords.push(keyword);
      if (!matchedCategories.includes('design')) {
        matchedCategories.push('design');
      }
    }
  }

  // 7. 英文关键词检测
  const englishKeywords: Record<string, string[]> = {
    'security': ['engineering-security-engineer'],
    'security audit': ['engineering-security-engineer'],
    'frontend': ['engineering-frontend-developer'],
    'backend': ['engineering-backend-architect'],
    'full stack': ['engineering-senior-developer'],
    'architecture': ['engineering-software-architect'],
    'xiaohongshu': ['marketing-xiaohongshu-specialist'],
    'douyin': ['marketing-douyin-strategist'],
    'wechat': ['marketing-wechat-official-account'],
    'bilibili': ['marketing-bilibili-content-strategist'],
    'code review': ['engineering-code-reviewer'],
    'devops': ['engineering-devops-automator'],
    'database': ['engineering-database-optimizer'],
    'data analysis': ['engineering-data-engineer'],
    'product manager': ['product-manager'],
    'UI design': ['design-ui-designer'],
    'UX design': ['design-ux-designer'],
  };

  for (const [keyword, agents] of Object.entries(englishKeywords)) {
    if (inputLower.includes(keyword)) {
      detectedKeywords.push(keyword);
      suggestedAgents.push(...agents);
    }
  }

  // 基于关键词映射到Agent
  for (const kw of detectedKeywords) {
    const agent = keywordToAgentMap[kw];
    if (agent && !suggestedAgents.includes(agent)) {
      suggestedAgents.push(agent);
    }
  }

  // 计算置信度
  const confidence = Math.min(detectedKeywords.length * 0.2 + matchedCategories.length * 0.1, 1.0);

  return {
    detected: detectedKeywords.length > 0,
    keywords: detectedKeywords,
    matchedCategories,
    suggestedAgents: [...new Set(suggestedAgents)],
    confidence,
  };
}

// 关键词 → Agent文件 映射
const keywordToAgentMap: Record<string, string> = {
  // 小红书生态
  '小红书': 'marketing/marketing-xiaohongshu-specialist.md',
  '小红书运营': 'marketing/marketing-xiaohongshu-specialist.md',
  
  // 抖音
  '抖音': 'marketing/marketing-douyin-strategist.md',
  '抖音运营': 'marketing/marketing-douyin-strategist.md',
  '短视频': 'marketing/marketing-douyin-strategist.md',
  
  // 微信
  '微信公众号': 'marketing/marketing-wechat-official-account.md',
  '微信生态': 'marketing/marketing-wechat-official-account.md',
  '公众号': 'marketing/marketing-wechat-official-account.md',
  
  // B站
  'B站': 'marketing/marketing-bilibili-content-strategist.md',
  '哔哩哔哩': 'marketing/marketing-bilibili-content-strategist.md',
  
  // 飞书
  '飞书': 'engineering/engineering-feishu-integration-developer.md',
  
  // 微信小程序
  '微信小程序': 'engineering/engineering-wechat-mini-program-developer.md',
  '小程序': 'engineering/engineering-wechat-mini-program-developer.md',
  
  // 安全
  '安全': 'engineering/engineering-security-engineer.md',
  '漏洞': 'engineering/engineering-security-engineer.md',
  '渗透测试': 'engineering/engineering-security-engineer.md',
  '安全测试': 'engineering/engineering-security-engineer.md',
  
  // 代码审查
  '代码审查': 'engineering/engineering-code-reviewer.md',
  '代码审计': 'engineering/engineering-code-reviewer.md',
  
  // 前端
  '前端开发': 'engineering/engineering-frontend-developer.md',
  '前端': 'engineering/engineering-frontend-developer.md',
  
  // 后端
  '后端开发': 'engineering/engineering-backend-architect.md',
  '后端': 'engineering/engineering-backend-architect.md',
  
  // 架构
  '架构设计': 'engineering/engineering-software-architect.md',
  '系统设计': 'engineering/engineering-software-architect.md',
  
  // 数据库
  '数据库优化': 'engineering/engineering-database-optimizer.md',
  '数据库': 'engineering/engineering-database-optimizer.md',
  
  // 数据分析
  '数据分析': 'engineering/engineering-data-engineer.md',
  '数据挖掘': 'engineering/engineering-data-engineer.md',
  
  // 产品经理
  'PRD': 'product/product-manager.md',
  '需求文档': 'product/product-manager.md',
  '产品经理': 'product/product-manager.md',
  
  // DevOps
  'DevOps': 'engineering/engineering-devops-automator.md',
  'CI/CD': 'engineering/engineering-devops-automator.md',
  
  // UI/UX
  'UI设计': 'design/design-ui-designer.md',
  'UX设计': 'design/design-ux-designer.md',
  '交互设计': 'design/design-ux-designer.md',
  
  // 增长
  '增长黑客': 'marketing/marketing-growth-hacker.md',
  '用户增长': 'marketing/marketing-growth-hacker.md',
  
  // 私域
  '私域流量': 'marketing/marketing-private-domain-operator.md',
  '私域': 'marketing/marketing-private-domain-operator.md',
  
  // 跨境电商
  '跨境电商': 'marketing/marketing-cross-border-ecommerce.md',
  '电商运营': 'marketing/marketing-china-ecommerce-operator.md',
};

// CLI测试
if (require.main === module) {
  const testInputs = [
    '帮我写一个小红书运营方案',
    '需要代码审查和安全测试',
    '做一个抖音短视频内容策划',
    '开发一个微信小程序商城',
    '设计一个产品PRD文档',
  ];

  console.log('=== Agency Agent 关键词检测测试 ===\n');
  
  for (const input of testInputs) {
    const result = detectAgencyAgentNeed(input);
    console.log(`输入: "${input}"`);
    console.log(`  检测结果: ${result.detected}`);
    console.log(`  关键词: ${result.keywords.join(', ')}`);
    console.log(`  类别: ${result.matchedCategories.join(', ')}`);
    console.log(`  建议Agent: ${result.suggestedAgents.join(', ')}`);
    console.log(`  置信度: ${(result.confidence * 100).toFixed(0)}%`);
    console.log();
  }
}
