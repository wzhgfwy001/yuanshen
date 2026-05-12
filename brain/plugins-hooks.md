# 插件与Hook机制（Plugins & Hooks）

> 基于 Claude Code 的 src/plugins/ 和 src/hooks/ 设计理念
> 目标：实现功能扩展和运行时治理
> 生成时间：2026-05-12

## 核心理念

Claude Code 有两大扩展机制：
- **插件（Plugins）**：扩展新功能
- **Hook**：在关键节点插入逻辑

## 插件系统

### 插件结构

```
brain/plugins/
├── code-review/      # 代码审查插件
│   ├── index.js       # 入口
│   ├── config.json    # 配置
│   └── rules/         # 审查规则
├── web-search/        # 网页搜索插件
│   ├── index.js
│   └── config.json
├── translate/          # 翻译插件
│   ├── index.js
│   └── config.json
└── export/            # 导出插件
    ├── index.js
    └── config.json
```

### 插件接口

```javascript
// 统一插件接口
class Plugin {
  constructor(name, config) {
    this.name = name
    this.config = config
    this.enabled = true
  }
  
  // 插件初始化
  async init() {
    throw new Error('Plugin must implement init()')
  }
  
  // 插件执行
  async execute(context) {
    throw new Error('Plugin must implement execute()')
  }
  
  // 插件卸载
  async unload() {
    this.enabled = false
  }
}
```

### 插件注册

```javascript
// brain/plugins/registry.json
{
  "plugins": [
    {
      "name": "code-review",
      "path": "brain/plugins/code-review",
      "enabled": true,
      "version": "1.0.0"
    },
    {
      "name": "web-search",
      "path": "brain/plugins/web-search",
      "enabled": true,
      "version": "1.0.0"
    }
  ]
}
```

## Hook 系统

### Hook 类型

| Hook | 时机 | 用途 |
|------|------|------|
| before-task | 任务执行前 | 检查权限、记录日志 |
| after-task | 任务执行后 | 保存结果、通知 |
| on-error | 发生错误时 | 错误处理、告警 |
| on-timeout | 任务超时时 | 清理、告警 |
| before-exit | 系统退出前 | 保存状态、清理 |
| after-exit | 系统退出后 | 持久化、通知 |

### Hook 实现

```javascript
class HookManager {
  constructor() {
    this.hooks = {
      'before-task': [],
      'after-task': [],
      'on-error': [],
      'on-timeout': [],
      'before-exit': [],
      'after-exit': []
    }
  }
  
  // 注册 Hook
  register(hookType, fn) {
    this.hooks[hookType].push(fn)
  }
  
  // 触发 Hook
  async trigger(hookType, context) {
    const hooks = this.hooks[hookType] || []
    for (const fn of hooks) {
      try {
        await fn(context)
      } catch (error) {
        console.error(`Hook ${hookType} error:`, error)
      }
    }
  }
}
```

### 内置 Hook 示例

```javascript
// before-task Hook
const beforeTaskHook = async (task) => {
  // 1. 检查权限
  if (!hasPermission(task)) {
    throw new PermissionError('No permission')
  }
  // 2. 记录日志
  log(`Task ${task.id} starting`)
  // 3. 检查资源
  if (isLowMemory()) {
    throw new Error('System resources low')
  }
}

// after-task Hook
const afterTaskHook = async (task) => {
  // 1. 保存 checkpoint
  await saveCheckpoint(task.id, task.result)
  // 2. 通知完成
  if (task.notify) {
    await sendNotification(task.notify, task.result)
  }
  // 3. 更新统计
  stats.record(task)
}

// on-error Hook
const onErrorHook = async (error, task) => {
  // 1. 记录错误
  logError(`Task ${task.id} failed:`, error)
  // 2. 告警
  if (error.level === 'critical') {
    await sendAlert(error)
  }
  // 3. 保存错误状态
  await saveErrorState(task.id, error)
}
```

## 插件 + Hook 组合

### 代码审查插件示例

```javascript
// brain/plugins/code-review/index.js
class CodeReviewPlugin {
  constructor() {
    this.name = 'code-review'
  }
  
  async init() {
    // 注册 Hook
    hooks.register('before-task', this.review.bind(this))
    hooks.register('after-task', this.summarize.bind(this))
  }
  
  async execute(context) {
    // 执行审查
    return await this.runReview(context)
  }
  
  async review(task) {
    // Task 审查前 Hook
    if (task.type === 'code') {
      console.log('Running code review...')
    }
  }
  
  async summarize(task) {
    // Task 完成后总结
    if (task.result) {
      await this.saveSummary(task)
    }
  }
}
```

## 运行时治理

```javascript
// 插件管理器
class PluginManager {
  constructor() {
    this.plugins = new Map()
  }
  
  async loadPlugin(pluginPath) {
    const plugin = require(pluginPath)
    await plugin.init()
    this.plugins.set(plugin.name, plugin)
    return plugin
  }
  
  async unloadPlugin(name) {
    const plugin = this.plugins.get(name)
    if (plugin) {
      await plugin.unload()
      this.plugins.delete(name)
    }
  }
  
  // 热重载
  async reloadPlugin(name) {
    const path = this.plugins.get(name)?.path
    if (path) {
      await this.unloadPlugin(name)
      await this.loadPlugin(path)
    }
  }
}
```

## 好处

| 好处 | 说明 |
|------|------|
| 可扩展 | 新功能做成插件 |
| 可定制 | 用户可以启用/禁用插件 |
| 模块化 | 功能独立，易维护 |
| 热更新 | 不重启系统即可更新插件 |

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Claude Code 插件/Hook 理念*