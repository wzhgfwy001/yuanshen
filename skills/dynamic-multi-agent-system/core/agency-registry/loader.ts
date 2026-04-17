/**
 * Agency Registry - Agent加载器
 * 
 * 功能：
 * 1. 根据关键词从AGENCY-MAPPING查找对应Agent
 * 2. 读取Agent文件并提取关键section
 * 3. 将专业知识注入到子Agent的prompt中
 */

import * as fs from 'fs';
import * as path from 'path';

// Agency Agents根目录
const AGENCY_ROOT = path.join(
  process.env.OPENCLAW_HOME || '',
  'workspace',
  'temp-agency',
  'agency-agents'
);

// 映射表路径
const MAPPING_FILE = path.join(
  __dirname,
  '..',
  'agency-registry',
  'AGENCY-MAPPING.md'
);

// 缓存文件
const REGISTRY_CACHE = path.join(__dirname, 'registry.json');

export interface AgencyAgent {
  name: string;
  description: string;
  emoji: string;
  color: string;
  vibe: string;
  sections: {
    identity?: string;
    mission?: string;
    rules?: string;
    deliverables?: string;
    workflow?: string;
    style?: string;
    metrics?: string;
    capabilities?: string;
  };
  raw: string;
}

export interface AgentMatch {
  keyword: string;
  agentFile: string;
  agent: AgencyAgent;
  matchScore: number;
}

/** 从frontmatter提取字段 */
function extractField(content: string, field: string): string {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let found = false;
  let value = '';

  for (const line of lines) {
    if (line.trim() === '---') {
      if (inFrontmatter && found) break;
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && line.startsWith(`${field}:`)) {
      value = line.substring(field.length + 1).trim();
      found = true;
    }
  }
  return value;
}

/** 提取body中指定section的内容 */
function extractSection(content: string, sectionName: string): string {
  const lines = content.split('\n');
  const sections: string[] = [];
  let currentSection = '';
  let inTargetSection = false;

  for (const line of lines) {
    // 检测##开头的section
    if (line.match(/^##\s/)) {
      if (inTargetSection) {
        sections.push(currentSection.trim());
        currentSection = '';
      }
      const headerLower = line.toLowerCase();
      // 匹配section名称（忽略emoji）
      const sectionMatch = sectionName.toLowerCase();
      if (headerLower.includes(sectionMatch) || 
          (sectionName === 'identity' && headerLower.includes('identity')) ||
          (sectionName === 'rules' && headerLower.includes('critical rule')) ||
          (sectionName === 'deliverables' && headerLower.includes('deliverable')) ||
          (sectionName === 'workflow' && headerLower.includes('workflow'))) {
        inTargetSection = true;
      } else {
        inTargetSection = false;
      }
      currentSection = line + '\n';
    } else if (inTargetSection) {
      currentSection += line + '\n';
    }
  }

  if (inTargetSection && currentSection.trim()) {
    sections.push(currentSection.trim());
  }

  return sections.join('\n\n');
}

/** 解析单个Agent文件 */
export function parseAgentFile(filePath: string): AgencyAgent | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 提取frontmatter字段
    const name = extractField(content, 'name');
    const description = extractField(content, 'description');
    const emoji = extractField(content, 'emoji') || '🎯';
    const color = extractField(content, 'color') || '#8b5cf6';
    const vibe = extractField(content, 'vibe') || '';

    // 提取关键section
    const sections = {
      identity: extractSection(content, 'identity'),
      mission: extractSection(content, 'mission'),
      rules: extractSection(content, 'rules'),
      deliverables: extractSection(content, 'deliverables'),
      workflow: extractSection(content, 'workflow'),
      style: extractSection(content, 'style'),
      metrics: extractSection(content, 'metrics'),
      capabilities: extractSection(content, 'capabilities'),
    };

    return {
      name,
      description,
      emoji,
      color,
      vibe,
      sections,
      raw: content,
    };
  } catch (error) {
    console.error(`解析Agent文件失败: ${filePath}`, error);
    return null;
  }
}

/** 加载指定目录下的所有Agent文件 */
export function loadAgentsFromDirectory(dirPath: string): Map<string, AgencyAgent> {
  const agents = new Map<string, AgencyAgent>();

  if (!fs.existsSync(dirPath)) {
    console.warn(`目录不存在: ${dirPath}`);
    return agents;
  }

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.endsWith('.md')) {
      const filePath = path.join(dirPath, file);
      const agent = parseAgentFile(filePath);
      if (agent && agent.name) {
        agents.set(agent.name.toLowerCase().replace(/\s+/g, '-'), agent);
      }
    }
  }

  return agents;
}

