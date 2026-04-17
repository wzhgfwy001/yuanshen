/**
 * Metadata Registry - 元数据层
 * 
 * 核心功能：从 SKILL.md frontmatter 读取配置，同步到执行层
 * 解决 SKILL.md 文档与执行层配置不同步的问题
 */

const fs = require('fs');
const path = require('path');

// 导入新模块
const SyncWatcher = require('./sync-watcher');
const ConfigPatcher = require('./config-patcher');
const AutoSyncDaemon = require('./auto-sync-daemon');

// 默认路径配置
const DEFAULT_PATHS = {
  SKILLS_DIR: path.join(__dirname, '../../skills'),
  CORE_DIR: path.join(__dirname, '../..'),
  ALT_PATHS: [
    path.join(__dirname, '../../github-yangshen/core'),
    path.join(__dirname, '../../skills/dynamic-multi-agent-system/core')
  ],
  CACHE_DIR: path.join(__dirname, '.cache')
};

// 元数据缓存
let metadataCache = new Map();
let lastSyncTime = null;

// 同步相关组件
let syncWatcher = null;
let configPatcher = null;
let autoSyncDaemon = null;
let autoSyncEnabled = false;

/**
 * 获取 SyncWatcher 实例
 */
function _getSyncWatcher() {
  if (!syncWatcher) {
    syncWatcher = new SyncWatcher();
  }
  return syncWatcher;
}

/**
 * 获取 AutoSyncDaemon 实例
 */
function _getAutoSyncDaemon() {
  if (!autoSyncDaemon) {
    autoSyncDaemon = new AutoSyncDaemon();
  }
  return autoSyncDaemon;
}

/**
 * 获取 ConfigPatcher 实例
 */
function _getConfigPatcher() {
  if (!configPatcher) {
    configPatcher = new ConfigPatcher();
  }
  return configPatcher;
}

/**
 * 解析 SKILL.md frontmatter
 * @param {string} filePath - SKILL.md 文件路径
 * @returns {Object} 解析后的 frontmatter + 内容
 */
function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  
  if (!match) {
    return { metadata: {}, rawContent: content };
  }
  
  const yamlStr = match[1];
  let metadata = {};
  
  // 简单的 YAML 解析（处理 metadata 下的嵌套结构）
  try {
    // 提取 metadata.openclaw 部分
    const openclawMatch = yamlStr.match(/metadata:\s*\n\s*\{?\s*"?openclaw"?:\s*\{([^}]*)\}/);
    if (openclawMatch) {
      metadata.openclaw = parseOpenclawBlock(openclawMatch[1]);
    }
    
    // 提取其他顶层字段
    const nameMatch = yamlStr.match(/^name:\s*"?([^"\n]+)"?/m);
    const versionMatch = yamlStr.match(/^version:\s*"?([^"\n]+)"?/m);
    const descMatch = yamlStr.match(/^description:\s*"?([^"\n]+)"?/m);
    
    if (nameMatch) metadata.name = nameMatch[1].trim();
    if (versionMatch) metadata.version = versionMatch[1].trim();
    if (descMatch) metadata.description = descMatch[1].trim();
    
  } catch (e) {
    console.warn(`[metadata-registry] 解析 ${filePath} 时出错:`, e.message);
  }
  
  return { metadata, rawContent: content };
}

/**
 * 解析 openclaw 块（处理 { key: value, ... } 格式）
 */
