---
name: shared-memory
description: 混合动态多Agent协作系统核心模块 - 共享记忆层协议，支持多Agent统一信息共享、版本控制、权限管理
parent: dynamic-multi-agent-system
version: 1.4.0
---

# Shared Memory Protocol v1.4

## 核心功能

| 功能 | 说明 |
|------|------|
| 🧠 共享存储 | 多 Agent 读写同一任务的记忆数据 |
| 🔒 并发控制 | 文件锁 + 乐观锁机制避免冲突 |
| 💾 版本控制 | 每次修改保留历史，支持回滚 |
| 👥 权限管理 | 基于角色的访问控制 (RBAC) |
| ⚡ 原子操作 | 写入原子替换，保证一致性 |

---

## 权限级别

| 权限 | 说明 | 适用场景 |
|------|------|----------|
| `read` | 读取记忆数据 | 所有子 Agent |
| `write` | 写入/修改记忆 | 创作类 Agent |
| `delete` | 删除特定 Key | 主 Agent、审查员 |
| `admin` | 完全控制 | 主 Agent |

---

## 存储结构

```
state/
└── shared-memories/
    ├── {task-id}.json           # 主记忆文件
    ├── {task-id}.lock           # 文件锁
    └── {task-id}-history/       # 版本历史
```

---

## 快速使用

```powershell
# 初始化
Initialize-Memory -taskId "task-001" -ownerAgent "main-agent"

# 写入
Write-Memory -taskId "task-001" -key "settings" -value @{era="2077"} -agentId "agent-01"

# 读取
$result = Read-Memory -taskId "task-001" -key "settings" -agentId "agent-01"

# 授予权限
Set-MemoryPermissions -taskId "task-001" -targetAgentId "agent-writer" -permissions @("read", "write") -grantingAgentId "main-agent"

# 回滚
Rollback-MemoryKey -taskId "task-001" -key "settings" -version 1 -agentId "main-agent"

# 清理
Remove-Memory -taskId "task-001" -agentId "main-agent"
```

**完整 API 参考：** [references/API-REFERENCE.md](references/API-REFERENCE.md)

---

## 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| TASK_NOT_FOUND | 任务不存在 | 检查 task-id |
| KEY_NOT_FOUND | 键不存在 | 检查 key 名称 |
| PERMISSION_DENIED | 无权限 | 申请权限 |
| VERSION_CONFLICT | 版本冲突 | 读取最新版本后重试 |
| LOCK_TIMEOUT | 锁超时 | 等待或强制获取 |

---

## 最佳实践

### ✅ 推荐
1. **及时清理** - 任务完成后调用 `Remove-Memory`
2. **权限最小化** - 仅授予必要的权限
3. **批量写入** - 多个小写入合并为一个
4. **版本检查** - 重要操作使用乐观锁

### ❌ 避免
1. **权限过大** - 不要给所有 Agent admin 权限
2. **忘记清理** - 遗留数据占用空间
3. **大文件** - 单个记忆文件建议 ≤ 1MB

---

*详细 API 和工作流示例见 references/API-REFERENCE.md*
