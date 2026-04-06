---
name: shared-memory
description: 混合动态多Agent协作系统核心模块 - 共享记忆层协议，支持多Agent统一信息共享、版本控制、权限管理、原子操作
parent: dynamic-multi-agent-system
version: 1.3.0
---

# Shared Memory Protocol v1.1 - 共享记忆层协议

**版本：** 1.1.0  
**类型：** 核心基础设施模块  
**依赖：** 无  
**状态：** 🟢 增强完成

---

## 📖 简介

共享记忆层为多 Agent 协作提供**统一的信息共享平台**，是系统的核心基础设施。

### 核心功能 (v1.1)

| 功能 | 说明 | 状态 |
|------|------|------|
| 🧠 **共享存储** | 多 Agent 读写同一任务的记忆数据 | ✅ |
| 🔒 **并发控制** | 文件锁 + 乐观锁机制避免冲突 | ✅ |
| 💾 **版本控制** | 每次修改保留历史，支持回滚 | ✅ |
| 👥 **权限管理** | 基于角色的访问控制 (RBAC) | ✅ |
| 📊 **访问追踪** | 完整操作日志记录 | ✅ |
| ⚡ **原子操作** | 写入原子替换，保证一致性 | ✅ |
| 🔄 **回滚机制** | 任意版本回滚，非破坏性 | ✅ |

---

## 架构设计

### 存储结构

```
state/
└── shared-memories/
    ├── {task-id}.json           # 主记忆文件
    ├── {task-id}.lock           # 文件锁
    ├── {task-id}-history/        # 版本历史目录
    │   └── {key}/
    │       ├── v1.json
    │       ├── v2.json
    │       └── ...
    └── archives/                 # 删除归档
        └── {task-id}-{key}-*.json
```

### 记忆文件格式

```json
{
  "taskId": "task-2026-04-07-001",
  "createdAt": "2026-04-07T09:00:00Z",
  "updatedAt": "2026-04-07T10:30:00Z",
  "status": "running",
  "metadata": {
    "taskType": "sci-fi-writing",
    "description": "创作科幻短篇小说"
  },
  "data": {
    "settings": {
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
      "key": "settings",
      "version": 1,
      "timestamp": "2026-04-07T09:05:00Z"
    }
  ]
}
```

---

## 权限系统

### 权限级别

| 权限 | 说明 | 适用场景 |
|------|------|----------|
| `read` | 读取记忆数据 | 所有子 Agent |
| `write` | 写入/修改记忆 | 创作类 Agent |
| `delete` | 删除特定 Key | 主 Agent、审查员 |
| `admin` | 完全控制 | 主 Agent |

### 权限继承规则

```
任务创建时：
- 主 Agent：自动获得 admin 权限
- 子 Agent：需要显式授予 read/write 权限
- 审查 Agent：授予 read + write 权限

默认权限策略：
- 子 Agent 自动继承任务的 read 权限
- write 权限需要显式授予
- 删除权限仅限主 Agent
```

### 权限验证流程

```
每次操作前：
1. 读取 memory.json 中的 permissions
2. 检查 agentId 是否有对应权限
3. 无权限 → 返回 PERMISSION_DENIED
4. 有权限 → 继续执行操作
```

---

## 并发控制

### 文件锁机制

```
获取锁：
1. 尝试原子创建 .lock 文件
2. 若已存在，检查过期时间
3. 超时（5分钟）→ 强制获取
4. 未超时 → 等待重试

释放锁：
1. 检查锁持有者是否匹配
2. 匹配 → 删除锁文件
3. 不匹配 → 拒绝释放
```

### 乐观锁 (版本冲突检测)

```powershell
# 写入时指定期望版本
$result = Write-Memory -taskId "xxx" -key "settings" `
    -value $newValue -agentId "agent-01" `
    -expectedVersion 3

# 若当前版本 != 3，返回 VERSION_CONFLICT
if (-not $result.success -and $result.error -eq "VERSION_CONFLICT") {
    # 读取最新版本后重试
    $latest = Read-Memory -taskId "xxx" -key "settings"
}
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

## API 参考

### 初始化记忆

```powershell
$result = Initialize-Memory -taskId "task-001" `
    -metadata @{taskType="sci-fi-writing"; description="创作任务"} `
    -ownerAgent "main-agent"