/** 根据关键词搜索匹配的Agent */
export function searchAgents(keywords: string[]): AgentMatch[] {
  const matches: AgentMatch[] = [];
  
  // 加载所有Agent目录
  const categories = [
    'engineering',
    'marketing', 
    'product',
    'specialized',
    'design',
    'finance',
    'game-development',
    'academic',
    'strategy',
    'sales',
    'support',
    'testing',
    'paid-media',
    'project-management',
    'spatial-computing',
  ];

  for (const category of categories) {
    const dirPath = path.join(AGENCY_ROOT, category);
    const agents = loadAgentsFromDirectory(dirPath);

    for (const [key, agent] of agents) {
      let matchScore = 0;
      
      for (const keyword of keywords) {
        const kwLower = keyword.toLowerCase();
        
        // 检查名称和描述
        if (agent.name.toLowerCase().includes(kwLower)) {
          matchScore += 10;
        }
        if (agent.description.toLowerCase().includes(kwLower)) {
          matchScore += 5;
        }
        if (agent.vibe.toLowerCase().includes(kwLower)) {
          matchScore += 3;
        }
        
        // 检查section内容
        const sections = Object.values(agent.sections).join(' ').toLowerCase();
        if (sections.includes(kwLower)) {
          matchScore += 1;
        }
      }

      if (matchScore > 0) {
        matches.push({
          keyword: keywords.join(','),
          agentFile: `${category}/${path.basename(key)}`,
          agent,
          matchScore,
        });
      }
    }
  }

  // 按匹配度排序
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

/** 将Agent专业知识注入到prompt模板 */
export function injectAgentKnowledge(
  basePrompt: string,
  agent: AgencyAgent,
  options?: {
    includeIdentity?: boolean;
    includeRules?: boolean;
    includeDeliverables?: boolean;
    includeWorkflow?: boolean;
  }
): string {
  const opts = {
    includeIdentity: true,
    includeRules: true,
    includeDeliverables: true,
    includeWorkflow: true,
    ...options,
  };

  let enhanced = basePrompt;

  // 注入专业知识分隔符
  const knowledgeHeader = '\n\n[Agency Agent 专业知识]\n';

  // 注入Identity
  if (opts.includeIdentity && agent.sections.identity) {
    enhanced += knowledgeHeader + `## 身份与思维\n${agent.sections.identity}`;
  }

  // 注入Critical Rules
  if (opts.includeRules && agent.sections.rules) {
    enhanced += '\n\n## 关键规则\n' + agent.sections.rules;
  }

  // 注入Deliverables
  if (opts.includeDeliverables && agent.sections.deliverables) {
    enhanced += '\n\n## 交付标准\n' + agent.sections.deliverables;
  }

  // 注入Workflow
  if (opts.includeWorkflow && agent.sections.workflow) {
    enhanced += '\n\n## 工作流程\n' + agent.sections.workflow;
  }

  return enhanced;
}

/** 根据关键词构建带专业知识的prompt */
export function buildEnhancedPrompt(
  basePrompt: string,
  keywords: string[]
): { prompt: string; matchedAgents: AgencyAgent[] } {
  const matches = searchAgents(keywords);
  
  if (matches.length === 0) {
    return { prompt: basePrompt, matchedAgents: [] };
  }

  // 取最高匹配度的Agent
  const topMatch = matches[0];
  const enhanced = injectAgentKnowledge(basePrompt, topMatch.agent);

  return {
    prompt: enhanced,
    matchedAgents: [topMatch.agent],
  };
}

/** 预加载所有Agent到缓存 */
export function preloadAllAgents(): void {
  console.log('[Agency Registry] 开始预加载所有Agent...');
  
  const categories = [
    'engineering', 'marketing', 'product', 'specialized',
    'design', 'finance', 'game-development',
  ];

  const allAgents: Record<string, AgencyAgent> = {};

  for (const category of categories) {
    const dirPath = path.join(AGENCY_ROOT, category);
    const agents = loadAgentsFromDirectory(dirPath);
    
    for (const [key, agent] of agents) {
      allAgents[`${category}/${key}`] = agent;
    }
  }

  // 保存到缓存
  const cacheDir = path.dirname(REGISTRY_CACHE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  fs.writeFileSync(REGISTRY_CACHE, JSON.stringify({
    version: '1.0.0',
    updated: new Date().toISOString(),
    agents: allAgents,
  }, null, 2));

  console.log(`[Agency Registry] 已缓存 ${Object.keys(allAgents).length} 个Agent`);
}

/** 从缓存加载 */
export function loadFromCache(): Record<string, AgencyAgent> | null {
  try {
    if (fs.existsSync(REGISTRY_CACHE)) {
      const cacheData = JSON.parse(fs.readFileSync(REGISTRY_CACHE, 'utf-8'));
      return cacheData.agents;
    }
  } catch (error) {
    console.error('[Agency Registry] 读取缓存失败:', error);
  }
  return null;
}

// CLI模式
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--rebuild') {
    console.log('重建Agent索引...');
    preloadAllAgents();
    console.log('完成!');
  } else if (args[0] === '--search') {
    const keywords = args.slice(1);
    if (keywords.length === 0) {
      console.log('用法: loader.ts --search <关键词>');
      process.exit(1);
    }
    const results = searchAgents(keywords);
    console.log(`找到 ${results.length} 个匹配的Agent:`);
    results.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. ${r.agent.name} (匹配度: ${r.matchScore})`);
      console.log(`   文件: ${r.agentFile}`);
    });
  } else {
    console.log('用法:');
    console.log('  loader.ts --rebuild     重建索引');
    console.log('  loader.ts --search <关键词>  搜索Agent');
  }
}
