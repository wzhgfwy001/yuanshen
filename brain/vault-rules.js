/**
 * brain/vault-rules.js - 凭证安全规则
 * 
 * 凭证存储、访问、验证的安全规则集
 * 集成到 Anthropic Hooks 系统
 * 
 * 最后更新: 2026-05-12
 */

'use strict';

// ============================================================
// 1. 危险命令黑名单
// ============================================================
const DANGEROUS_COMMANDS = [
  // 递归删除
  { pattern: /^\s*rm\s+-rf\s+\//, reason: '递归删除根目录' },
  { pattern: /^\s*rm\s+-rf\s+\*\s*$/, reason: '递归删除当前目录' },
  { pattern: /^\s*del\s+\/s\s+\/q\s+/, reason: 'Windows 递归删除' },
  { pattern: /^\s*format\s+/, reason: '格式化命令' },
  
  // 远程代码下载执行
  { pattern: /curl\s+\|\s*bash/, reason: '远程脚本直接执行' },
  { pattern: /wget\s+\|\s*bash/, reason: '远程脚本直接执行' },
  { pattern: /powershell\s+-enc/, reason: 'PowerShell 编码命令' },
  
  // 权限提升
  { pattern: /^\s*sudo\s+/, reason: '权限提升' },
  { pattern: /^\s*chmod\s+777/, reason: '777权限开放' },
  
  // 危险操作
  { pattern: /^\s*dd\s+/, reason: '直接磁盘操作' },
  { pattern: /^\s*mkfs/, reason: '创建文件系统' },
  { pattern: /^\s*mke2fs/, reason: '创建文件系统' },
];

// ============================================================
// 2. 凭证访问规则
// ============================================================
const VAULT_RULES = {
  // 凭证类型映射
  credentialTypes: {
    'api_key': { sensitivity: 'high', storage: 'encrypted' },
    'password': { sensitivity: 'high', storage: 'encrypted' },
    'token': { sensitivity: 'high', storage: 'memory-only' },
    'secret': { sensitivity: 'high', storage: 'encrypted' },
    'private_key': { sensitivity: 'critical', storage: 'encrypted' },
  },

  // 访问日志要求
  logAccess: true,

  // 访问超时（毫秒）
  accessTimeout: 30000,

  // 最大重试次数
  maxRetries: 3,
};

// ============================================================
// 3. 路径安全规则
// ============================================================
const PATH_RULES = {
  // 工作区根目录
  workspaceRoot: 'C:\\Users\\DELL\\.openclaw\\workspace',

  // 允许访问的目录
  allowedDirs: [
    'C:\\Users\\DELL\\.openclaw\\workspace',
    'C:\\Users\\DELL\\.openclaw\\workspace\\brain',
    'C:\\Users\\DELL\\.openclaw\\workspace\\projects',
    'C:\\Users\\DELL\\.openclaw\\workspace\\skills',
  ],

  // 禁止访问的目录
  forbiddenDirs: [
    'C:\\Users\\DELL\\.openclaw\\vault',
    'C:\\Windows\\System32',
    'C:\\Windows\\SysWOW64',
    'C:\\Program Files\\',
    'C:\\Program Files (x86)\\',
  ],

  // 路径遍历检测
  traversalPatterns: [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e/i,
    /%252e/gi,
  ],
};

// ============================================================
// 4. API 凭证规则
// ============================================================
const API_RULES = {
  // 禁止直接输出的凭证字段
  sensitiveFields: [
    'api_key',
    'apiKey',
    'secret',
    'password',
    'token',
    'access_token',
    'refresh_token',
    'private_key',
    'privateKey',
    'secret_key',
    'secretKey',
  ],

  // 掩码规则
  maskRules: {
    default: '***MASKED***',
    partial: (val) => {
      if (!val || val.length < 8) return '***';
      return val.substring(0, 4) + '***' + val.substring(val.length - 4);
    },
  },
};

// ============================================================
// 5. 验证函数
// ============================================================

/**
 * 检查命令是否危险
 * @param {string} command - 命令字符串
 * @returns {{ allowed: boolean, reason?: string }}
 */
function checkDangerousCommand(command) {
  for (const rule of DANGEROUS_COMMANDS) {
    if (rule.pattern.test(command)) {
      return { allowed: false, reason: rule.reason };
    }
  }
  return { allowed: true };
}

/**
 * 检查路径是否安全
 * @param {string} path - 文件路径
 * @returns {{ allowed: boolean, reason?: string }}
 */
function checkPathSafety(path) {
  const normalizedPath = path.replace(/\//g, '\\').toLowerCase();

  // 检查路径遍历
  for (const pattern of PATH_RULES.traversalPatterns) {
    if (pattern.test(path)) {
      return { allowed: false, reason: '路径遍历检测' };
    }
  }

  // 检查禁止目录
  for (const forbidden of PATH_RULES.forbiddenDirs) {
    if (normalizedPath.startsWith(forbidden.toLowerCase())) {
      return { allowed: false, reason: `禁止访问目录: ${forbidden}` };
    }
  }

  return { allowed: true };
}

/**
 * 掩码敏感凭证
 * @param {string} fieldName - 字段名
 * @param {*} value - 字段值
 * @returns {*}
 */
function maskCredential(fieldName, value) {
  const sensitive = API_RULES.sensitiveFields.some(
    f => fieldName.toLowerCase().includes(f.toLowerCase())
  );

  if (!sensitive) return value;

  return API_RULES.maskRules.partial(value);
}

// ============================================================
// 6. Vault Proxy（凭证访问代理）
// ============================================================
const vaultProxy = {
  /**
   * 通过代理访问凭证（不直接暴露）
   * @param {string} key - 凭证键名
   * @returns {Promise<*>} 凭证值
   */
  async get(key) {
    // 实际实现会从 vault 存储读取
    // 这里只是接口定义
    throw new Error('vault.proxy() must be implemented by the vault module');
  },

  /**
   * 凭证访问日志
   * @param {string} operation - 操作类型
   * @param {string} key - 凭证键名
   */
  log(operation, key) {
    if (!VAULT_RULES.logAccess) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      key,
      sessionId: process.env.OPENCLAW_SESSION_ID || 'unknown',
    };

    console.log(`[VAULT] ${JSON.stringify(logEntry)}`);
  },
};

// ============================================================
// 7. 导出模块
// ============================================================
module.exports = {
  // 规则集
  VAULT_RULES,
  PATH_RULES,
  API_RULES,
  DANGEROUS_COMMANDS,

  // 验证函数
  checkDangerousCommand,
  checkPathSafety,
  maskCredential,

  // 代理
  vaultProxy,

  // 版本
  VERSION: '1.0.0',
  UPDATED: '2026-05-12',
};
