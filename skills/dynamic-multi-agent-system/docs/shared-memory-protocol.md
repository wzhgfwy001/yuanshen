# 共享记忆层协议 v1.1

## 概述

共享记忆层是多 Agent 协作系统的核心基础设施，提供：

- ✅ **结构化数据存储**（JSON）
- ✅ **Agent 间直接读写**（无需主 Agent 中转）
- ✅ **版本控制**（每次修改保留历史）
- ✅ **权限管理**（基于任务的访问控制）
- ✅ **原子操作**（避免并发冲突）
- ✅ **回滚机制**（非破坏性版本恢复）

**当前实现版本：** v1.1  
**协议最后更新：** 2026-04-07

---

## 存储结构

### 目录结构

```
skills/dynamic-multi-agent-system/state/
└── shared-memories/              # 共享记忆存储根目录
    ├── {task-id}.json           # 主记忆文件
    ├── {task-id}.lock           # 文件锁
    ├── {task-id}-history/       # 版本历史目录
    │   └── {key}/
    │       ├── v1.json
    │       ├── v2.json
    │       └── ...
    └── archives/                # 删除归档
        └── {task-id}-{key}-*.json
```

### 记忆文件格式 (memory.json)

```json
{
  "taskId": "task-001",
  "createdAt": "2026-04-07T09:00:00Z",
  "updatedAt": "2026-04-07T10:30:00Z",
  "status": "running",
  "metadata": {
    "taskType": "sci-fi-writing",
    "description": "创作科幻短篇小说"
  },
  "data": {
    "world-setting": {
      "value": {"era": "2077", "location": "北京"},
      "version": 2,
      "createdBy": "agent-world-001",
      "createdAt": "2026-04-07T09:05:00Z",
      "updatedBy": "agent-world-001",
      "updatedAt": "2026-04-07T10:20:00Z"
    },
    "outline": {
      "value": {"acts": ["act1", "act2", "act3"]},
      "version": 1,
      "createdBy": "agent-outline-001",
      "createdAt": "2026-04-07T09:15:00Z",
      "updatedBy": "agent-outline-001",
      "updatedAt": "2026-04-07T09:15:00Z"
    }
  },
  "permissions": {
    "admin-agent": ["admin"],
    "agent-world-001": ["read", "write"],
    "agent-outline-001": ["read", "write"],
    "agent-writer-001": ["read", "write"],
    "agent-editor-001": ["read"]
  },
  "accessLog": [
    {
      "agent": "agent-world-001",
      "action": "write",
      "key": "world-setting",
      "version": 2,
      "timestamp": "2026-04-07T09:05:00Z"
    }
  ]
}
```

---

## 权限管理

### 权限级别

| 权限 | 说明 | 适用角色 |
|------|------|----------|
| `read` | 读取记忆数据 | 所有子 Agent |
| `write` | 写入/修改记忆 | 创作类 Agent |
| `delete` | 删除特定 Key | 主 Agent、审查员 |
| `admin` | 完全控制（授权、删除全记忆） | 主 Agent |

### 权限分配规则

```
任务创建时：
- 主 Agent：自动获得 admin 权限
- 子 Agent：需要显式授予 read/write 权限

权限继承：
- 子 Agent 自动继承任务的 read 权限
- write 权限需要显式授予
- 删除权限仅限主 Agent
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

## API 协议

### 1. 初始化记忆

**接口：** `Initialize-Memory(taskId, metadata, ownerAgent)`

```powershell
$result = Initialize-Memory -taskId "task-001" `
    -metadata @{taskType="sci-fi-writing"} `
    -ownerAgent "main-agent"
```

**响应：**
```json
{
  "success": true,
  "message": "Memory initialized successfully",
  "taskId": "task-001",
  "createdAt": "2026-04-07T09:00:00Z"
}
```

---

### 2. 授予权限

**接口：** `Set-MemoryPermissions(taskId, targetAgentId, permissions, grantingAgentId)`

```powershell
$result = Set-MemoryPermissions -taskId "task-001" `
    -targetAgentId "agent-writer-001" `
    -permissions @("read", "write") `
    -grantingAgentId "main-agent"
```

**响应：**
```json
{
  "success": true,
  "message": "Permissions granted",
  "targetAgent": "agent-writer-001",
  "permissions": ["read", "write"]
}
```

---

### 3. 写入记忆

**接口：** `Write-Memory(taskId, key, value, agentId, expectedVersion?)`

**请求：**
```powershell
$result = Write-Memory -taskId "task-001" `
    -key "world-setting" `
    -value @{"era": "2077", "location": "北京"} `
    -agentId "agent-world-001"
```

**处理流程：**
```
1. 验证任务是否存在
2. 验证 Agent 权限（是否有 write/admin 权限）
3. 检查 expectedVersion（乐观锁）
   - 指定且不匹配 → VERSION_CONFLICT
   - 不指定 → 继续
4. 保存当前版本到历史
5. 更新 data[key]
6. 递增版本号
7. 原子写入文件
8. 返回成功
```

**响应：**
```json
{
  "success": true,
  "message": "Write successful",
  "key": "world-setting",
  "version": 2,
  "isNewKey": false
}
```

---

### 4. 读取记忆

**接口：** `Read-Memory(taskId, key?, agentId, includeMetadata?)`

**请求：**
```powershell
# 读取单个 key
$result = Read-Memory -taskId "task-001" -key "world-setting" -agentId "agent-outline-001"

