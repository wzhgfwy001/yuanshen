/**
 * DeerFlow增强版浏览器模拟器
 * 
 * 借鉴DeerFlow的设计：
 * 1. 网页抓取
 * 2. 内容提取
 * 3. JavaScript渲染
 * 4. 表单交互
 */

const { EventEmitter } = require('events');
const https = require('https');
const http = require('http');

// ============== BrowserSession 主类 ==============
class BrowserSession extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timeout: config.timeout || 30000,
      maxRedirects: config.maxRedirects || 5,
      ...config
    };

    this.cookies = new Map();
    this.history = [];
    this.headers = {
      'User-Agent': this.config.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    };
  }

  /**
   * 访问URL
   */
  async fetch(url, options = {}) {
    const { method = 'GET', headers = {}, body = null, followRedirects = true } = options;
    
    this.emit('request', { url, method });
    
    try {
      const response = await this._makeRequest(url, {
        method,
        headers: { ...this.headers, ...headers },
        body,
        redirects: 0
      });
      
      // 处理cookies
      this._updateCookies(response.headers['set-cookie']);
      
      // 记录历史
      this.history.push({
        url: response.url || url,
        status: response.status,
        timestamp: Date.now()
      });
      
      this.emit('response', { url: response.url, status: response.status });
      
      return response;
      
    } catch (error) {
      this.emit('error', { url, error: error.message });
      throw error;
    }
  }

  /**
   * 获取HTML内容
   */
  async getHTML(url) {
    const response = await this.fetch(url);
    return {
      html: response.body,
      url: response.url,
      status: response.status
    };
  }

  /**
   * 提取链接
   */
  extractLinks(html, baseUrl) {
    const links = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      let href = match[1];
      
      // 处理相对URL
      if (href.startsWith('/')) {
        const url = new URL(baseUrl);
        href = url.origin + href;
      } else if (!href.startsWith('http')) {
        href = new URL(href, baseUrl).href;
      }
      
      links.push({
        href,
        text: this._extractLinkText(match[0])
      });
    }
    
    return links;
  }

  /**
   * 提取链接文本
   */
  _extractLinkText(tag) {
    const textRegex = /<a[^>]*>([^<]+)<\/a>/i;
    const match = tag.match(textRegex);
    return match ? match[1].trim() : '';
  }

  /**
   * 提取图片
   */
  extractImages(html) {
    const images = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    return images;
  }

  /**
   * 搜索表单
   */
  findForms(html) {
    const forms = [];
    const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let match;
    
    while ((match = formRegex.exec(html)) !== null) {
      const form = {
        action: this._extractAttribute(match[0], 'action'),
        method: this._extractAttribute(match[0], 'method') || 'GET',
        inputs: this._extractInputs(match[1])
      };
      forms.push(form);
    }
    
    return forms;
  }

  /**
   * 提取输入字段
   */
  _extractInputs(formContent) {
    const inputs = [];
    const inputRegex = /<(input|textarea|select)[^>]*>/gi;
    let match;
    
    while ((match = inputRegex.exec(formContent)) !== null) {
      const tag = match[0];
      inputs.push({
        type: this._extractAttribute(tag, 'type') || 'text',
        name: this._extractAttribute(tag, 'name'),
        value: this._extractAttribute(tag, 'value') || ''
      });
    }
    
    return inputs;
  }

  /**
   * 提取属性
   */
  _extractAttribute(tag, attr) {
    const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
    const match = tag.match(regex);
    return match ? match[1] : null;
  }

  /**
   * 设置Cookie
   */
  setCookie(name, value, options = {}) {
    this.cookies.set(name, {
      value,
      ...options
    });
  }

  /**
   * 获取Cookie字符串
   */
  _getCookieString(url) {
    const cookieStrings = [];
    
    for (const [name, cookie] of this.cookies) {
      cookieStrings.push(`${name}=${cookie.value}`);
    }
    
    return cookieStrings.join('; ');
  }

  /**
   * 更新Cookies
   */
  _updateCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    
    const cookies = Array.isArray(setCookieHeaders) 
      ? setCookieHeaders 
      : [setCookieHeaders];
    
    for (const cookieStr of cookies) {
      const parts = cookieStr.split(';');
      const [nameValue] = parts;
      const [name, value] = nameValue.split('=');
      
      if (name && value) {
        this.cookies.set(name.trim(), {
          value: value.trim()
        });
      }
    }
  }

  /**
   * 发起HTTP请求
   */
  _makeRequest(url, options, redirectContext = { redirects: 0 }) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: {
          ...options.headers,
          'Cookie': this._getCookieString(url)
        }
      };

      const req = client.request(requestOptions, (res) => {
        // 处理重定向
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && redirectContext.redirects < this.config.maxRedirects) {
          const location = res.headers.location;
          if (location) {
            redirectContext.redirects++;
            resolve(this._makeRequest(location, options, redirectContext));
            return;
          }
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            url
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(this.config.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  /**
   * 获取历史
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 清空历史
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * 清空Cookies
   */
  clearCookies() {
    this.cookies.clear();
  }
}

// ============== 导出 ==============
module.exports = {
  BrowserSession
};
