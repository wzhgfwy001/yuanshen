/**
 * 融合调度器 - 自动注册更新器
 * 
 * 功能：
 * 1. 扫描brain/agents/*/SKILL.md，自动注册女娲人格
 * 2. 扫描roles/*.md，自动注册Agency模板
 * 3. 增量更新，只注册新增的
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.WORKSPACE_PATH || 'C:/Users/DELL/.openclaw/workspace';
const REGISTRY_PATH = path.join(__dirname, 'fusion-registry.json');

/**
 * 加载注册表
 */
function loadRegistry() {
  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('[AutoUpdater] 注册表加载失败:', e.message);
    return null;
  }
}

/**
 * 保存注册表
 */
function saveRegistry(registry) {
  try {
    registry.updated = new Date().toISOString().split('T')[0];
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[AutoUpdater] 注册表保存失败:', e.message);
    return false;
  }
}

/**
 * 从SKILL.md提取触发词和描述
 */
function extractFromSkillMd(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 提取描述（第一个段落或description字段）
    let description = '';
    const descMatch = content.match(/description:\s*\|?\s*\n([^\n#]+)/);
    if (descMatch) {
      description = descMatch[1].trim();
    }
    
    // 提取触发词（从triggers或对话示例中）
    let triggers = [];
    const triggerMatch = content.match(/triggers:\s*\[([^\]]+)\]/);
    if (triggerMatch) {
      triggers = triggerMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
    }
    
    // 如果没有触发词，尝试从文件名推断
    if (triggers.length === 0) {
      const fileName = path.basename(filePath, '.md');
      triggers = fileName.split(/[-_]/).filter(t => t.length > 1);
    }
    
    return { description, triggers };
  } catch (e) {
    return { description: '', triggers: [] };
  }
}

/**
 * 扫描brain/agents目录，自动注册女娲人格
 */
function scanNuwaPersonas(registry) {
  const agentsDir = path.join(WORKSPACE, 'brain', 'agents');
  
  if (!fs.existsSync(agentsDir)) {
    console.log('[AutoUpdater] brain/agents目录不存在');
    return { added: 0, skipped: 0, errors: 0 };
  }
  
  const stats = { added: 0, skipped: 0, errors: 0 };
  const existingNames = Object.keys(registry.personas || {});
  
  const dirs = fs.readdirSync(agentsDir);
  
  for (const dir of dirs) {
    const skillPath = path.join(agentsDir, dir, 'SKILL.md');
    
    // 检查SKILL.md是否存在
    if (!fs.existsSync(skillPath)) {
      continue;
    }
    
    // 检查是否已注册
    if (existingNames.includes(dir)) {
      // 检查是否需要更新
      const existing = registry.personas[dir];
      const { description, triggers } = extractFromSkillMd(skillPath);
      
      if (existing.triggers && existing.triggers.length > 0 && 
          JSON.stringify(existing.triggers) !== JSON.stringify(triggers)) {
        // 更新触发词
        existing.triggers = triggers;
        existing.autoUpdatedAt = new Date().toISOString();
        stats.skipped++;
        console.log(`[AutoUpdater] 更新女娲人格: ${dir}`);
      } else {
        stats.skipped++;
      }
      continue;
    }
    
    // 提取信息并注册
    const { description, triggers } = extractFromSkillMd(skillPath);
    
    registry.personas[dir] = {
      name: dir,
      path: `brain/agents/${dir}/SKILL.md`,
      type: 'nuwa',
      description: description || `${dir}的人格`,
      triggers: triggers.length > 0 ? triggers : [dir],
      autoRegistered: true,
      registeredAt: new Date().toISOString()
    };
    
    console.log(`[AutoUpdater] 注册女娲人格: ${dir}`);
    stats.added++;
  }
  
  return stats;
}

/**
 * 扫描roles目录，自动注册Agency模板
 */
function scanAgencyRoles(registry) {
  const rolesDir = path.join(WORKSPACE, 'skills', 'dynamic-multi-agent-system', 
                             'core', 'subagent-manager', 'roles');
  
  if (!fs.existsSync(rolesDir)) {
    console.log('[AutoUpdater] roles目录不存在');
    return { added: 0, skipped: 0, errors: 0 };
  }
  
  const stats = { added: 0, skipped: 0, errors: 0 };
  const existingNames = Object.keys(registry.agencyTemplates || {});
  
  const files = fs.readdirSync(rolesDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const roleName = path.basename(file, '.md');
    const skillPath = path.join(rolesDir, file);
    
    // 检查是否已注册
    if (existingNames.includes(roleName)) {
      stats.skipped++;
      continue;
    }
    
    // 提取信息并注册
    const { description, triggers } = extractFromSkillMd(skillPath);
    
    // 推断分类
    let category = 'general';
    const categoryKeywords = {
      'data': ['data', 'analyst', 'science', 'bi'],
      'technical': ['devops', 'security', 'qa', 'architect', 'engineer'],
      'creative': ['design', 'brand', 'content', 'writer', 'ux', 'ui'],
      'operations': ['growth', 'seo', 'social', 'operations'],
      'product': ['product', 'project', 'manager'],
      'professional': ['legal', 'financial', 'compliance']
    };
    
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => roleName.toLowerCase().includes(k))) {
        category = cat;
        break;
      }
    }
    
    registry.agencyTemplates[roleName] = {
      name: roleName,
      path: `skills/dynamic-multi-agent-system/core/subagent-manager/roles/${file}`,
      category: category,
      description: description || `${roleName}角色`,
      triggers: triggers.length > 0 ? triggers : [roleName.replace(/[-_]/g, ' ')],
      autoRegistered: true,
      registeredAt: new Date().toISOString()
    };
    
    console.log(`[AutoUpdater] 注册Agency模板: ${roleName} (${category})`);
    stats.added++;
  }
  
  return stats;
}

