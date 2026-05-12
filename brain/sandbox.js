/**
 * Sandbox Isolation - 安全沙箱
 * 基于 Claude Code 三层隔离理念
 * 文件系统 + 网络 + 命令执行 三重保护
 */

const path = require('path');
const fs = require('fs');

// 允许的路径白名单
const ALLOWED_PATHS = [
  'C:/Users/DELL/.openclaw/workspace',
  'C:/Users/DELL/Downloads',
  'D:/obsidian知识库',
  'C:/Users/DELL/.openclaw'
];

// 禁止的路径黑名单
const DENIED_PATHS = [
  'C:/Windows',
  'C:/Program Files',
  'C:/Program Files (x86)',
  'C:/Users/DELL/AppData/Roaming',
  'C:/Users/DELL/AppData/Local'
];

// 允许的网络域名
const ALLOWED_DOMAINS = [
  'api.openai.com',
  'api.minimax.io',
  'github.com',
  'api.feishu.cn',
  'minimaxi.com'
];

// 危险命令黑名单
const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'del /s /q',
  'format',
  'powershell -enc',
  'curl | bash',
  'wget | bash',
  'certutil -decode',
  'bitsadmin'
];

// 权限级别
const PERMISSION_LEVEL = {
  SANDBOX: 'sandbox',   // 完全隔离
  TRUSTED: 'trusted',   // 限制访问
  FULL: 'full'          // 无限制
};

/**
 * 路径匹配
 */
function matchPath(target, patterns) {
  const normalized = target.replace(/\\/g, '/').toLowerCase();
  return patterns.some(p => {
    const pattern = p.replace(/\\/g, '/').toLowerCase();
    if (pattern.endsWith('**')) {
      return normalized.startsWith(pattern.slice(0, -2));
    }
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return normalized.startsWith(prefix);
    }
    return normalized === pattern || normalized.startsWith(pattern + '/');
  });
}

/**
 * 文件系统沙箱
 */
class FileSystemSandbox {
  constructor() {
    this.allowedPaths = ALLOWED_PATHS;
    this.deniedPaths = DENIED_PATHS;
  }

  /**
   * 检查路径是否允许
   */
  isAllowed(targetPath) {
    const normalized = path.normalize(targetPath).replace(/\\/g, '/');
    
    // 先检查黑名单
    if (matchPath(normalized, this.deniedPaths)) {
      return { allowed: false, reason: 'Path in denied list' };
    }
    
    // 再检查白名单
    if (matchPath(normalized, this.allowedPaths)) {
      return { allowed: true, reason: 'Path in allowed list' };
    }
    
    return { allowed: false, reason: 'Path not in whitelist' };
  }

  /**
   * 验证读取操作
   */
  validateRead(targetPath) {
    const check = this.isAllowed(targetPath);
    if (!check.allowed) {
      return { valid: false, error: `[Sandbox] Read denied: ${check.reason}` };
    }
    return { valid: true };
  }

  /**
   * 验证写入操作
   */
  validateWrite(targetPath) {
    const check = this.isAllowed(targetPath);
    if (!check.allowed) {
      return { valid: false, error: `[Sandbox] Write denied: ${check.reason}` };
    }
    
    // 写入前检查父目录是否存在
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      return { valid: false, error: `[Sandbox] Parent directory does not exist: ${dir}` };
    }
    return { valid: true };
  }
}

/**
 * 网络沙箱
 */
class NetworkSandbox {
  constructor() {
    this.allowedDomains = ALLOWED_DOMAINS;
  }

  /**
   * 检查URL是否允许
   */
  check(url) {
    try {
      const parsed = new URL(url);
      
      // 检查协议
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { allowed: false, reason: `Protocol not allowed: ${parsed.protocol}` };
      }
      
      // 检查域名
      if (!this.allowedDomains.includes(parsed.hostname)) {
        return { allowed: false, reason: `Domain not allowed: ${parsed.hostname}` };
      }
      
      return { allowed: true };
    } catch (e) {
      return { allowed: false, reason: 'Invalid URL' };
    }
  }

  /**
   * 添加允许的域名
   */
  addDomain(domain) {
    if (!this.allowedDomains.includes(domain)) {
      this.allowedDomains.push(domain);
    }
  }
}

/**
 * 命令执行沙箱
 */
class CommandSandbox {
  constructor() {
    this.dangerousCommands = DANGEROUS_COMMANDS;
    this.permissionLevel = PERMISSION_LEVEL.SANDBOX;
  }

