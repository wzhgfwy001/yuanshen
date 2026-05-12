/**
 * brain/sandbox-rules.js
 * 危险命令检查规则 - 安全执行防线
 * 
 * 定义禁止和警告的命令模式，防止恶意操作
 */

module.exports = {
  meta: {
    version: '1.0.0',
    description: 'Sandbox security rules for dangerous command detection'
  },

  // 危险命令黑名单 - 直接拒绝
  denyList: [
    // 递归删除（最危险）
    { pattern: /rm\s+(-rf|-fr|-r\s+-f)/i, reason: 'Recursive force delete' },
    { pattern: /del\s+\/[sq]/i, reason: 'Windows recursive delete' },
    { pattern: /rm\s+-rf/i, reason: 'Recursive delete' },
    { pattern: /remove\s+(-rf|-fr)/i, reason: 'Recursive remove' },
    
    // 格式化操作
    { pattern: /format\s+[a-z]:/i, reason: 'Disk format operation' },
    { pattern: /\bformat\b/i, reason: 'Format operation' },
    
    // 危险系统命令
    { pattern: /mkfs/i, reason: 'Filesystem creation' },
    { pattern: /fdisk/i, reason: 'Disk partitioning' },
    { pattern: /parted/i, reason: 'Disk partitioning' },
    
    // 数据破坏
    { pattern: /shred/i, reason: 'Secure data deletion' },
    { pattern: /dd\s+.*of=\/(dev|sd)/i, reason: 'Direct disk write' },
    
    // 网络后门
    { pattern: /nc\s+(-e|--exec)/i, reason: 'Netcat reverse shell' },
    { pattern: /bash\s+-i\s*>&/i, reason: 'Bash reverse shell' },
    { pattern: /powershell.*-enc/i, reason: 'Encoded PowerShell' },
    { pattern: /curl\s+\|\s*bash/i, reason: 'Pipe to bash download' },
    { pattern: /wget\s+\|\s*bash/i, reason: 'Pipe to bash download' },
    
    // 凭据窃取
    { pattern: /export\s+PASS/i, reason: 'Password in environment' },
    { pattern: /chpasswd/i, reason: 'Password change' },
    
    // 系统篡改
    { pattern: /chmod\s+777/i, reason: 'Full permission change' },
    { pattern: /chmod\s+0/i, reason: 'Remove all permissions' },
    { pattern: /chown/i, reason: 'Ownership change' },
    
    // 进程终止
    { pattern: /kill\s+-9/i, reason: 'Force kill process' },
    { pattern: /pkill/i, reason: 'Process kill' },
    { pattern: /taskkill.*\/f/i, reason: 'Windows force kill' }
  ],

  // 警告命令 - 需要确认
  warnList: [
    { pattern: /sudo/i, reason: 'Elevated privileges' },
    { pattern: /chmod\s+[0-7][0-7][0-7]/i, reason: 'Permission modification' },
    { pattern: />\s*\/dev\/null/i, reason: 'Output suppression' },
    { pattern: /\|\s*tee/i, reason: 'Output logging' },
    { pattern: /crontab/i, reason: 'Scheduled task modification' },
    { pattern: /cron/i, reason: 'Cron job modification' },
    { pattern: /systemctl/i, reason: 'System service modification' },
    { pattern: /service\s+/i, reason: 'Service management' },
    { pattern: /init\s+6/i, reason: 'System reboot' },
    { pattern: /shutdown/i, reason: 'System shutdown' }
  ],

  // 路径越界检测模式
  pathTraversal: [
    { pattern: /\.\.\//, reason: 'Directory traversal' },
    { pattern: /\.\.%5c/i, reason: 'Encoded directory traversal' },
    { pattern: /%2e%2e%2f/i, reason: 'URL encoded traversal' },
    { pattern: /~/, reason: 'Home directory reference' }
  ],

  // Windows特定危险命令
  windowsDeny: [
    { pattern: /icacls/i, reason: 'Windows ACL modification' },
    { pattern: /takeown/i, reason: 'Ownership takeover' },
    { pattern: /diskpart/i, reason: 'Disk management' },
    { pattern: /bcdedit/i, reason: 'Boot configuration' },
    { pattern: /reg\s+add/i, reason: 'Registry modification' },
    { pattern: /vssadmin/i, reason: 'Volume shadow copy' },
    { pattern: /wmic\s+os/i, reason: 'OS information disclosure' },
    { pattern: /certutil.*-decode/i, reason: 'Certificate decoding (malware)' }
  ],

  // 核心检查方法
  check(command) {
    const cmd = command.trim();
    
    // 检查黑名单
    for (const item of this.denyList) {
      if (item.pattern.test(cmd)) {
        return { allowed: false, action: 'deny', reason: item.reason };
      }
    }
    
    // 检查Windows特定
    for (const item of this.windowsDeny) {
      if (item.pattern.test(cmd)) {
        return { allowed: false, action: 'deny', reason: item.reason };
      }
    }
    
    // 检查警告列表
    for (const item of this.warnList) {
      if (item.pattern.test(cmd)) {
        return { allowed: true, action: 'warn', reason: item.reason };
      }
    }
    
    return { allowed: true, action: 'allow', reason: 'OK' };
  },

  // 路径安全验证
  validatePath(filepath) {
    const path = filepath || '';
    
    // 检查路径遍历
    for (const item of this.pathTraversal) {
      if (item.pattern.test(path)) {
        return { allowed: false, reason: item.reason };
      }
    }
    
    // 检查是否在工作区根目录下
    const workspaceRoot = 'C:\\Users\\DELL\\.openclaw\\workspace';
    const resolvedPath = path.replace(/\\/g, '/');
    const resolvedRoot = workspaceRoot.replace(/\\/g, '/');
    
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return { allowed: false, reason: 'Path outside workspace' };
    }
    
    return { allowed: true, reason: 'OK' };
  }
};