/**
 * result-cache - 任务结果缓存
 * 【纳影球】Shadow Orb
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 缓存配置
const CONFIG = {
  cacheDir: path.join(process.env.APPDATA || process.env.HOME, '.openclaw', 'cache', 'result-cache'),
  ttl: parseInt(process.env.RESULT_CACHE_TTL || '3600'), // 1小时
  maxSize: parseInt(process.env.RESULT_CACHE_MAX || '500'),
  indexFile: 'cache-index.json'
};

// 确保缓存目录存在
function ensureCacheDir() {
  if (!fs.existsSync(CONFIG.cacheDir)) {
    fs.mkdirSync(CONFIG.cacheDir, { recursive: true });
  }
}

// 获取缓存索引
function getIndex() {
  ensureCacheDir();
  const indexPath = path.join(CONFIG.cacheDir, CONFIG.indexFile);
  if (fs.existsSync(indexPath)) {
    try {
      return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {
      return { entries: {}, stats: { hits: 0, misses: 0 } };
    }
  }
  return { entries: {}, stats: { hits: 0, misses: 0 } };
}

// 保存缓存索引
function saveIndex(index) {
  const indexPath = path.join(CONFIG.cacheDir, CONFIG.indexFile);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

// 生成缓存Key
function generateKey(taskDescriptor) {
  const input = JSON.stringify({
    type: taskDescriptor.type,
    content: taskDescriptor.content,
    params: taskDescriptor.params || {},
    userId: taskDescriptor.userId || 'default'
  });
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

// 获取缓存
async function get(taskDescriptor) {
  const index = getIndex();
  const key = generateKey(taskDescriptor);
  
  if (index.entries[key]) {
    const cacheFile = path.join(CONFIG.cacheDir, `${key}.json`);
    
    if (fs.existsSync(cacheFile)) {
      try {
        const entry = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        const age = (Date.now() - entry.timestamp) / 1000;
        
        // 检查TTL
        if (age < CONFIG.ttl) {
          index.stats.hits++;
          saveIndex(index);
          return {
            hit: true,
            cached: entry.result,
            key,
            age: Math.floor(age)
          };
        } else {
          // 过期删除
          delete index.entries[key];
          saveIndex(index);
          fs.unlinkSync(cacheFile);
        }
      } catch (e) {
        console.error('Cache read error:', e);
      }
    }
  }
  
  index.stats.misses++;
  saveIndex(index);
  return { hit: false, key };
}

// 设置缓存
async function set(key, result, taskType = 'unknown', userId = 'default') {
  const index = getIndex();
  
  // 检查是否需要清理
  const entryCount = Object.keys(index.entries).length;
  if (entryCount >= CONFIG.maxSize) {
    await cleanup(index);
  }
  
  const entry = {
    key,
    result,
    timestamp: Date.now(),
    taskType,
    userId
  };
  
  const cacheFile = path.join(CONFIG.cacheDir, `${key}.json`);
  fs.writeFileSync(cacheFile, JSON.stringify(entry, null, 2));
  
  index.entries[key] = {
    taskType,
    userId,
    created: entry.timestamp
  };
  saveIndex(index);
  
  return true;
}

// 清理过期和最旧条目
async function cleanup(index) {
  const now = Date.now();
  const keysToDelete = [];
  
  // 找出过期和最旧的条目
  for (const [key, info] of Object.entries(index.entries)) {
    const age = (now - info.created) / 1000;
    if (age > CONFIG.ttl) {
      keysToDelete.push(key); // 过期
    }
  }
  
  // 如果过期的不够，删除最旧的
  if (keysToDelete.length < CONFIG.maxSize * 0.2) {
    const sorted = Object.entries(index.entries)
      .sort((a, b) => a[1].created - b[1].created);
    
    const toRemove = CONFIG.maxSize * 0.2;
    for (let i = 0; i < toRemove && i < sorted.length; i++) {
      if (!keysToDelete.includes(sorted[i][0])) {
        keysToDelete.push(sorted[i][0]);
      }
    }
  }
  
  // 删除文件
  for (const key of keysToDelete) {
    const cacheFile = path.join(CONFIG.cacheDir, `${key}.json`);
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
    delete index.entries[key];
  }
  
  saveIndex(index);
}

// 清空所有缓存
async function clear() {
  const index = getIndex();
  
  for (const key of Object.keys(index.entries)) {
    const cacheFile = path.join(CONFIG.cacheDir, `${key}.json`);
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  }
  
  saveIndex({ entries: {}, stats: { hits: 0, misses: 0 } });
  return true;
}

// 获取统计
async function stats() {
  const index = getIndex();
  const total = index.stats.hits + index.stats.misses;
  
  let oldestEntry = null;
  if (Object.keys(index.entries).length > 0) {
    oldestEntry = Math.min(...Object.values(index.entries).map(e => e.created));
  }
  
  return {
    size: Object.keys(index.entries).length,
    hits: index.stats.hits,
    misses: index.stats.misses,
    hitRate: total > 0 ? (index.stats.hits / total * 100).toFixed(2) + '%' : '0%',
    oldestEntry
  };
}

// 导出
module.exports = {
  get,
  set,
  clear,
  stats,
  generateKey,
  CONFIG
};