/**
 * 完整更新注册表
 */
function fullUpdate() {
  console.log('=== 融合调度器自动更新 ===');
  console.log(`时间: ${new Date().toISOString()}`);
  
  const registry = loadRegistry();
  if (!registry) {
    console.error('[AutoUpdater] 无法加载注册表');
    return false;
  }
  
  // 初始化personas和agencyTemplates
  if (!registry.personas) registry.personas = {};
  if (!registry.agencyTemplates) registry.agencyTemplates = {};
  
  // 扫描并注册
  const nuwaStats = scanNuwaPersonas(registry);
  const agencyStats = scanAgencyRoles(registry);
  
  // 保存
  if (saveRegistry(registry)) {
    console.log('\n=== 更新完成 ===');
    console.log(`女娲人格: +${nuwaStats.added} | ~${nuwaStats.skipped}`);
    console.log(`Agency模板: +${agencyStats.added} | ~${agencyStats.skipped}`);
    console.log(`注册表已保存: ${REGISTRY_PATH}`);
    return true;
  }
  
  return false;
}

/**
 * 增量更新（只检查新增）
 */
function incrementalUpdate() {
  console.log('=== 增量更新 ===');
  
  const registry = loadRegistry();
  if (!registry) return false;
  
  if (!registry.personas) registry.personas = {};
  if (!registry.agencyTemplates) registry.agencyTemplates = {};
  
  const nuwaStats = scanNuwaPersonas(registry);
  const agencyStats = scanAgencyRoles(registry);
  
  if (nuwaStats.added > 0 || agencyStats.added > 0) {
    console.log('\n发现新内容，保存更新...');
    return saveRegistry(registry);
  }
  
  console.log('没有新内容需要注册');
  return true;
}

// 导出
module.exports = {
  loadRegistry,
  saveRegistry,
  scanNuwaPersonas,
  scanAgencyRoles,
  fullUpdate,
  incrementalUpdate
};

// 直接运行时执行更新
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--full')) {
    fullUpdate();
  } else {
    incrementalUpdate();
  }
}
