// 【搜索宝物】Find Treasure - 内容采集

/**
 * 内容收集器技能
 * 自动收集和整理内容
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ 
      collected_count: 0,
      total_size: 0,
      last_collect_time: null
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// 简单HTTP GET
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            success: true,
            status: res.statusCode,
            content: data,
            headers: res.headers
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 提取纯文本（简单HTML解析）
function extractText(html) {
  if (!html) return '';
  
  // 移除script和style标签
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // 移除所有HTML标签
  text = text.replace(/<[^>]+>/g, '\n');
  
  // 解码HTML实体
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  
  // 清理多余空白
  text = text.replace(/\n\s*\n/g, '\n\n').trim();
  
  return text;
}

// 提取链接
function extractLinks(html, baseUrl) {
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const links = [];
  let match;
  
  while ((match = linkPattern.exec(html)) !== null) {
    let href = match[1];
    
    // 相对URL转绝对URL
    if (href.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      href = urlObj.origin + href;
    }
    
    links.push({
      url: href,
      text: match[2].trim()
    });
  }
  
  return links;
}

// 提取图片
function extractImages(html) {
  const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images = [];
  let match;
  
  while ((match = imgPattern.exec(html)) !== null) {
    images.push(match[1]);
  }
  
  return images;
}

// 收集网页内容
async function collect(url, options = {}) {
  const state = initState();
  
  const result = {
    url,
    success: false,
    timestamp: new Date().toISOString()
  };
  
  try {
    const response = await httpGet(url);
    
    if (response.status !== 200) {
      result.error = `HTTP ${response.status}`;
      return result;
    }
    
    const content = response.content;
    
    // 提取内容
    result.content = options.extractText !== false 
      ? extractText(content).substring(0, options.maxChars || 10000)
      : content.substring(0, options.maxChars || 10000);
    
    result.links = options.extractLinks !== false 
      ? extractLinks(content, url).slice(0, 50)
      : [];
    
    result.images = options.extractImages !== false
      ? extractImages(content).slice(0, 20)
      : [];
    
    result.wordCount = result.content.split(/\s+/).length;
    result.success = true;
    
    // 更新状态
    state.collected_count++;
    state.total_size += content.length;
    state.last_collect_time = Date.now();
    saveState(state);
    
  } catch (e) {
    result.error = e.message;
  }
  
  return result;
}

// 批量收集
async function collectBatch(urls, options = {}) {
  const results = [];
  const concurrency = options.concurrency || 3;
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(url => collect(url, options)));
    results.push(...batchResults);
    
    // 添加延迟避免限流
    if (i + concurrency < urls.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  return results;
}

// 导出
module.exports = {
  collect,
  collectBatch,
  extractText,
  extractLinks,
  extractImages,
  getStats: () => initState()
};
