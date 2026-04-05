# 共享记忆层协议 v1.0

## 概述

共享记忆层是多 Agent 协作系统的核心基础设施，提供：
- ✅ 结构化数据存储（JSON）
- ✅ Agent 间直接读写（无需主 Agent 中转）
- ✅ 版本控制（每次修改保留历史）
- ✅ 权限管理（基于任务的访问控制）
- ✅ 原子操作（避免并发冲突）

---

## 存储结构

### 目录结构

```
skills/dynamic-multi-agent-system/state/
├── tasks/                    # 任务状态存储
│   ├── {task-id}/
│   │   ├── memory.json       # 主记忆文件
│   │   ├── history/          # 版本历史
│   │   │   ├── {key}-v1.json
│   │   │   ├── {key}-v2.json
│   │   │   └── ...
│   │   └── metadata.json     # 任务元数据
│   └── ...
├── agents/                   # Agent 状态
│   └── {agent-id}.json
└── skills/                   # Skill 计数
    └── counters.json
```

### 记忆文件格式 (memory.json)

```json
{
  "task-id": "task-001",
  "created-at": "2026-04-04T10:00:00Z",
  "updated-at": "2026-04-04T10:30:00Z",
  "status": "running|completed|failed",
  "data": {
    "world-setting": {
      "value": {...},
      "version": 1,
      "created-by": "agent-world-001",
      "created-at": "2026-04-04T10:05:00Z",
      "updated-by": "agent-world-001",
      "updated-at": "2026-04-04T10:05:00Z"
    },
    "outline": {
      "value": {...},
      "version": 2,
      "created-by": "agent-outline-001",
      "created-at": "2026-04-04T10:15:00Z",
      "updated-by": "agent-main",
      "updated-at": "2026-04-04T10:20:00Z"
    }
  },
  "permissions": {
    "agent-world-001": ["read", "write"],
    "agent-outline-001": ["read", "write"],
    "agent-writer-001": ["read", "write"],
    "agent-editor-001": ["read"]
  }
}
```

### 任务元数据 (metadata.json)

```json
{
  "task-id": "task-001",
  "task-type": "innovative",
  "description": "创作科幻短篇小说",
  "created-at": "2026-04-04T10:00:00Z",
  "completed-at": null,
  "total-subagents": 4,
  "current-stage": "writing",
  "progress": 0.6
}
```

---

## API 协议

### 1. 写入记忆

**接口：** `write(taskId, key, value, agentId)`

**请求：**
```json
{
  "action": "write",
  "taskId": "task-001",
  "key": "world-setting",
  "value": {"era": "2077", "location": "北京", ...},
  "agentId": "agent-world-001"
}
```

**处理流程：**
```
1. 验证任务是否存在
2. 验证 Agent 权限（是否有 write 权限）
3. 检查 key 是否已存在
   - 存在：创建版本历史，version++
   - 不存在：创建新 key，version=1
4. 更新 memory.json
5. 保存历史版本到 history/
6. 返回成功
```

**响应：**
```json
{
  "success": true,
  "version": 2,
  "timestamp": "2026-04-04T10:20:00Z",
  "message": "写入成功"
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "PERMISSION_DENIED",
  "message": "Agent 无写入权限"
}
```

---

### 2. 读取记忆

**接口：** `read(taskId, key, agentId)`

**请求：**
```json
{
  "action": "read",
  "taskId": "task-001",
  "key": "world-setting",
  "agentId": "agent-outline-001"
}
```

**处理流程：**
```
1. 验证任务是否存在
2. 验证 Agent 权限（是否有 read 权限）
3. 读取 memory.json 中的 key
4. 返回 value
```

**响应：**
```json
{
  "success": true,
  "value": {...},
  "version": 2,
  "created-by": "agent-world-001",
  "updated-at": "2026-04-04T10:20:00Z"
}
```

---

### 3. 列出所有键

**接口：** `listKeys(taskId)`

**请求：**
```json
{
  "action": "list-keys",
  "taskId": "task-001"
}
```

**响应：**
```json
{
  "success": true,
  "keys": [
    {"key": "world-setting", "version": 1, "updated-at": "..."},
    {"key": "outline", "version": 2, "updated-at": "..."},
    {"key": "chapter-1", "version": 1, "updated-at": "..."}
  ]
}
```

---

### 4. 删除记忆

**接口：** `delete(taskId, key, agentId)`

**请求：**
```json
{
  "action": "delete",
  "taskId": "task-001",
  "key": "temporary-data",
  "agentId": "agent-main"
}
```

**响应：**
```json
{
  "success": true,
  "message": "删除成功",
  "archived": true
}
```

**注意：** 删除的数据会移动到归档区，不会永久删除

---

### 5. 获取版本历史

**接口：** `getHistory(taskId, key)`

**请求：**
```json
{
  "action": "get-history",
  "taskId": "task-001",
  "key": "outline"
}
```

**响应：**
```json
{
  "success": true,
  "history": [
    {
      "version": 1,
      "value": {...},
      "created-by": "agent-outline-001",
      "created-at": "2026-04-04T10:15:00Z"
    },
    {
      "version": 2,
      "value": {...},
      "created-by": "agent-main",
      "created-at": "2026-04-04T10:20:00Z"
    }
  ]
}
```

