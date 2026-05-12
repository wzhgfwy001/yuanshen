/**
 * Security Vault - 凭证代理实现
 * AI 永远不直接接触凭证，通过代理访问
 */

const fs = require('fs');
const path = require('path');

const VAULT_FILE = path.join(__dirname, 'vault.json');
const ACCESS_LOG = path.join(__dirname, 'vault-access-log.md');

/**
 * Vault 配置
 */
const VAULT_CONFIG = {
  // 允许的服务
  allowedServices: [
    'github',
    'minimax',
    'openai',
    'feishu',
    'database'
  ],
  // 加密密钥（生产环境应使用环境变量）
  encryptionKey: process.env.VAULT_KEY || 'dev-key-change-in-production'
};

/**
 * 凭证记录
 */
class Credential {
  constructor(service, type, token, config = {}) {
    this.id = `cred-${Date.now()}`;
    this.service = service;
    this.type = type;  // api_key, token, password
    this.encryptedToken = this.encrypt(token);
    this.lastUsed = null;
    this.useCount = 0;
    this.created = new Date().toISOString();
    this.config = config;  // 额外配置
  }
  
  encrypt(token) {
    // 简化版（生产应使用 crypto 模块 AES-256）
    return Buffer.from(token).toString('base64');
  }
  
  decrypt() {
    return Buffer.from(this.encrypted, 'base64').toString('utf8');
  }
}

/**
 * Vault 主类
 */
class SecurityVault {
  constructor() {
    this.credentials = new Map();
    this.accessLog = [];
    this.load();
  }
  
  /**
   * 添加凭证
   */
  add(service, type, token, config = {}) {
    if (!VAULT_CONFIG.allowedServices.includes(service)) {
      throw new Error(`Service not allowed: ${service}`);
    }
    
    const cred = new Credential(service, type, token, config);
    const key = `${service}`;
    this.credentials.set(key, cred);
    this.save();
    this.log('ADD', service, 'Credential added');
    return cred.id;
  }
  
  /**
   * 获取凭证（通过代理）
   * AI 永远拿不到原始 token，只能通过这个方法
   */
  async get(service) {
    const cred = this.credentials.get(service);
    if (!cred) {
      throw new Error(`Credential not found: ${service}`);
    }
    
    // 记录访问
    this.log('GET', service, 'Token accessed via proxy');
    cred.lastUsed = new Date().toISOString();
    cred.useCount++;
    this.save();
    
    // AI 只能拿到代理句柄，不能直接拿到 token
    return {
      service,
      type: cred.type,
      // AI 需要通过 proxy() 方法使用
      _proxy: true
    };
  }
  
  /**
   * 代理执行（AI 通过这个方法使用凭证）
   */
  async proxy(service, action, params) {
    const cred = this.credentials.get(service);
    if (!cred) {
      throw new Error(`Service not configured: ${service}`);
    }
    
    this.log('PROXY', service, `Action: ${action}`);
    
    // AI 只能执行白名单操作
    const allowed = ['api_call', 'git_push', 'send_message'];
    if (!allowed.includes(action)) {
      throw new Error(`Action not allowed: ${action}`);
    }
    
    // TODO: 实际代理逻辑
    return { success: true, action, service };
  }
  
  /**
   * 列出可用服务（不暴露 token）
   */
  list() {
    const services = [];
    for (const [name, cred] of this.credentials) {
      services.push({
        service: name,
        type: cred.type,
        lastUsed: cred.lastUsed,
        useCount: cred.useCount
      });
    }
    return services;
  }
  
  /**
   * 删除凭证
   */
  remove(service) {
    if (this.credentials.has(service)) {
      this.credentials.delete(service);
      this.save();
      this.log('REMOVE', service, 'Credential removed');
      return true;
    }
    return false;
  }
  
  /**
   * 访问日志
   */
  log(action, service, detail) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      service,
      detail,
      sessionId: process.env.SESSION_ID || 'main'
    };
    this.accessLog.push(entry);
    
    // 写入日志文件
    const line = `\n| ${entry.timestamp} | ${entry.action} | ${entry.service} | ${entry.detail} |`;
    try {
      fs.appendFileSync(ACCESS_LOG, line);
    } catch (e) {
      console.error('[Vault] Log write failed:', e.message);
    }
  }
  
  save() {
    const data = {};
    for (const [k, v] of this.credentials) {
      data[k] = {
        type: v.type,
        encryptedToken: v.encryptedToken,
        lastUsed: v.lastUsed,
        useCount: v.useCount
      };
    }
    fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2));
  }
  
  load() {
    try {
      if (fs.existsSync(VAULT_FILE)) {
        const data = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
        for (const [service, cred] of Object.entries(data)) {
          const c = new Credential(service, cred.type, '', cred);
          c.encryptedToken = cred.encryptedToken;
          c.lastUsed = cred.lastUsed;
          c.useCount = cred.useCount || 0;
          this.credentials.set(service, c);
        }
      }
    } catch (e) {
      console.log('[Vault] No previous vault found');
    }
  }
}

const vault = new SecurityVault();

module.exports = { vault, SecurityVault };

// 使用示例
if (require.main === module) {
  // 添加凭证
  vault.add('minimax', 'api_key', 'sk-xxx');
  vault.add('github', 'token', 'ghp_xxx');
  
  // 列出服务
  console.log('Services:', vault.list());
  
  // AI 获取凭证（只能通过代理
  vault.get('minimax').then(r => console.log('Proxy handle:', r));
}