# 响应
# {
#   "success": true,
#   "message": "Memory initialized successfully",
#   "taskId": "task-001",
#   "createdAt": "2026-04-07T09:00:00Z"
# }
```

### 授予权限

```powershell
$result = Set-MemoryPermissions `
    -taskId "task-001" `
    -targetAgentId "agent-writer-001" `
    -permissions @("read", "write") `
    -grantingAgentId "main-agent"

# 响应
# {
#   "success": true,
#   "targetAgent": "agent-writer-001",
#   "permissions": ["read", "write"]
# }
```

### 写入记忆

```powershell
$result = Write-Memory `
    -taskId "task-001" `
    -key "settings" `
    -value @{era="2077"; location="北京"} `
    -agentId "agent-world-001"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "version": 1,
#   "isNewKey": true
# }
```

### 读取记忆

```powershell
# 读取单个 key
$result = Read-Memory -taskId "task-001" -key "settings" -agentId "agent-writer-001"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "value": {"era": "2077", "location": "北京"},
#   "version": 2,
#   "updatedBy": "agent-world-001",
#   "updatedAt": "2026-04-07T10:00:00Z"
# }

# 读取全部
$result = Read-Memory -taskId "task-001" -agentId "agent-writer-001" -includeMetadata
```

### 列出所有 Key

```powershell
$result = List-MemoryKeys -taskId "task-001" -agentId "agent-writer-001"

