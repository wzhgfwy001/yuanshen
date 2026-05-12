/**
 * Agency Registry - Agent加载器 v2
 * 
 * 功能：
 * 1. 根据关键词从registry.json查找对应Agent
 * 2. 读取Agent文件并提取关键section
 * 3. 将专业知识注入到子Agent的prompt中
 * 
 * v2更新: 支持扁平目录结构的prompts文件 (category-name.md格式)
 */

const fs = require('fs');
const path = require('path');

// Agency Registry根目录 (loader.js所在目录)
const REGISTRY_DIR = __dirname;

// Prompts目录 - 扁平结构，文件名为 category-name.md
const PROMPTS_DIR = path.join(REGISTRY_DIR, 'prompts');

// registry.json路径 - 包含所有Agent索引
const REGISTRY_JSON = path.join(REGISTRY_DIR, 'registry.json');

// 内存缓存
let agentsCache = null;
let registryCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/** 加载registry.json */
function loadRegistry() {
  const now = Date.now();
  
  if (agentsCache && (now - registryCacheTime) < CACHE_TTL) {
    return agentsCache;
  }
  
  try {
    if (fs.existsSync(REGISTRY_JSON)) {
      const data = JSON.parse(fs.readFileSync(REGISTRY_JSON, 'utf-8'));
      agentsCache = data.agents || {};
      registryCacheTime = now;
      console.log(`[Agency Registry] 加载了 ${Object.keys(agentsCache).length} 个Agent`);
      return agentsCache;
    }
  } catch (error) {
    console.error('[Agency Registry] 加载registry.json失败:', error);
  }
  
  return {};
}

