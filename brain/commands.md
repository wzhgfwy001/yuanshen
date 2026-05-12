# 命令系统（Slash Commands）

> 基于 Claude Code 的 slash commands 设计理念
> 目标：提供统一命令入口，降低歧义
> 生成时间：2026-05-12

## 核心理念

Claude Code 支持 slash commands：
```
/read    - 读取文件
/bash    - 执行命令
/agent  - 启动子Agent
/skills - 使用技能
```

**好处：用户知道可以用什么命令，比自然语言更明确**

## 命令注册表

| 命令 | 格式 | 说明 | 权限 |
|------|------|------|------|
| /search | /search <关键词> | 搜索文件 | all |
| /exec | /exec <命令> | 执行系统命令 | trusted |
| /agent | /agent <任务> | 创建子Agent | admin |
| /status | /status | 查看任务状态 | all |
| /memory | /memory <查询> | 搜索记忆 | all |
| /task | /task <描述> | 创建新任务 | all |
| /cancel | /cancel <taskId> | 取消任务 | admin |
| /help | /help [命令] | 显示帮助 | all |

## 命令解析流程

```
用户输入
    ↓
是否 / 开头？
    ├── 否 → 自然语言处理
    └── 是 → 解析命令
              ↓
         /command arg1 arg2
              ↓
         命令路由 → 执行器
```

## 自然语言 → 命令映射

```javascript
const CommandMapping = {
  // 搜索类
  '搜一下': '/search',
  '查找': '/search',
  '找文件': '/search',
  
  // 执行类
  '运行': '/exec',
  '执行': '/exec',
  '跑一下': '/exec',
  
  // 任务类
  '做个任务': '/task',
  '开始工作': '/task',
  
  // 状态类
  '进度': '/status',
  '状态': '/status'
}
```

## 内置命令实现

### /search

```javascript
async function cmdSearch(args) {
  const keyword = args.join(' ')
  const results = await searchFiles(keyword, {
    paths: ['C:/Users/DELL/.openclaw/workspace'],
    extensions: ['.md', '.js', '.json']
  })
  return {
    type: 'search-results',
    keyword,
    count: results.length,
    results: results.slice(0, 10)
  }
}
```

### /status

```markdown
# 任务状态

## 运行中
| TaskId | 任务 | 状态 | 进度 |
|--------|------|------|------|
| t-001 | 高考系统开发 | 🔄 | 65% |

## 待处理
| TaskId | 任务 | 优先级 |
|--------|------|----------|
| t-002 | 代码审查 | P1 |

## 最近完成
| TaskId | 任务 | 完成时间 |
|--------|------|----------|
| t-003 | 文件搜索优化 | 10分钟前 |
```

### /task

```javascript
async function cmdTask(args) {
  const description = args.join(' ')
  const taskId = await createTask({
    description,
    priority: 'P2',
    type: 'local'
  })
  return {
    type: 'task-created',
    taskId,
    message: `任务已创建: ${taskId}`
  }
}
```

## 命令帮助系统

```markdown
# 可用命令

## 基础命令
/help          - 显示帮助
/status        - 查看任务状态
/search <关键词> - 搜索文件

## 任务命令
/task <描述>   - 创建新任务
/cancel <taskId> - 取消任务

## 高级命令
/exec <命令>   - 执行系统命令（需权限）
/agent <任务>   - 创建子Agent（需权限）
```

## 权限控制

```javascript
const CommandPermissions = {
  all: ['search', 'status', 'memory', 'help', 'task'],
  trusted: ['exec'],
  admin: ['agent', 'cancel', 'kill']
}

// 检查权限
function canExecute(command, userRole) {
  const permissions = CommandPermissions[userRole]
  return permissions.includes(command)
}
```

## 使用示例

```
用户: /search 高考志愿
AI: 🔍 搜索 "高考志愿"...

结果:
- wiki/sources/gaokao-system.md
- wiki/sources/志愿填报指南.md
- brain/projects/gaokao/进度.md

---

用户: /status
AI: 📊 当前任务状态...

---

用户: /task 开发用户登录模块
AI: ✅ 任务已创建: t-20260512-005
    优先级: P2
    状态: pending
```

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Claude Code slash commands 理念*