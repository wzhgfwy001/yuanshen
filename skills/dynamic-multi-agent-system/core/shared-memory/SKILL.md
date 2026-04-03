---
name: shared-memory
description: 管理多 Agent 共享记忆层，支持读写、版本控制、权限管理
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 共享记忆管理

## 功能

管理多 Agent 协作中的共享记忆，支持：
- 结构化数据存储
- Agent 间直接读写（无需主 Agent 中转）
- 版本控制
- 权限管理

## 使用场景

✅ **使用此技能时：**
- 多 Agent 协作需要共享数据
- 子 Agent 需要读取其他 Agent 的输出
- 需要避免主 Agent 中转数据

❌ **不使用此技能时：**
- 单 Agent 任务
- 简单的数据传递
## API

### 写入记忆

**命令：** `write(task-id, key, value, agent-id)`

**参数：**
- `task-id`: 任务唯一标识
- `key`: 记忆键名
- `value`: 记忆内容（JSON 格式）
- `agent-id`: 写入 Agent 的 ID

**示例：**
write（“task-001”， “search-results”， {“query”： “AI 发展”， “results”： [...]}， “agent-search-001”）

收到

---

### 读取记忆

**命令：** `read(task-id, key, agent-id)`

**参数：**
- `task-id`: 任务唯一标识
- `key`: 记忆键名
- `agent-id`: 读取 Agent 的 ID

**示例：**
read（“任务-001”，“搜索结果”，“agent-outline-001”）

收到

---

### 列出所有键

**命令：** `list-keys(task-id)`

**返回：** 任务的所有记忆键名列表

**示例：**
list-keys（“任务-001”）

返回：[“搜索结果”， “大纲草稿”， “最终输出”]
收到

---

### 删除记忆

**命令：** `delete(task-id, key)`

**示例：**
delete（“任务-001”，“临时数据”）

收到

---

### 获取版本历史

**命令：** `get-history(task-id, key)`

**返回：** 指定记忆键的版本历史

**示例：**
获取历史（“任务-001”，“大纲草稿”）

返回：[v1， v2， v3]