# 响应
# {
#   "success": true,
#   "keys": [
#     {"key": "settings", "version": 2, "updatedAt": "..."},
#     {"key": "outline", "version": 1, "updatedAt": "..."}
#   ],
#   "count": 2
# }
```

### 获取版本历史

```powershell
$result = Get-MemoryHistory -taskId "task-001" -key "settings" -agentId "agent-writer-001"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "history": [
#     {"version": 1, "value": {...}, "createdBy": "agent-01"},
#     {"version": 2, "value": {...}, "createdBy": "agent-01", "isCurrent": true}
#   ],
#   "totalVersions": 2
# }
```

### 回滚到指定版本

```powershell
$result = Rollback-MemoryKey `
    -taskId "task-001" `
    -key "settings" `
    -version 1 `
    -agentId "main-agent"

# 响应
# {
#   "success": true,
#   "key": "settings",
#   "newVersion": 3,
#   "rolledBackTo": 1,
#   "message": "Rollback successful"
# }
```

### 删除 Key

```powershell
$result = Delete-MemoryKey -taskId "task-001" -key "temp-data" -agentId "main-agent"

# 响应
# {
#   "success": true,
#   "key": "temp-data",
#   "archived": true
# }
```

### 删除整个记忆

```powershell
$result = Remove-Memory -taskId "task-001" -agentId "main-agent"

# 响应
# {
#   "success": true,
#   "taskId": "task-001",
#   "archivedTo": "archives/task-001-full-20260407-103000.json"
# }
```

---

## 使用示例

### 完整工作流

```powershell
# 任务：写一篇科幻小说

$taskId = "sci-fi-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$mainAgent = "main-agent"
$worldAgent = "world-agent"
$outlineAgent = "outline-agent"
$writerAgent = "writer-agent"

# 1. 主 Agent 初始化记忆
Initialize-Memory -taskId $taskId -ownerAgent $mainAgent

# 2. 授予子 Agent 权限
Set-MemoryPermissions -taskId $taskId -targetAgentId $worldAgent `
    -permissions @("read", "write") -grantingAgentId $mainAgent
Set-MemoryPermissions -taskId $taskId -targetAgentId $outlineAgent `
    -permissions @("read", "write") -grantingAgentId $mainAgent
Set-MemoryPermissions -taskId $taskId -targetAgentId $writerAgent `
    -permissions @("read", "write") -grantingAgentId $mainAgent

# 3. Agent 1：世界观设计师写入设定
Write-Memory -taskId $taskId -key "settings" -value @{
    era = "2077"
    location = "北京"
    techLevel = "fusion-power"
    socialSystem = "post-scarcity"
} -agentId $worldAgent

# 4. Agent 2：大纲规划师读取设定，设计大纲
$settings = (Read-Memory -taskId $taskId -key "settings" -agentId $outlineAgent).value
$outline = @{
    act1 = @{title="清晨的豆汁儿店"; desc="传统生活的延续"}
    act2 = @{title="偶遇老同学"; desc="科技与人情的碰撞"}
    act3 = @{title="回忆与未来"; desc="传统与科技的融合"}
}
Write-Memory -taskId $taskId -key "outline" -value $outline -agentId $outlineAgent

# 5. Agent 3：小说作家读取全部，开始写作
$allData = Read-Memory -taskId $taskId -agentId $writerAgent
$chapter1 = "第一章的故事内容..."
Write-Memory -taskId $taskId -key "chapter-1" -value $chapter1 -agentId $writerAgent

# 6. 检查版本历史
$history = Get-MemoryHistory -taskId $taskId -key "settings" -agentId $mainAgent

# 7. 任务完成，清理
Remove-Memory -taskId $taskId -agentId $mainAgent
```

### 错误处理示例

```powershell
# 尝试写入无权限的 key
$result = Write-Memory -taskId "task-001" -key "admin-only" `
    -value @{secret = "data"} -agentId "no-perm-agent"

if (-not $result.success) {
    switch ($result.error) {
        "PERMISSION_DENIED" {
            Write-Host "需要申请权限"
        }
        "VERSION_CONFLICT" {
            Write-Host "版本冲突，需要先读取最新"
        }
        "TASK_NOT_FOUND" {
            Write-Host "任务不存在"
        }
    }
}
```

---

## 性能指标

| 操作 | 目标时间 | 说明 |
|------|----------|------|
| 初始化记忆 | <50ms | 创建文件和目录 |
| 写入记忆 | <100ms | 含锁获取、版本保存 |
| 读取记忆 | <50ms | 仅文件读取 |
| 锁定获取 | <50ms | 锁竞争时最长等待 5s |
| 删除记忆 | <100ms | 含归档操作 |

---

## 注意事项

### 大小限制

- 单个记忆文件建议 ≤ 1MB
- 超过限制时告警
- 历史版本最多保留 10 个

### 清理策略

- 任务完成后立即清理
- 删除数据自动归档
- 归档文件保留 7 天后清理

### 最佳实践

1. **及时清理**：任务完成后调用 `Remove-Memory`
2. **权限最小化**：仅授予必要的权限
3. **批量写入**：多个小写入合并为一个
4. **版本检查**：重要操作使用乐观锁
5. **异常恢复**：利用版本历史恢复误删数据

---

## 🧪 测试

```powershell
# 加载模块
Import-Module (Join-Path $PSScriptRoot "memory-protocol.ps1") -Force

# 运行测试
Test-SharedMemoryProtocol
```

### 测试用例

| 测试 | 说明 |
|------|------|
| Test 1 | 初始化记忆 |
| Test 2 | 授予权限 |
| Test 3-4 | 写入记忆（版本递增） |
| Test 5 | 读取记忆 |
| Test 6 | 列出所有 Key |
| Test 7 | 获取版本历史 |
| Test 8-9 | 回滚机制 |
| Test 10 | 权限拒绝 |

---

## 📝 更新日志

### v1.1.0 (2026-04-07)

- ✅ **版本控制**：每次修改保留历史，支持回滚
- ✅ **权限系统**：完整的 RBAC 权限管理
- ✅ **原子操作**：文件锁 + 乐观锁保证一致性
- ✅ **回滚机制**：任意版本非破坏性回滚
- ✅ **错误码**：统一的错误处理规范
- ✅ **访问日志**：完整的操作审计追踪

### v1.0.0 (2026-04-07)

- ✅ 基础读写 API
- ✅ 并发锁机制
- ✅ JSON 文件存储

---

**创建时间：** 2026-04-07  
**维护人：** 开发团队  
**协议版本：** v1.1
