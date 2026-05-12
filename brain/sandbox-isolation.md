# Sandbox 安全隔离（Sandbox Isolation）

> 基于 Claude Code 的 @anthropic-ai/sandbox-runtime 理念
> 目标：OS 级隔离，工具执行更安全
> 生成时间：2026-05-12

## 核心理念

**危险场景：**
如果 AI 被注入恶意命令，可能执行：
- 删除系统文件
- 读取敏感信息
- 外发数据

**解决方案：Sandbox 隔离**
```
AI 执行命令 → Sandbox 拦截 → 检查安全 → 执行/拒绝
```

## 三层隔离

### 1. 文件系统隔离

```javascript
const FileSystemSandbox = {
  // 允许访问的路径
  allowed: [
    'C:/Users/DELL/.openclaw/workspace/**',
    'C:/Users/DELL/Downloads/**',
    'D:/obsidian知识库/**'
  ],
  
  // 禁止访问的路径
  denied: [
    'C:/Windows/**',
    'C:/Program Files/**',
    'C:/Program Files (x86)/**',
    'C:/Users/DELL/AppData/Roaming/**'
  ],
  
  // 检查路径是否安全
  isAllowed(path) {
    if (this.denied.some(p => match(path, p))) {
      return false  // 在黑名单
    }
    if (this.allowed.some(p => match(path, p))) {
      return true   // 在白名单
    }
    return false  // 不在白名单 = 不允许
  }
}
```

### 2. 网络访问控制

```javascript
const NetworkSandbox = {
  // 允许的域名
  allowedDomains: [
    'api.openai.com',
    'api.minimax.io',
    'github.com',
    'api.feishu.cn'
  ],
  
  // 禁止的协议
  deniedProtocols: ['file://', 'ftp://'],
  
  check(url) {
    if (this.deniedProtocols.some(p => url.startsWith(p))) {
      return false
    }
    const domain = new URL(url).hostname
    return this.allowedDomains.includes(domain)
  }
}
```

### 3. 命令执行限制

```javascript
const CommandSandbox = {
  // 危险命令黑名单
  dangerousCommands: [
    'rm -rf /',
    'format',
    'del /s /q',
    'powershell -enc',
    'curl | bash',
    'wget | bash'
  ],
  
  check(command) {
    const lower = command.toLowerCase()
    for (const dangerous of this.dangerousCommands) {
      if (lower.includes(dangerous.toLowerCase())) {
        return { safe: false, reason: `Dangerous command: ${dangerous}` }
      }
    }
    return { safe: true }
  }
}
```

## Sandbox 执行流程

```
用户/AIPrompt
    ↓
1. 命令解析
    ↓
2. 危险命令检查 ← CommandSandbox
    ↓
3. 文件路径检查 ← FileSystemSandbox
    ↓
4. 网络地址检查 ← NetworkSandbox
    ↓
5. 执行/拒绝
```

## 我们的实现

### 简化版 Sandbox

```javascript
class Sandbox {
  constructor() {
    this.filesystem = FileSystemSandbox
    this.network = NetworkSandbox
    this.command = CommandSandbox
  }
  
  async execute(task) {
    const { type, action, target } = task
    
    // 1. 检查命令
    if (type === 'command') {
      const cmdCheck = this.command.check(action)
      if (!cmdCheck.safe) {
        return { success: false, error: cmdCheck.reason }
      }
    }
    
    // 2. 检查文件路径
    if (target && !this.filesystem.isAllowed(target)) {
      return { success: false, error: 'Path not allowed' }
    }
    
    // 3. 执行
    return await this.doExecute(task)
  }
}
```

### 权限级别

| 级别 | 说明 | 适用场景 |
|------|------|---------|
| sandbox | 完全隔离 | 用户/AIPrompt |
| trusted | 限制访问 | 验证过的工具 |
| full | 无限制 | 系统管理 |

## 安全边界

```
┌─────────────────────────────────────────┐
│         AI 执行环境（低权限）              │
├─────────────────────────────────────────┤
│  文件：只读 workspace/                  │
│  网络：只读白名单域名                   │
│  命令：只执行允许列表                   │
└─────────────────────────────────────────┘
```

## 注意事项

- Sandbox 不是100%安全，仍需人工监督
- 复杂命令仍可能绕过检查
- 建议配合日志和告警使用

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Claude Code Sandbox 隔离理念*