  /**
   * 检查命令是否安全
   */
  check(command) {
    const lower = command.toLowerCase();
    
    // 完全禁止的命令
    for (const dangerous of this.dangerousCommands) {
      if (lower.includes(dangerous.toLowerCase())) {
        return { 
          safe: false, 
          reason: `Dangerous command detected: ${dangerous}` 
        };
      }
    }
    
    // PowerShell 编码命令检查
    if (lower.includes('-enc') && lower.includes('powershell')) {
      return { safe: false, reason: 'Encoded PowerShell command not allowed' };
    }
    
    // 管道到 bash 检查
    if ((lower.includes('curl') || lower.includes('wget')) && lower.includes('| bash')) {
      return { safe: false, reason: 'Pipe to bash not allowed' };
    }
    
    return { safe: true };
  }

  /**
   * 设置权限级别
   */
  setLevel(level) {
    this.permissionLevel = level;
  }
}

/**
 * 主沙箱类
 */
class Sandbox {
  constructor(options = {}) {
    this.filesystem = new FileSystemSandbox();
    this.network = new NetworkSandbox();
    this.command = new CommandSandbox();
    this.level = options.level || PERMISSION_LEVEL.SANDBOX;
    this.log = options.log || console.log;
    
    // 审计日志
    this.auditLog = [];
  }

  /**
   * 执行安全检查
   */
  async execute(task) {
    const { type, action, target, params } = task;
    const auditEntry = {
      timestamp: new Date().toISOString(),
      type,
      action,
      target,
      result: null,
      error: null
    };

    try {
      let result;

      switch (type) {
        case 'command':
          result = this.executeCommand(action);
          break;
          
        case 'read':
          result = this.validateRead(target);
          break;
          
        case 'write':
          result = this.validateWrite(target, params?.content);
          break;
          
        case 'network':
          result = this.validateNetwork(action);
          break;
          
        default:
          result = { success: false, error: `Unknown task type: ${type}` };
      }

      auditEntry.result = result;
      this.audit(auditEntry);
      return result;

    } catch (error) {
      auditEntry.error = error.message;
      this.audit(auditEntry);
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行命令（需要权限）
   */
  executeCommand(command) {
    if (this.level === PERMISSION_LEVEL.SANDBOX) {
      const check = this.command.check(command);
      if (!check.safe) {
        return { success: false, error: check.reason };
      }
    }
    return { success: true, command, executed: true };
  }

  /**
   * 验证读取
   */
  validateRead(targetPath) {
    if (this.level === PERMISSION_LEVEL.SANDBOX) {
      const check = this.filesystem.validateRead(targetPath);
      if (!check.valid) {
        return { success: false, error: check.error };
      }
    }
    return { success: true, path: targetPath, operation: 'read' };
  }

  /**
   * 验证写入
   */
  validateWrite(targetPath, content) {
    if (this.level === PERMISSION_LEVEL.SANDBOX) {
      const check = this.filesystem.validateWrite(targetPath);
      if (!check.valid) {
        return { success: false, error: check.error };
      }
    }
    return { success: true, path: targetPath, operation: 'write' };
  }

  /**
   * 验证网络请求
   */
  validateNetwork(url) {
    if (this.level === PERMISSION_LEVEL.SANDBOX) {
      const check = this.network.check(url);
      if (!check.allowed) {
        return { success: false, error: check.reason };
      }
    }
    return { success: true, url, operation: 'network' };
  }

  /**
   * 审计日志
   */
  audit(entry) {
    this.auditLog.push(entry);
    
    // 同时写入文件
    const logLine = `\n| ${entry.timestamp} | ${entry.type} | ${entry.action} | ${entry.result?.success ? '✅' : '❌'} | ${entry.error || ''}`;
    try {
      const logFile = path.join(__dirname, 'sandbox-audit.log');
      fs.appendFileSync(logFile, logLine);
    } catch (e) {
      // 忽略日志写入失败
    }
  }

  /**
   * 获取审计日志
   */
  getAuditLog() {
    return this.auditLog;
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      level: this.level,
      filesystem: {
        allowedPaths: this.filesystem.allowedPaths,
        deniedPaths: this.filesystem.deniedPaths.length
      },
      network: {
        allowedDomains: this.network.allowedDomains
      },
      auditCount: this.auditLog.length
    };
  }
}

// 单例
const sandbox = new Sandbox();

module.exports = { sandbox, Sandbox, PERMISSION_LEVEL };

// 使用示例
if (require.main === module) {
  console.log('[Sandbox] Status:', sandbox.getStatus());
  
  // 测试文件访问
  console.log('Test read workspace:', sandbox.validateRead('C:/Users/DELL/.openclaw/workspace/test.js'));
  console.log('Test read Windows:', sandbox.validateRead('C:/Windows/system32/cmd.exe'));
  
  // 测试命令
  console.log('Test command safe:', sandbox.executeCommand('node -v'));
  console.log('Test command dangerous:', sandbox.executeCommand('rm -rf /'));
}