---

### 6. 回滚到指定版本

**接口：** `rollback(taskId, key, version, agentId)`

**请求：**
```json
{
  "action": "rollback",
  "taskId": "task-001",
  "key": "outline",
  "version": 1,
  "agentId": "agent-main"
}
```

**处理流程：**
```
1. 验证版本是否存在
2. 读取指定版本的数据
3. 创建新版本（version++）
4. 将旧版本数据复制到新版本
5. 更新 memory.json
```

**响应：**
```json
{
  "success": true,
  "new-version": 3,
  "rolled-back-to": 1,
  "message": "回滚成功"
}
```

---

## 权限管理

### 权限级别

| 权限 | 说明 | 适用角色 |
|------|------|----------|
| `read` | 读取记忆 | 所有子 Agent |
| `write` | 写入/修改记忆 | 创作类 Agent |
| `delete` | 删除记忆 | 主 Agent、审查员 |
| `admin` | 全部权限 | 主 Agent |

### 权限分配规则

```
任务创建时：
- 主 Agent：admin
- 子 Agent：read + write（自己创建的 key）
- 审查 Agent：read + write（审查报告）

权限继承：
- 子 Agent 自动继承任务的 read 权限
- write 权限需要显式授予
```

### 权限验证流程

```
每次读写操作前：
1. 读取 memory.json 中的 permissions
2. 检查 agentId 是否有对应权限
3. 无权限 → 返回 PERMISSION_DENIED
4. 有权限 → 继续执行操作
```

---

## 并发控制

### 原子操作

所有写操作都是原子的：
```
1. 读取 memory.json
2. 修改数据
3. 写入临时文件
4. 原子替换（rename）
```

### 乐观锁

使用版本号实现乐观锁：
```
写入时指定期望版本：
write(taskId, key, value, agentId, expectedVersion)

如果当前版本 != expectedVersion：
- 返回 CONFLICT 错误
- 包含最新版本数据
- 让调用者决定如何处理
```

---

## 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `TASK_NOT_FOUND` | 任务不存在 | 检查 task-id |
| `KEY_NOT_FOUND` | 键不存在 | 检查 key 名称 |
| `PERMISSION_DENIED` | 无权限 | 申请权限或使用其他 Agent |
| `VERSION_CONFLICT` | 版本冲突 | 读取最新版本后重试 |
| `INVALID_JSON` | JSON 格式错误 | 检查数据格式 |
| `DISK_FULL` | 磁盘空间不足 | 清理空间 |

---

## 使用示例

### 示例 1：世界观设计师写入设定

```javascript
// 子 Agent 1：世界观设计师
write(
  "task-sci-fi-001",
  "world-setting",
  {
    "era": "2077",
    "location": "北京",
    "tech-level": "fusion-power",
    "social-system": "post-scarcity"
  },
  "agent-world-001"
)

// 响应：{success: true, version: 1}
```

### 示例 2：大纲规划师读取设定

```javascript
// 子 Agent 2：大纲规划师
const result = read(
  "task-sci-fi-001",
  "world-setting",
  "agent-outline-001"
)

// result.value 包含世界观设定
// 基于设定设计大纲
```

### 示例 3：小说作家读取多个记忆

```javascript
// 子 Agent 3：小说作家
const world = read("task-sci-fi-001", "world-setting", "agent-writer-001")
const outline = read("task-sci-fi-001", "outline", "agent-writer-001")

// 基于设定和大纲创作
const chapter = createChapter(world.value, outline.value)

// 写入创作结果
write("task-sci-fi-001", "chapter-1", chapter, "agent-writer-001")
```

### 示例 4：审查员读取并写入审查报告

```javascript
// 子 Agent 4：审查员
const story = read("task-sci-fi-001", "chapter-1", "agent-editor-001")

// 审查
const report = review(story.value)

// 写入审查报告
write("task-sci-fi-001", "review-report", report, "agent-editor-001")
```

---

## 实现注意事项

### 1. 文件锁

使用文件锁避免并发写入冲突：
```javascript
const lock = await acquireLock(`task-${taskId}.lock`)
try {
  // 执行写操作
} finally {
  await releaseLock(lock)
}
```

### 2. 历史清理

定期清理旧版本历史（保留最近 10 个版本）：
```javascript
function cleanupHistory(taskId, key, keepVersions = 10) {
  const history = getHistory(taskId, key)
  if (history.length > keepVersions) {
    const toDelete = history.slice(0, -keepVersions)
    toDelete.forEach(v => deleteVersionFile(taskId, key, v.version))
  }
}
```

### 3. 性能优化

- 使用内存缓存减少磁盘 IO
- 批量写入合并多个操作
- 异步写入非关键数据

---

## 下一步

1. **实现基础 API** - write/read/listKeys/delete
2. **添加版本控制** - 历史版本管理
3. **实现权限系统** - 基于 Agent 角色的访问控制
4. **添加并发控制** - 文件锁 + 乐观锁
5. **编写测试用例** - 验证所有 API

---

*协议版本：1.0*  
*最后更新：2026-04-04*