/** 从frontmatter提取字段 */
function extractField(content, field) {
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
function extractSection(content, sectionName) {
  const lines = content.split('\n');
  let currentSection = '';
  let inTargetSection = false;

  for (const line of lines) {
    if (line.match(/^##\s/)) {
      if (inTargetSection) {
        currentSection = currentSection.trim();
        if (currentSection) return currentSection;
      }
      const headerLower = line.toLowerCase();
      const sectionMatch = sectionName.toLowerCase();
      
      // 匹配逻辑
      if (
        headerLower.includes(sectionMatch) ||
        (sectionName === 'identity' && (headerLower.includes('identity') || headerLower.includes('身份'))) ||
        (sectionName === 'rules' && (headerLower.includes('critical') || headerLower.includes('规则') || headerLower.includes('关键'))) ||
        (sectionName === 'deliverables' && (headerLower.includes('deliverable') || headerLower.includes('交付'))) ||
        (sectionName === 'workflow' && (headerLower.includes('workflow') || headerLower.includes('工作流') || headerLower.includes('流程')))
      ) {
        inTargetSection = true;
      } else {
        inTargetSection = false;
      }
      currentSection = line + '\n';
    } else if (inTargetSection) {
      currentSection += line + '\n';
    }
  }

  return currentSection.trim();
}

/** 解析单个Agent文件，返回结构化内容 */
function parseAgentFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 提取frontmatter字段
    const name = extractField(content, 'name');
    const description = extractField(content, 'description') || extractField(content, 'role') || '';
    const emoji = extractField(content, 'emoji') || '🎯';
    const color = extractField(content, 'color') || '#8b5cf6';
    const vibe = extractField(content, 'vibe') || '';

    // 提取关键section
    const sections = {
      identity: extractSection(content, 'identity') || extractSection(content, '角色'),
      mission: extractSection(content, 'mission') || extractSection(content, '使命'),
      rules: extractSection(content, 'rules') || extractSection(content, '关键规则'),
      deliverables: extractSection(content, 'deliverables') || extractSection(content, '交付物'),
      workflow: extractSection(content, 'workflow') || extractSection(content, '工作流程'),
      style: extractSection(content, 'style') || extractSection(content, '风格'),
      metrics: extractSection(content, 'metrics') || extractSection(content, '指标'),
      capabilities: extractSection(content, 'capabilities') || extractSection(content, '能力'),
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
    return { raw: '', sections: {} };
  }
}

/** 根据关键词搜索匹配的Agent (使用registry.json索引) */
function searchAgents(keywords) {
  const registry = loadRegistry();
  const matches = [];
  
  for (const [id, agent] of Object.entries(registry)) {
    let matchScore = 0;
    
    for (const keyword of keywords) {
      const kwLower = keyword.toLowerCase();
      
      // 检查名称
      if (agent.name.toLowerCase().includes(kwLower)) {
        matchScore += 10;
      }
      
      // 检查触发关键词 (最重要)
      if (agent.trigger_keywords && agent.trigger_keywords.some((kw) => kw.toLowerCase().includes(kwLower))) {
        matchScore += 8;
      }
      
      // 检查描述
      if (agent.description && agent.description.toLowerCase().includes(kwLower)) {
        matchScore += 5;
      }
      
      // 检查分类
      if (agent.category && agent.category.toLowerCase().includes(kwLower)) {
        matchScore += 3;
      }
    }

    if (matchScore > 0) {
      matches.push({
        keyword: keywords.join(','),
        agent,
        matchScore,
      });
    }
  }

  // 按匹配度排序
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

/** 获取Agent的完整prompt内容 */
function getAgentPromptContent(agent) {
  const filePath = path.join(PROMPTS_DIR, agent.file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`[Agency Registry] Agent文件不存在: ${filePath}`);
    return '';
  }
  
  const parsed = parseAgentFileContent(filePath);
  let prompt = '';
  
  // 注入Identity
  if (parsed.sections.identity) {
    prompt += `## 身份定义\n${parsed.sections.identity}\n\n`;
  }
  
  // 注入Mission
  if (parsed.sections.mission) {
    prompt += `## 核心使命\n${parsed.sections.mission}\n\n`;
  }
  
  // 注入Rules
  if (parsed.sections.rules) {
    prompt += `## 关键规则\n${parsed.sections.rules}\n\n`;
  }
  
  // 注入Deliverables
  if (parsed.sections.deliverables) {
    prompt += `## 交付标准\n${parsed.sections.deliverables}\n\n`;
  }
  
  // 注入Workflow
  if (parsed.sections.workflow) {
    prompt += `## 工作流程\n${parsed.sections.workflow}\n\n`;
  }
  
  return prompt;
}

/** 将Agent专业知识注入到prompt模板 */
function injectAgentKnowledge(basePrompt, agent, options) {
  const opts = Object.assign({
    includeIdentity: true,
    includeRules: true,
    includeDeliverables: true,
    includeWorkflow: true,
  }, options || {});

  const knowledgeHeader = '\n\n[=== Agency Agent 专业知识 ===]\n';
  const knowledgeFooter = '\n[==========================================]\n';

  let enhanced = basePrompt + knowledgeHeader;
  const agentPrompt = getAgentPromptContent(agent);
  
  if (agentPrompt) {
    enhanced += agentPrompt;
  } else {
    // Fallback: 使用registry中的基本信息
    enhanced += `## ${agent.name}\n`;
    enhanced += `${agent.description}\n\n`;
    if (agent.trigger_keywords && agent.trigger_keywords.length > 0) {
      enhanced += `**专业领域**: ${agent.trigger_keywords.join(', ')}\n`;
    }
  }
  
  enhanced += knowledgeFooter;

  return enhanced;
}

/** 根据关键词构建带专业知识的prompt */
function buildEnhancedPrompt(basePrompt, keywords) {
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

/** 获取所有Agent列表 */
function getAllAgents() {
  return loadRegistry();
}

/** 获取指定分类的Agent */
function getAgentsByCategory(category) {
  const registry = loadRegistry();
  return Object.values(registry).filter(a => a.category === category);
}

/** 清除缓存 */
function clearCache() {
  agentsCache = null;
  registryCacheTime = 0;
}

// CLI模式
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--rebuild') {
    clearCache();
    loadRegistry();
    console.log('重建完成!');
  } else if (args[0] === '--search') {
    const keywords = args.slice(1);
    if (keywords.length === 0) {
      console.log('用法: loader.js --search <关键词>');
      process.exit(1);
    }
    const results = searchAgents(keywords);
    console.log(`找到 ${results.length} 个匹配的Agent:`);
    results.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. [${r.agent.category}] ${r.agent.name} (匹配度: ${r.matchScore})`);
      console.log(`   触发词: ${r.agent.trigger_keywords ? r.agent.trigger_keywords.join(', ') : 'N/A'}`);
      console.log(`   描述: ${r.agent.description ? r.agent.description.substring(0, 80) : 'N/A'}...`);
      console.log();
    });
  } else if (args[0] === '--list') {
    const registry = loadRegistry();
    const categories = {};
    
    for (const agent of Object.values(registry)) {
      categories[agent.category] = (categories[agent.category] || 0) + 1;
    }
    
    console.log(`共 ${Object.keys(registry).length} 个Agent:\n`);
    for (const [cat, count] of Object.entries(categories)) {
      console.log(`  ${cat}: ${count}个`);
    }
  } else {
    console.log('用法:');
    console.log('  loader.js --rebuild     重建索引');
    console.log('  loader.js --search <关键词>  搜索Agent');
    console.log('  loader.js --list        列出所有Agent');
  }
}

module.exports = {
  loadRegistry,
  searchAgents,
  parseAgentFileContent,
  getAgentPromptContent,
  injectAgentKnowledge,
  buildEnhancedPrompt,
  getAllAgents,
  getAgentsByCategory,
  clearCache
};