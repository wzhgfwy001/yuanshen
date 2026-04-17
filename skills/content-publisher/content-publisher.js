// 【传递图腾】Totemic Transmission - 内容发布

/**
 * 内容发布器技能
 * 管理和发布内容到各平台
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');
const QUEUE_PATH = path.join(__dirname, 'queue.json');

// 平台配置
const PLATFORMS = {
  xiaohongshu: {
    name: '小红书',
    maxLength: 1000,
    supportImages: true,
    supportVideo: false
  },
  wechat: {
    name: '微信公众号',
    maxLength: 20000,
    supportImages: true,
    supportVideo: true
  },
  weibo: {
    name: '微博',
    maxLength: 2000,
    supportImages: true,
    supportVideo: true
  },
  zhihu: {
    name: '知乎',
    maxLength: 10000,
    supportImages: true,
    supportVideo: true
  }
};

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({
      published_count: 0,
      failed_count: 0,
      platform_stats: {}
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 加载队列
function loadQueue() {
  if (!fs.existsSync(QUEUE_PATH)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

// 添加到发布队列
function addToQueue(content, platform, options = {}) {
  const queue = loadQueue();
  
  const item = {
    id: `publish_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    content,
    platform,
    title: options.title || '',
    tags: options.tags || [],
    images: options.images || [],
    status: 'pending',
    created: new Date().toISOString(),
    scheduledTime: options.scheduledTime || null
  };
  
  queue.push(item);
  saveQueue(queue);
  
  return {
    success: true,
    item,
    queuePosition: queue.length
  };
}

// 从队列获取待发布内容
function getPendingItems(platform = null) {
  const queue = loadQueue();
  return queue.filter(item => {
    if (item.status !== 'pending') return false;
    if (platform && item.platform !== platform) return false;
    if (item.scheduledTime && new Date(item.scheduledTime) > new Date()) return false;
    return true;
  });
}

// 发布内容（模拟）
async function publish(item, credentials = {}) {
  // 检查凭证
  if (!credentials.apiKey && !credentials模拟) {
    return {
      success: false,
      error: '缺少API凭证'
    };
  }
  
  // 验证平台
  const platform = PLATFORMS[item.platform];
  if (!platform) {
    return {
      success: false,
      error: `不支持的平台: ${item.platform}`
    };
  }
  
  // 验证长度
  if (item.content.length > platform.maxLength) {
    return {
      success: false,
      error: `内容超过平台限制(${platform.maxLength}字符)`
    };
  }
  
  // 模拟发布成功
  const state = initState();
  state.published_count++;
  state.platform_stats[item.platform] = (state.platform_stats[item.platform] || 0) + 1;
  saveState(state);
  
  // 更新队列项状态
  const queue = loadQueue();
  const queueItem = queue.find(q => q.id === item.id);
  if (queueItem) {
    queueItem.status = 'published';
    queueItem.publishedAt = new Date().toISOString();
    queueItem.publishUrl = `https://example.com/publish/${item.id}`;
    saveQueue(queue);
  }
  
  return {
    success: true,
    platform: platform.name,
    publishUrl: queueItem?.publishUrl,
    publishedAt: queueItem?.publishedAt
  };
}

// 批量发布
async function publishBatch(credentials = {}) {
  const pending = getPendingItems();
  const results = [];
  
  for (const item of pending) {
    const result = await publish(item, credentials);
    results.push({
      itemId: item.id,
      ...result
    });
  }
  
  return {
    total: pending.length,
    results
  };
}

// 获取发布统计
function getStats() {
  const state = initState();
  const queue = loadQueue();
  
  return {
    ...state,
    queueSize: queue.length,
    pending: queue.filter(q => q.status === 'pending').length,
    published: queue.filter(q => q.status === 'published').length
  };
}

// 获取平台列表
function getPlatforms() {
  return Object.entries(PLATFORMS).map(([key, value]) => ({
    id: key,
    ...value
  }));
}

// 导出
module.exports = {
  addToQueue,
  getPendingItems,
  publish,
  publishBatch,
  getStats,
  getPlatforms,
  PLATFORMS
};
