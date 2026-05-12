# 工具接口标准化（Tools Interface）

> 基于 Claude Code 的工具系统设计理念
> 目标：为所有工具定义统一接口，实现生命周期管理
> 生成时间：2026-05-12

## 核心理念

Claude Code 的每个工具都遵循统一的生命周期：
```
created → initialized → executing → completed/failed → cleaned
```

## 工具注册表

| 工具名 | 类 | 说明 |
|--------|---|------|
| exec | ExecTool | 执行系统命令 |
| read | ReadTool | 读取文件 |
| write | WriteTool | 写入文件 |
| search | SearchTool | 搜索文件 |
| message | MessageTool | 发送消息 |
| edit | EditTool | 编辑文件 |

## 统一工具接口

```javascript
class BaseTool {
  constructor(name) {
    this.name = name
    this.state = 'created'
  }
  
  // 初始化
  init(config) {
    this.config = config
    this.state = 'initialized'
    return this
  }
  
  // 输入验证
  validate(input) {
    // 检查输入是否合法
    if (!this.isValidInput(input)) {
      throw new ToolValidationError(`Invalid input for ${this.name}`)
    }
    return true
  }
  
  // 执行
  async execute(params) {
    if (this.state !== 'initialized') {
      throw new Error(`${this.name} not initialized`)
    }
    this.state = 'executing'
    try {
      const result = await this.doExecute(params)
      this.state = 'completed'
      return result
    } catch (error) {
      this.state = 'failed'
      throw error
    }
  }
  
  // 清理
  cleanup() {
    this.state = 'cleaned'
    this.config = null
  }
}
```

## 生命周期状态机

```
created
    ↓ init()
initialized
    ↓ validate(input)
    ↓ execute()
executing
    ↓ 完成/失败
completed/failed
    ↓ cleanup()
cleaned
```

## 错误处理统一

| 错误类型 | 处理方式 |
|---------|---------|
| ToolValidationError | 输入不合法，记录并跳过 |
| ToolExecutionError | 执行失败，重试或跳过 |
| ToolTimeoutError | 超时，终止并记录 |
| ToolPermissionError | 权限不足，拒绝执行 |

## 并发安全

```javascript
class ToolManager {
  constructor() {
    this.tools = new Map()
    this.running = new Set()  // 防止同一工具并发
  }
  
  async execute(toolName, params) {
    if (this.running.has(toolName)) {
      throw new Error(`${toolName} is already running`)
    }
    this.running.add(toolName)
    try {
      const tool = this.getTool(toolName)
      return await tool.execute(params)
    } finally {
      this.running.delete(toolName)
    }
  }
}
```

## 权限检查

```javascript
// 执行前检查
beforeExecute(task) {
  // 1. 检查工具是否在白名单
  if (!WHITELIST_TOOLS.includes(task.tool)) {
    throw new PermissionError('Tool not allowed')
  }
  
  // 2. 检查命令是否安全
  if (!isCommandSafe(task.command)) {
    throw new PermissionError('Command not safe')
  }
  
  // 3. 检查文件路径
  if (!isPathAllowed(task.path)) {
    throw new PermissionError('Path not allowed')
  }
}
```

## 实现好处

| 好处 | 说明 |
|------|------|
| 统一管理 | 所有工具同一套接口 |
| 错误处理 | 统一捕获，不会漏掉 |
| 并发安全 | 工具不会互相干扰 |
| 可测试 | 可以单独测试每个工具 |
| 可扩展 | 新工具只需实现接口 |

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Claude Code 工具系统理念*
