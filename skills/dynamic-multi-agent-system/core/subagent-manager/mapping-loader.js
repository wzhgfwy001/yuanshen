/**
 * category-mapping.json 映射表加载器
 * 
 * 功能：
 * - 启动时自动加载 category-mapping.json
 * - 提供 getMappedCategory() 获取映射后的分类
 * - 缓存映射表避免重复读取
 */

const fs = require('fs');
const path = require('path');

// 缓存
let _mappingCache = null;
let _mappingEnabled = false;
let _categoryRemap = {};
let _lastLoadTime = null;

// 映射表文件路径
const MAPPING_FILE = path.join(__dirname, 'category-mapping.json');

/**
 * 加载映射表（启动时自动调用）
 * @returns {Object} 映射配置
 */
function loadCategoryMapping() {
  try {
    if (!fs.existsSync(MAPPING_FILE)) {
      console.log('[mapping-loader] category-mapping.json not found, mapping disabled');
      _mappingEnabled = false;
      return { enabled: false, reason: 'file_not_found' };
    }

    const content = fs.readFileSync(MAPPING_FILE, 'utf-8');
    const config = JSON.parse(content);

    // 检查是否启用
    if (!config._enabled) {
      console.log('[mapping-loader] category-mapping.json exists but _enabled=false');
      _mappingEnabled = false;
      _mappingCache = null;
      return { enabled: false, reason: 'disabled_in_config' };
    }

    // 缓存映射数据
    _mappingEnabled = true;
    _categoryRemap = config.category_remap || {};
    _mappingCache = config;
    _lastLoadTime = new Date().toISOString();

    console.log(`[mapping-loader] Loaded category-mapping.json at ${_lastLoadTime}`);
    console.log(`[mapping-loader] Remap entries: ${Object.keys(_categoryRemap.specialized || {}).length}`);

    return {
      enabled: true,
      remapCount: Object.keys(_categoryRemap.specialized || {}).length,
      newCategories: Object.keys(config.new_categories || {}).length,
      lastLoadTime: _lastLoadTime
    };

  } catch (error) {
    console.error('[mapping-loader] Failed to load category-mapping.json:', error.message);
    _mappingEnabled = false;
    _mappingCache = null;
    return { enabled: false, reason: 'load_error', error: error.message };
  }
}

/**
 * 获取映射后的分类
 * @param {string} originalCategory - 原始分类
 * @param {string} agentName - Agent名称（可选，用于精确匹配）
 * @returns {Object} { mappedCategory, wasMapped, source }
 */
function getMappedCategory(originalCategory, agentName = null) {
  // 如果未启用映射，直接返回原分类
  if (!_mappingEnabled) {
    return {
      mappedCategory: originalCategory,
      wasMapped: false,
      source: 'registry'
    };
  }

  // specialized 分类需要检查映射
  if (originalCategory === 'specialized' && agentName) {
    const remap = _categoryRemap.specialized;
    if (remap && remap[agentName]) {
      const mappedTo = remap[agentName];
      console.log(`[mapping-loader] Mapped: ${agentName} → ${mappedTo}`);
      return {
        mappedCategory: mappedTo,
        wasMapped: true,
        source: 'category-mapping.json',
        originalCategory: 'specialized',
        agentName: agentName
      };
    }
  }

  // 非specialized或无映射，返回原分类
  return {
    mappedCategory: originalCategory,
    wasMapped: false,
    source: _mappingEnabled ? 'category-mapping.json' : 'registry'
  };
}

/**
 * 检查映射是否启用
 * @returns {boolean}
 */
function isMappingEnabled() {
  return _mappingEnabled;
}

/**
 * 获取缓存状态
 * @returns {Object}
 */
function getCacheStatus() {
  return {
    enabled: _mappingEnabled,
    cached: _mappingCache !== null,
    lastLoadTime: _lastLoadTime,
    remapEntries: Object.keys(_categoryRemap.specialized || {}).length
  };
}

/**
 * 重新加载映射表
 * @returns {Object} 加载结果
 */
function reload() {
  console.log('[mapping-loader] Reloading category-mapping.json...');
  return loadCategoryMapping();
}

// 启动时自动加载
loadCategoryMapping();

// 导出
module.exports = {
  loadCategoryMapping,
  getMappedCategory,
  isMappingEnabled,
  getCacheStatus,
  reload
};
