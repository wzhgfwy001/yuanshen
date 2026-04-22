/**
 * category-mapping.json 映射表加载器 v2.0
 * 基于DeerFlow架构优化：
 * 1. 异步化
 * 2. 事件系统
 * 3. 结构化结果
 * 4. 中间件管道
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// ==================== DeerFlow借鉴: 结构化状态 ====================

class MappingResult {
  constructor(mappedCategory, wasMapped, source) {
    this.mappedCategory = mappedCategory;
    this.wasMapped = wasMapped;
    this.source = source;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      mappedCategory: this.mappedCategory,
      wasMapped: this.wasMapped,
      source: this.source,
      timestamp: this.timestamp
    };
  }
}

class LoadResult {
  constructor(success, config = {}) {
    this.success = success;
    this.enabled = config.enabled || false;
    this.reason = config.reason || '';
    this.remapCount = config.remapCount || 0;
    this.newCategories = config.newCategories || 0;
    this.lastLoadTime = config.lastLoadTime || null;
    this.error = config.error || null;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: this.success,
      enabled: this.enabled,
      reason: this.reason,
      remapCount: this.remapCount,
      newCategories: this.newCategories,
      lastLoadTime: this.lastLoadTime,
      error: this.error,
      timestamp: this.timestamp
    };
  }
}

// ==================== DeerFlow借鉴: 事件系统 ====================

class MappingEmitter {
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
        console.error(`[MappingEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new MappingEmitter();

const EVENTS = {
  MAPPING_LOADED: 'mapping_loaded',
  MAPPING_DISABLED: 'mapping_disabled',
  MAPPING_APPLIED: 'mapping_applied',
  MAPPING_ERROR: 'mapping_error'
};

emitter.on(EVENTS.MAPPING_LOADED, (result) => {
  console.log(`[mapping-loader] ✅ 映射表已加载，${result.remapCount}个映射规则`);
});

emitter.on(EVENTS.MAPPING_DISABLED, (result) => {
  console.log(`[mapping-loader] ⚠️ 映射表未启用: ${result.reason}`);
});

emitter.on(EVENTS.MAPPING_APPLIED, (result) => {
  console.log(`[mapping-loader] 🔄 映射应用: ${result.originalCategory} → ${result.mappedCategory}`);
});

// ==================== DeerFlow借鉴: 中间件管道 ====================

class MappingMiddleware {
  beforeMap(category, agentName, context) { return { category, agentName, context }; }
  afterMap(result, context) { return result; }
}

class MappingPipeline {
  constructor() {
    this.middlewares = [];
  }

  use(mw) {
    this.middlewares.push(mw);
    return this;
  }

  execute(category, agentName, context, mapFn) {
    let ctx = { category, agentName, context, errors: [] };

    for (const mw of this.middlewares) {
      try {
        const result = mw.beforeMap(ctx.category, ctx.agentName, ctx.context);
        ctx.category = result.category;
        ctx.agentName = result.agentName;
        ctx.context = result.context;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    let result;
    try {
      result = mapFn(ctx.category, ctx.agentName, ctx.context);
    } catch (e) {
      ctx.errors.push(e.message);
      result = new MappingResult(category, false, 'error');
    }

    for (const mw of this.middlewares) {
      try {
        result = mw.afterMap(result, ctx.context) || result;
      } catch (e) {
        ctx.errors.push(e.message);
      }
    }

    if (ctx.errors.length > 0) {
      result.errors = ctx.errors;
    }

    return result;
  }
}

class NormalizationMiddleware extends MappingMiddleware {
  beforeMap(category, agentName, context) {
    return {
      category: (category || '').trim().toLowerCase(),
      agentName: agentName ? agentName.trim() : null,
      context
    };
  }
}

class LoggingMiddleware extends MappingMiddleware {
  afterMap(result, context) {
    if (result.wasMapped) {
      console.log(`[mapping-loader] 🔄 ${result.source}: ${result.originalCategory || result.mappedCategory} → ${result.mappedCategory}`);
    }
    return result;
  }
}

// ==================== 配置 ====================

const MAPPING_FILE = path.join(__dirname, 'category-mapping.json');

// 内存缓存
let _mappingCache = null;
let _mappingEnabled = false;
let _categoryRemap = {};
let _lastLoadTime = null;

// 管道实例
const pipeline = new MappingPipeline();
pipeline.use(new NormalizationMiddleware());
pipeline.use(new LoggingMiddleware());

// ==================== 异步加载 ====================

async function loadCategoryMapping() {
  try {
    if (!fsSync.existsSync(MAPPING_FILE)) {
      _mappingEnabled = false;
      const result = new LoadResult(false, { reason: 'file_not_found' });
      emitter.emit(EVENTS.MAPPING_DISABLED, result);
      return result;
    }

    const content = await fs.readFile(MAPPING_FILE, 'utf-8');
    const config = JSON.parse(content);

    if (!config._enabled) {
      _mappingEnabled = false;
      _mappingCache = null;
      const result = new LoadResult(false, { reason: 'disabled_in_config' });
      emitter.emit(EVENTS.MAPPING_DISABLED, result);
      return result;
    }

    _mappingEnabled = true;
    _categoryRemap = config.category_remap || {};
    _mappingCache = config;
    _lastLoadTime = new Date().toISOString();

    const result = new LoadResult(true, {
      enabled: true,
      remapCount: Object.keys(_categoryRemap.specialized || {}).length,
      newCategories: Object.keys(config.new_categories || {}).length,
      lastLoadTime: _lastLoadTime
    });

    emitter.emit(EVENTS.MAPPING_LOADED, result);
    return result;

  } catch (error) {
    _mappingEnabled = false;
    _mappingCache = null;
    const result = new LoadResult(false, { reason: 'load_error', error: error.message });
    emitter.emit(EVENTS.MAPPING_ERROR, result);
    return result;
  }
}

/**
 * 获取映射后的分类（同步版本，使用管道）
 */
