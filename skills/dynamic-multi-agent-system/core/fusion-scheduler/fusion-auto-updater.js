/**
 * 融合调度器 - 自动注册更新器 v2.0
 * 基于DeerFlow架构优化：
 * 1. 异步化
 * 2. 结构化状态
 * 3. 事件系统
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const WORKSPACE = process.env.WORKSPACE_PATH || 'C:/Users/DELL/.openclaw/workspace';
const REGISTRY_PATH = path.join(__dirname, 'fusion-registry.json');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class UpdateResult {
  constructor(added = 0, skipped = 0, errors = 0) {
    this.added = added;
    this.skipped = skipped;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      added: this.added,
      skipped: this.skipped,
      errors: this.errors,
      timestamp: this.timestamp
    };
  }
}

class ScanResult {
  constructor(type, stats, items = []) {
    this.type = type;
    this.stats = new UpdateResult(stats.added, stats.skipped, stats.errors);
    this.items = items;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      type: this.type,
      stats: this.stats.toJSON(),
      items: this.items,
      timestamp: this.timestamp
    };
  }
}

// ==================== DeerFlow借鉴: 事件系统 ====================

class UpdaterEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[UpdaterEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new UpdaterEmitter();

const EVENTS = {
  PERSONA_ADDED: 'persona_added',
  PERSONA_UPDATED: 'persona_updated',
  AGENCY_ADDED: 'agency_added',
  UPDATE_COMPLETE: 'update_complete'
};

emitter.on(EVENTS.PERSONA_ADDED, (name) => console.log(`[AutoUpdater] ➕ 注册女娲人格: ${name}`));
emitter.on(EVENTS.PERSONA_UPDATED, (name) => console.log(`[AutoUpdater] 🔄 更新女娲人格: ${name}`));
emitter.on(EVENTS.AGENCY_ADDED, (name, category) => console.log(`[AutoUpdater] ➕ 注册Agency模板: ${name} (${category})`));

// ==================== 异步操作 ====================

async function loadRegistryAsync() {
  try {
    const content = await fs.readFile(REGISTRY_PATH, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('[AutoUpdater] 注册表加载失败:', e.message);
    return null;
  }
}

function loadRegistrySync() {
  try {
    const content = fsSync.readFileSync(REGISTRY_PATH, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

async function saveRegistryAsync(registry) {
  try {
    registry.updated = new Date().toISOString().split('T')[0];
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[AutoUpdater] 注册表保存失败:', e.message);
    return false;
  }
}

function saveRegistrySync(registry) {
  try {
    registry.updated = new Date().toISOString().split('T')[0];
    fsSync.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[AutoUpdater] 注册表保存失败:', e.message);
    return false;
  }
}

// ==================== 辅助函数 ====================

function extractFromSkillMd(filePath) {
  try {
    const content = fsSync.readFileSync(filePath, 'utf8');
    
    let description = '';
    const descMatch = content.match(/description:\s*\|?\s*\n([^\n#]+)/);
    if (descMatch) {
      description = descMatch[1].trim();
    }
    
    let triggers = [];
    const triggerMatch = content.match(/triggers:\s*\[([^\]]+)\]/);
    if (triggerMatch) {
      triggers = triggerMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
    }
    
    if (triggers.length === 0) {
      const fileName = path.basename(filePath, '.md');
      triggers = fileName.split(/[-_]/).filter(t => t.length > 1);
    }
    
    return { description, triggers };
  } catch (e) {
    return { description: '', triggers: [] };
  }
}

// ==================== 扫描函数 ====================

async function scanNuwaPersonasAsync(registry) {
  const agentsDir = path.join(WORKSPACE, 'brain', 'agents');
  const stats = { added: 0, skipped: 0, errors: 0 };
  const added = [];
  
  if (!fsSync.existsSync(agentsDir)) {
    console.log('[AutoUpdater] brain/agents目录不存在');
    return new ScanResult('nuwa', stats, added);
  }
  
  const existingNames = Object.keys(registry.personas || {});
  const dirs = fsSync.readdirSync(agentsDir);
  
  for (const dir of dirs) {
    const skillPath = path.join(agentsDir, dir, 'SKILL.md');
    
    if (!fsSync.existsSync(skillPath)) {
      continue;
    }
    
    if (existingNames.includes(dir)) {
      const existing = registry.personas[dir];
      const { description, triggers } = extractFromSkillMd(skillPath);
      
      if (existing.triggers && existing.triggers.length > 0 && 
          JSON.stringify(existing.triggers) !== JSON.stringify(triggers)) {
        existing.triggers = triggers;
        existing.autoUpdatedAt = new Date().toISOString();
        stats.skipped++;
        emitter.emit(EVENTS.PERSONA_UPDATED, dir);
      } else {
        stats.skipped++;
      }
      continue;
    }
    
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
    
    stats.added++;
    added.push(dir);
    emitter.emit(EVENTS.PERSONA_ADDED, dir);
  }
  
  return new ScanResult('nuwa', stats, added);
}

async function scanAgencyRolesAsync(registry) {
  const rolesDir = path.join(WORKSPACE, 'skills', 'dynamic-multi-agent-system', 
                             'core', 'subagent-manager', 'roles');
  const stats = { added: 0, skipped: 0, errors: 0 };
  const added = [];
  
  if (!fsSync.existsSync(rolesDir)) {
    console.log('[AutoUpdater] roles目录不存在');
    return new ScanResult('agency', stats, added);
  }
  
  const existingNames = Object.keys(registry.agencyTemplates || {});
  const files = fsSync.readdirSync(rolesDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const roleName = path.basename(file, '.md');
    const skillPath = path.join(rolesDir, file);
    
    if (existingNames.includes(roleName)) {
      stats.skipped++;
      continue;
    }
    
    const { description, triggers } = extractFromSkillMd(skillPath);
    
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
    
    stats.added++;
    added.push({ name: roleName, category });
    emitter.emit(EVENTS.AGENCY_ADDED, roleName, category);
  }
  
  return new ScanResult('agency', stats, added);
}

// ==================== 主函数 ====================

async function fullUpdateAsync() {
  console.log('=== 融合调度器自动更新 ===');
  console.log(`时间: ${new Date().toISOString()}`);
  
  const registry = await loadRegistryAsync();
  if (!registry) {
    console.error('[AutoUpdater] 无法加载注册表');
    return { success: false, error: 'registry_load_failed' };
  }
  
  if (!registry.personas) registry.personas = {};
  if (!registry.agencyTemplates) registry.agencyTemplates = {};
  
  const nuwaResult = await scanNuwaPersonasAsync(registry);
  const agencyResult = await scanAgencyRolesAsync(registry);
  
  if (await saveRegistryAsync(registry)) {
    const summary = {
      success: true,
      nuwa: nuwaResult.toJSON(),
      agency: agencyResult.toJSON(),
      timestamp: new Date().toISOString()
    };
    
    console.log('\n=== 更新完成 ===');
    console.log(`女娲人格: +${nuwaResult.stats.added} | ~${nuwaResult.stats.skipped}`);
    console.log(`Agency模板: +${agencyResult.stats.added} | ~${agencyResult.stats.skipped}`);
    console.log(`注册表已保存: ${REGISTRY_PATH}`);
    
    emitter.emit(EVENTS.UPDATE_COMPLETE, summary);
    return summary;
  }
  
  return { success: false, error: 'registry_save_failed' };
}

async function incrementalUpdateAsync() {
  console.log('=== 增量更新 ===');
  
  const registry = await loadRegistryAsync();
  if (!registry) return { success: false };
  
  if (!registry.personas) registry.personas = {};
  if (!registry.agencyTemplates) registry.agencyTemplates = {};
  
  const nuwaResult = await scanNuwaPersonasAsync(registry);
  const agencyResult = await scanAgencyRolesAsync(registry);
  
  if (nuwaResult.stats.added > 0 || agencyResult.stats.added > 0) {
    console.log('\n发现新内容，保存更新...');
    const saved = await saveRegistryAsync(registry);
    if (saved) {
      emitter.emit(EVENTS.UPDATE_COMPLETE, {
        nuwa: nuwaResult.toJSON(),
        agency: agencyResult.toJSON()
      });
    }
    return { success: saved, nuwa: nuwaResult, agency: agencyResult };
  }
  
  console.log('没有新内容需要注册');
  return { success: true, nuwa: nuwaResult, agency: agencyResult };
}

// ==================== 导出 ====================

module.exports = {
  loadRegistry: loadRegistrySync,
  loadRegistryAsync,
  saveRegistry: saveRegistrySync,
  saveRegistryAsync,
  scanNuwaPersonas: scanNuwaPersonasAsync,
  scanAgencyRoles: scanAgencyRolesAsync,
  fullUpdate: fullUpdateAsync,
  incrementalUpdate: incrementalUpdateAsync,
  UpdateResult,
  ScanResult,
  emitter,
  EVENTS
};

// 直接运行时执行更新
if (require.main === module) {
  const args = process.argv.slice(2);
  
  (async () => {
    if (args.includes('--full')) {
      await fullUpdateAsync();
    } else {
      await incrementalUpdateAsync();
    }
  })();
}
