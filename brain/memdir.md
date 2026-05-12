# 跨会话记忆系统（memdir）

> 基于 Claude Code 的 src/memdir/ 设计理念
> 目标：会话之间可以共享上下文，实现断点续跑
> 生成时间：2026-05-12

## 核心理念

Claude Code 有专门的跨会话记忆管理：
- 持久化到文件系统
- 会话之间可以读取之前的上下文
- 支持记忆的增删改查

## 我们需要什么

### 当前问题
```
会话1：用户让AI做任务A，做了一半
会话2：用户继续任务A，但AI不记得进度

原因：没有跨会话记忆
```

### 解决后
```
会话1：任务A，进度50%，checkpoint已保存
会话2：AI读取checkpoint，继续从50%开始
```

## 记忆分层

```
┌─────────────────────────────────────────┐
│           AI 工作记忆（Context）            │
│    当前会话的变量、状态、进度             │
└─────────────────────────────────────────┘
                    ↑
                    │ 同步
                    ↓
┌─────────────────────────────────────────┐
│           跨会话记忆（memdir）            │
│    项目进度、断点、项目状态              │
└─────────────────────────────────────────┘
                    ↑
                    │ 持久化
                    ↓
┌─────────────────────────────────────────┐
│           永久记忆（brain/）               │
│    决策、教训、项目文件                   │
└─────────────────────────────────────────┘
```

## 跨会话记忆结构

```javascript
// brain/memdir/
memdir/
├── session/              # 当前会话工作记忆
│   ├── current.json     # 当前任务状态
│   └── buffer.json      # 工作缓冲区
├── projects/            # 项目级记忆
│   ├── gaokao-project/
│   │   ├── checkpoint.json
│   │   ├── status.md
│   │   └── context.json
│   └── novel-project/
│       ├── checkpoint.json
│       └── chapter-state.json
└── tasks/               # 任务级记忆
    ├── t-20260512-001/
    │   └── state.json
    └── t-20260512-002/
        └── state.json
```

## checkpoint 格式

```json
{
  "taskId": "t-20260512-001",
  "taskName": "高考志愿系统开发",
  "project": "gaokao-project",
  "created": "2026-05-12T10:00:00Z",
  "updated": "2026-05-12T11:30:00Z",
  "progress": {
    "completed": ["完成需求分析", "完成数据库设计"],
    "current": "正在开发用户界面",
    "next": "测试登录功能"
  },
  "context": {
    "lastFile": "C:/project/login.js",
    "lastPosition": "line 45",
    "variables": {
      "userId": "12345",
      "sessionToken": "abc123"
    }
  },
  "errors": [],
  "notes": "遇到登录验证问题，需要查文档"
}
```

## 核心操作

### 1. 保存 checkpoint

```javascript
async function saveCheckpoint(taskId, state) {
  const dir = `brain/memdir/tasks/${taskId}`
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(
    `${dir}/state.json`,
    JSON.stringify(state, null, 2)
  )
}
```

### 2. 读取 checkpoint

```javascript
async function loadCheckpoint(taskId) {
  const path = `brain/memdir/tasks/${taskId}/state.json`
  if (!await fs.exists(path)) return null
  return JSON.parse(await fs.readFile(path))
}
```

### 3. 搜索跨会话记忆

```javascript
async function searchMemdir(query) {
  const results = []
  // 搜索所有 checkpoint
  for (const dir of await fs.readdir('brain/memdir', { recursive: true })) {
    if (dir.includes('checkpoint.json')) {
      const content = await fs.readFile(dir)
      if (content.includes(query)) {
        results.push({ file: dir, match: content })
      }
    }
  }
  return results
}
```

## 使用场景

| 场景 | 之前 | 之后 |
|------|------|------|
| 长时间任务 | 中断后从头来 | 从 checkpoint 继续 |
| 复杂项目 | 需要完整描述上下文 | AI 自动读取记忆 |
| 多人协作 | 交接困难 | 共享 memdir |
| 系统重启 | 状态丢失 | 自动恢复 |

## 项目级记忆示例

```json
{
  "projectId": "gaokao-project",
  "name": "高考志愿系统",
  "status": "进行中",
  "lastActive": "2026-05-12T11:30:00Z",
  "progress": "65%",
  "nextAction": "完成用户登录模块",
  "blockers": [
    "API 接口文档未完成",
    "测试环境不稳定"
  ],
  "team": [
    "主开发者：元神",
    "测试者：用户"
  ]
}
```

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Claude Code memdir 设计理念*