# 读取全部
$result = Read-Memory -taskId "task-001" -agentId "agent-writer-001" -includeMetadata
```

**响应（单个 key）：**
```json
{
  "success": true,
  "key": "world-setting",
  "value": {"era": "2077", "location": "北京"},
  "version": 2,
  "createdBy": "agent-world-001",
  "createdAt": "2026-04-07T09:05:00Z",
  "updatedBy": "agent-world-001",
  "updatedAt": "2026-04-07T10:20:00Z"
}
```

---

### 5. 列出所有键

**接口：** `List-MemoryKeys(taskId, agentId)`

**响应：**
```json
{
  "success": true,
  "keys": [
    {"key": "world-setting", "version": 2, "updatedAt": "...", "updatedBy": "agent-world-001"},
    {"key": "outline", "version": 1, "updatedAt": "...", "updatedBy": "agent-outline-001"}
  ],
  "count": 2
}
```

---

### 6. 删除 Key

**接口：** `Delete-MemoryKey(taskId, key, agentId)`

**注意：** 删除前会先归档，删除的数据可恢复

**响应：**
```json
{
  "success": true,
  "message": "Key deleted and archived",
  "key": "temp-data",
  "archived": true
}
```

---

### 7. 获取版本历史

**接口：** `Get-MemoryHistory(taskId, key, agentId)`

**响应：**
```json
{
  "success": true,
  "key": "outline",
  "history": [
    {
      "version": 1,
      "value": {...},
      "createdBy": "agent-outline-001",
      "createdAt": "2026-04-07T09:15:00Z"
    },
    {
      "version": 2,
      "value": {...},
      "createdBy": "agent-main",
      "createdAt": "2026-04-07T10:20:00Z",
      "isCurrent": true
    }
  ],
  "totalVersions": 2
}
```

---

### 8. 回滚到指定版本

**接口：** `Rollback-MemoryKey(taskId, key, version, agentId)`

**说明：** 非破坏性回滚，会创建新版本

**请求：**
```powershell
$result = Rollback-MemoryKey -taskId "task-001" -key "outline" -version 1 -agentId "main-agent"
```

**处理流程：**
```
1. 验证任务和 key 存在
2. 验证指定版本存在于历史
3. 保存当前版本到历史
4. 创建新版本，内容为历史版本数据
5. 原子写入
```

**响应：**
```json
{
  "success": true,
  "message": "Rollback successful",
  "key": "outline",
  "newVersion": 3,
  "rolledBackTo": 1
}
```

---

### 9. 删除整个记忆

**接口：** `Remove-Memory(taskId, agentId)`

**注意：** 需要 admin 权限，会先归档再删除

**响应：**
```json
{
  "success": true,
  "message": "Memory removed and archived",
  "taskId": "task-001",
  "archivedTo": "archives/task-001-full-20260407-103000.json"
}
```

---

## 并发控制

### 文件锁机制

```
获取锁（原子操作）：
1. 尝试创建 .lock 文件（NoClobber）
2. 若已存在：
   - 检查 expiresAt 是否超时
   - 超时 → 强制获取
   - 未超时 → 等待重试
3. 成功 → 返回锁信息
4. 超时 → 返回 LOCK_TIMEOUT
```

### 乐观锁（版本冲突检测）

```powershell
# 写入时指定期望版本
Write-Memory -taskId "xxx" -key "settings" `
    -value $newValue -agentId "agent-01" `
    -expectedVersion 3

# 返回 VERSION_CONFLICT 如果当前版本 != 3
```

---

## 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `TASK_NOT_FOUND` | 任务不存在 | 检查 task-id |
| `KEY_NOT_FOUND` | 键不存在 | 检查 key 名称 |
| `PERMISSION_DENIED` | 无权限 | 申请权限或使用其他 Agent |
| `VERSION_CONFLICT` | 版本冲突 | 读取最新版本后重试 |
| `LOCK_TIMEOUT` | 锁超时 | 等待或强制获取 |
| `INVALID_PARAMETER` | 参数无效 | 检查输入参数 |
| `DISK_FULL` | 磁盘空间不足 | 清理空间 |

---

## 使用示例

### 完整工作流

```powershell
$taskId = "sci-fi-001"
$mainAgent = "main-agent"
$worldAgent = "world-agent"
$writerAgent = "writer-agent"

# 1. 初始化
Initialize-Memory -taskId $taskId -ownerAgent $mainAgent

# 2. 授予权限
Set-MemoryPermissions -taskId $taskId -targetAgentId $worldAgent `
    -permissions @("read", "write") -grantingAgentId $mainAgent

# 3. 写入
Write-Memory -taskId $taskId -key "settings" `
    -value @{era="2077"; location="北京"} -agentId $worldAgent

# 4. 读取
$settings = (Read-Memory -taskId $taskId -key "settings" -agentId $writerAgent).value

# 5. 回滚（如需要）
Rollback-MemoryKey -taskId $taskId -key "settings" -version 1 -agentId $mainAgent

# 6. 清理
Remove-Memory -taskId $taskId -agentId $mainAgent
```

---

## 实现状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 基础读写 | ✅ 完成 | v1.0 |
| 并发锁 | ✅ 完成 | v1.0 |
| 版本控制 | ✅ 完成 | v1.1 |
| 权限系统 | ✅ 完成 | v1.1 |
| 原子操作 | ✅ 完成 | v1.1 |
| 回滚机制 | ✅ 完成 | v1.1 |
| 访问日志 | ✅ 完成 | v1.1 |
| 归档清理 | ✅ 完成 | v1.1 |

---

## 下一步计划

1. **性能优化**：内存缓存减少 IO
2. **批量操作**：减少锁竞争
3. **分布式支持**：跨节点记忆共享
4. **监控告警**：容量和性能监控

---

*协议版本：1.1*  
*最后更新：2026-04-07*