function getMappedCategory(originalCategory, agentName = null) {
  return pipeline.execute(
    originalCategory,
    agentName,
    {},
    (cat, agent, ctx) => _doMap(cat, agent)
  );
}

function _doMap(originalCategory, agentName) {
  if (!_mappingEnabled) {
    return new MappingResult(originalCategory, false, 'disabled');
  }

  for (const [srcCategory, remapEntries] of Object.entries(_categoryRemap)) {
    if (srcCategory.startsWith('_')) continue;

    if (originalCategory === srcCategory || srcCategory === '*') {
      if (remapEntries && typeof remapEntries === 'object') {
        const entry = remapEntries[agentName];
        if (entry) {
          const mappedTo = typeof entry === 'string' ? entry : entry.target;
          if (mappedTo) {
            const result = new MappingResult(mappedTo, true, 'category-mapping.json');
            result.originalCategory = originalCategory;
            result.mappedFrom = srcCategory;
            result.agentName = agentName;
            emitter.emit(EVENTS.MAPPING_APPLIED, result);
            return result;
          }
        }
      }
    }
  }

  return new MappingResult(originalCategory, false, 'no_mapping');
}

/**
 * 获取映射后的分类（异步版本）
 */
async function getMappedCategoryAsync(originalCategory, agentName = null) {
  // 如果未启用映射，直接返回
  if (!_mappingEnabled) {
    return new MappingResult(originalCategory, false, 'disabled');
  }

  // 遍历映射
  for (const [srcCategory, remapEntries] of Object.entries(_categoryRemap)) {
    if (srcCategory.startsWith('_')) continue;

    if (originalCategory === srcCategory || srcCategory === '*') {
      if (remapEntries && typeof remapEntries === 'object') {
        const entry = remapEntries[agentName];
        if (entry) {
          const mappedTo = typeof entry === 'string' ? entry : entry.target;
          if (mappedTo) {
            const result = new MappingResult(mappedTo, true, 'category-mapping.json');
            result.originalCategory = originalCategory;
            result.mappedFrom = srcCategory;
            result.agentName = agentName;
            return result;
          }
        }
      }
    }
  }

  return new MappingResult(originalCategory, false, 'no_mapping');
}

/**
 * 检查映射是否启用
 */
function isMappingEnabled() {
  return _mappingEnabled;
}

/**
 * 获取缓存状态
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
 */
async function reload() {
  console.log('[mapping-loader] Reloading category-mapping.json...');
  return loadCategoryMapping();
}

// 启动时自动加载（同步）
loadCategoryMapping();

// 导出
module.exports = {
  loadCategoryMapping,
  getMappedCategory,
  getMappedCategoryAsync,
  isMappingEnabled,
  getCacheStatus,
  reload,
  MappingResult,
  LoadResult,
  MappingPipeline,
  emitter,
  EVENTS
};