function parseOpenclawBlock(blockStr) {
  const result = {};
  const lines = blockStr.split(/,\s*/);
  
  for (const line of lines) {
    const [key, value] = line.split(/:\s*/).map(s => s.trim().replace(/[,{}"]/g, ''));
    if (key && value) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * 加载单个 Skill 的元数据
 * @param {string} skillName - Skill 名称
 * @param {Object} options - 配置选项
 * @returns {Object} Skill 元数据配置
 */
function loadMetadata(skillName, options = {}) {
  const baseDirs = [DEFAULT_PATHS.SKILLS_DIR, DEFAULT_PATHS.CORE_DIR, ...DEFAULT_PATHS.ALT_PATHS];
  
  // 检查缓存
  const cacheKey = skillName;
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
  }
  
  // 搜索所有可能的路径
  for (const baseDir of baseDirs) {
    const skillPath = path.join(baseDir, skillName, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      return loadMetadataFromPath(skillName, skillPath, cacheKey);
    }
  }
  
  return null;
}

/**
 * 从指定路径加载元数据
 */
function loadMetadataFromPath(skillName, filePath, cacheKey) {
  const { metadata, rawContent } = parseFrontmatter(filePath);
  
  const fullMetadata = {
    name: skillName,
    version: metadata.version || '0.0.0',
    description: metadata.description || '',
    filePath: filePath,
    lastModified: fs.statSync(filePath).mtime.toISOString(),
    openclaw: metadata.openclaw || {},
    // 扩展执行层需要的字段
    executionConfig: metadata.openclaw?.executionConfig || getDefaultExecutionConfig(skillName),
    category: metadata.openclaw?.category || 'utility',
    capabilities: metadata.openclaw?.capabilities || [],
    dependencies: metadata.openclaw?.dependencies || [],
    keywords: metadata.openclaw?.keywords || [],
    priority: metadata.openclaw?.priority || 50,
    hidden: metadata.openclaw?.hidden || false
  };
  
  metadataCache.set(cacheKey, fullMetadata);
  return fullMetadata;
}

/**
 * 获取默认执行配置
 */
function getDefaultExecutionConfig(skillName) {
  const defaults = {
    timeout: 120000,
    maxRetries: 3,
    preferredAgent: 'generalist',
    temperature: 0.7
  };
  
  // 根据 skill 类型调整默认配置
  if (skillName.includes('code')) {
    defaults.preferredAgent = 'coder';
    defaults.temperature = 0.3;
  } else if (skillName.includes('creative') || skillName.includes('writing')) {
    defaults.preferredAgent = 'creative';
    defaults.temperature = 0.9;
  } else if (skillName.includes('analysis')) {
    defaults.preferredAgent = 'analyst';
    defaults.temperature = 0.5;
  }
  
  return defaults;
}

/**
 * 同步所有 Skill 的配置
 * @param {Object} options - 配置选项
 * @returns {Object} 同步结果统计
 */
function syncAll(options = {}) {
  const baseDir = options.baseDir || DEFAULT_PATHS.SKILLS_DIR;
  const results = {
    synced: [],
    failed: [],
    timestamp: new Date().toISOString()
  };
  
  // 清空缓存
  metadataCache.clear();
  
  try {
    // 获取所有 skill 目录
    if (!fs.existsSync(baseDir)) {
      console.warn(`[metadata-registry] 目录不存在: ${baseDir}`);
      return results;
    }
    
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(baseDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          try {
            const metadata = loadMetadata(entry.name, { baseDir });
            if (metadata) {
              results.synced.push({
                name: entry.name,
                version: metadata.version,
                category: metadata.category,
                path: skillPath
              });
            }
          } catch (e) {
            results.failed.push({
              name: entry.name,
              error: e.message
            });
          }
        }
      }
    }
    
    lastSyncTime = new Date().toISOString();
    
  } catch (e) {
    console.error('[metadata-registry] syncAll 失败:', e);
  }
  
  return results;
}

/**
 * 获取特定配置项
 * @param {string} skillName - Skill 名称
 * @param {string} key - 配置键 (支持点号路径如 openclaw.category)
 * @param {*} defaultValue - 默认值
 * @returns {*} 配置值
 */
function getSkillConfig(skillName, key, defaultValue = undefined) {
  const metadata = loadMetadata(skillName);
  
  if (!metadata) {
    return defaultValue;
  }
  
  // 支持点号路径
  if (key.includes('.')) {
    const keys = key.split('.');
    let value = metadata;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
  
  return metadata[key] ?? defaultValue;
}

/**
 * 获取完整配置包（用于传递给子Agent）
 * @param {string} skillName - Skill 名称
 * @returns {Object} 完整配置包
 */
function getFullConfigPackage(skillName) {
  const metadata = loadMetadata(skillName);
  
  if (!metadata) {
    return null;
  }
  
  return {
    // 基础信息
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    
    // 执行层配置
    category: metadata.category,
    capabilities: metadata.capabilities,
    executionConfig: metadata.executionConfig,
    dependencies: metadata.dependencies,
    
    // 路由配置
    keywords: metadata.keywords,
    priority: metadata.priority,
    hidden: metadata.hidden,
    
    // 文件信息
    filePath: metadata.filePath,
    lastModified: metadata.lastModified,
    
    // 完整原始配置
    _raw: metadata.openclaw
  };
}

/**
 * 获取所有已加载的 Skill 元数据列表
 * @returns {Array} 所有 Skill 元数据
 */
function getAllMetadata() {
  const results = [];
  
  for (const [cacheKey, metadata] of metadataCache.entries()) {
    results.push(metadata);
  }
  
  return results;
}

/**
 * 清除缓存（强制重新加载）
 */
function clearCache() {
  metadataCache.clear();
  lastSyncTime = null;
}

/**
 * 获取同步状态
 */
function getSyncStatus() {
  return {
    cachedCount: metadataCache.size,
    lastSyncTime,
    cacheKeys: Array.from(metadataCache.keys())
  };
}

// ========== 自动同步控制 ==========

/**
 * 启用自动同步
 * @param {Object} options - 配置选项
 * @param {number} options.intervalMs - 检查间隔（默认 30000ms）
 * @param {boolean} options.useWatcher - 使用文件监听模式（默认 false，使用轮询）
 */
function enableAutoSync(options = {}) {
  if (autoSyncEnabled) {
    console.log('[metadata-registry] 自动同步已启用');
    return { success: true, mode: autoSyncEnabled };
  }

  const useWatcher = options.useWatcher || false;

  if (useWatcher) {
    // 文件监听模式
    const watcher = _getSyncWatcher();
    watcher.onChange((event) => {
      console.log(`[metadata-registry] 检测到变化: ${event.skillName}`);
      clearCache();
    });
    watcher.start();
    autoSyncEnabled = 'watcher';
    console.log('[metadata-registry] 已启用文件监听模式自动同步');
  } else {
    // 后台守护进程模式（轮询）
    const daemon = _getAutoSyncDaemon();
    daemon.start();
    autoSyncEnabled = 'daemon';
    console.log('[metadata-registry] 已启用后台守护进程模式自动同步');
  }

  return { success: true, mode: autoSyncEnabled };
}

/**
 * 禁用自动同步
 */
function disableAutoSync() {
  if (!autoSyncEnabled) {
    console.log('[metadata-registry] 自动同步未启用');
    return { success: true };
  }

  if (syncWatcher) {
    syncWatcher.stop();
  }
  if (autoSyncDaemon) {
    autoSyncDaemon.stop();
  }

  autoSyncEnabled = false;
  console.log('[metadata-registry] 已禁用自动同步');

  return { success: true };
}

/**
 * 获取自动同步状态
 */
function getAutoSyncStatus() {
  return {
    enabled: autoSyncEnabled,
    watcher: syncWatcher ? syncWatcher.getStatus() : null,
    daemon: autoSyncDaemon ? autoSyncDaemon.getStatus() : null
  };
}

/**
 * 手动触发全量同步（使用 SyncWatcher）
 */
async function triggerFullSync() {
  const watcher = _getSyncWatcher();
  return await watcher.syncAll();
}

// ========== 配置补丁 ==========

/**
 * 应用配置补丁
 * @param {string} skillName - Skill 名称
 * @param {Object} frontmatter - 解析后的 frontmatter
 * @returns {Object} 打补丁后的配置
 */
function applyPatch(skillName, frontmatter) {
  const patcher = _getConfigPatcher();
  return patcher.patch(frontmatter, skillName);
}

// ========== 导出 ==========

module.exports = {
  // 核心功能
  loadMetadata,
  syncAll,
  getSkillConfig,
  getFullConfigPackage,
  
  // 辅助功能
  getAllMetadata,
  clearCache,
  getSyncStatus,
  
  // 路径常量
  DEFAULT_PATHS,
  
  // 同步控制
  enableAutoSync,
  disableAutoSync,
  getAutoSyncStatus,
  triggerFullSync,
  
  // 配置补丁
  applyPatch
};