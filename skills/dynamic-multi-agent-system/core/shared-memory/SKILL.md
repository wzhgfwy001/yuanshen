# Shared Memory - 共享记忆层

**版本：** 1.0.0  
**类型：** 核心模块  
**依赖：** 无  

---

## 📖 简介

共享记忆层为多 Agent 协作提供**统一的信息共享平台**，避免信息孤岛和重复工作。

### 核心功能

- 🧠 **共享存储** - 多 Agent 读写同一任务的记忆数据
- 🔒 **并发控制** - 读写锁机制避免冲突
- 💾 **持久化** - JSON 文件存储，任务完成后清理
- 📊 **访问追踪** - 记录所有读写操作

---

## 🎬 使用示例

### 示例 1：写入记忆

```powershell
# Agent 1：世界观设计师
$settings = @{
    time = "2077 年"
    location = "北京"
    style = "温暖治愈"
    technology = "高度发达但传统保留"
}

Write-SharedMemory -taskId "task-001" -section "settings" -data $settings -agent "agent-01"
```

### 示例 2：读取记忆

```powershell
# Agent 2：大纲规划师
$memory = Read-SharedMemory -taskId "task-001" -agent "agent-02"

# 读取特定部分
$settings = Get-MemorySection -taskId "task-001" -section "settings"
```

### 示例 3：更新记忆

```powershell
# Agent 2：写入大纲
$outline = @{
    act1 = "清晨的豆汁儿店"
    act2 = "偶遇老同学"
    act3 = "回忆与未来"
}

Update-SharedMemory -taskId "task-001" -section "outline" -data $outline -agent "agent-02"
```

### 示例 4：完整工作流

```powershell
# 任务：写一篇科幻小说

# 1. 初始化记忆
Initialize-Memory -taskId "task-001"

# 2. Agent 1：设定世界观
Write-SharedMemory -taskId "task-001" -section "settings" -data $settings -agent "agent-01"

# 3. Agent 2：读取设定，创建大纲
$settings = Read-SharedMemory -taskId "task-001" -agent "agent-02"
$outline = Create-Outline -basedOn $settings
Update-SharedMemory -taskId "task-001" -section "outline" -data $outline -agent "agent-02"

# 4. Agent 3：读取全部，开始写作
$memory = Read-SharedMemory -taskId "task-001" -agent "agent-03"
$story = Write-Story -settings $memory.settings -outline $memory.outline

# 5. 任务完成，清理记忆
Remove-SharedMemory -taskId "task-001"
```

---

## 🔧 API 参考

### 初始化记忆

```powershell
Initialize-Memory -taskId <string> [-metadata <hashtable>]
```

**参数：**
- `taskId` - 任务 ID（必填）
- `metadata` - 元数据（可选）

**示例：**
```powershell
Initialize-Memory -taskId "task-001" -metadata @{
    createdAt = Get-Date
    taskType = "sci-fi-writing"
}
```

---

### 写入记忆

```powershell
Write-SharedMemory -taskId <string> -section <string> -data <hashtable> -agent <string>
```

**参数：**
- `taskId` - 任务 ID
- `section` - 记忆部分（settings/outline/characters 等）
- `data` - 数据（hashtable）
- `agent` - Agent ID

**示例：**
```powershell
Write-SharedMemory -taskId "task-001" -section "settings" -data @{
    time = "2077 年"
    location = "北京"
} -agent "agent-01"
```

---

### 读取记忆

```powershell
Read-SharedMemory -taskId <string> [-agent <string>] [-section <string>]
```

**参数：**
- `taskId` - 任务 ID
- `agent` - Agent ID（用于日志）
- `section` - 指定部分（不传则返回全部）

**示例：**
```powershell
# 读取全部
$memory = Read-SharedMemory -taskId "task-001" -agent "agent-02"

# 读取特定部分
$settings = Read-SharedMemory -taskId "task-001" -section "settings"
```

---

### 更新记忆

```powershell
Update-SharedMemory -taskId <string> -section <string> -data <hashtable> -agent <string>
```

**参数：** 同 Write-SharedMemory

**说明：** 覆盖指定部分的数据

---

### 删除记忆

```powershell
Remove-SharedMemory -taskId <string>
```

**说明：** 任务完成后清理记忆

---

### 获取访问日志

```powershell
Get-MemoryAccessLog -taskId <string> [-limit <int>]
```

**参数：**
- `taskId` - 任务 ID
- `limit` - 返回条数（默认 10）

**示例：**
```powershell
$log = Get-MemoryAccessLog -taskId "task-001" -limit 20
```

---

## 📁 数据结构

### 记忆文件格式

```json
{
  "taskId": "task-2026-04-07-001",
  "metadata": {
    "createdAt": "2026-04-07T09:00:00Z",
    "taskType": "sci-fi-writing",
    "status": "running"
  },
  "memory": {
    "settings": {
      "time": "2077 年",
      "location": "北京",
      "style": "温暖治愈"
    },
    "outline": {
      "act1": "清晨的豆汁儿店",
      "act2": "偶遇老同学",
      "act3": "回忆与未来"
    },
    "characters": [
      {"name": "李明", "role": "主角"},
      {"name": "王芳", "role": "老同学"}
    ],
    "keyPoints": [
      "传统与科技的融合",
      "人情味不变"
    ]
  },
  "accessLog": [
    {
      "agent": "agent-01",
      "action": "write",
      "section": "settings",
      "timestamp": "2026-04-07T09:05:00Z"
    },
    {
      "agent": "agent-02",
      "action": "read",
      "section": "settings",
      "timestamp": "2026-04-07T09:10:00Z"
    }
  ],
  "lock": {
    "type": "none",
    "holder": null,
    "acquiredAt": null
  }
}
```

---

## 🔒 并发控制

### 读写锁机制

```
读锁（共享）：多个 Agent 可同时读
写锁（排他）：只有一个 Agent 可写，其他只能等待
```

### 获取写锁

```powershell
Acquire-WriteLock -taskId "task-001" -agent "agent-01"
```

### 释放写锁

```powershell
Release-WriteLock -taskId "task-001" -agent "agent-01"
```

### 超时释放

写锁超过 5 分钟自动释放，避免死锁。

---

## 📊 性能指标

| 操作 | 目标时间 | 实际时间 |
|------|----------|----------|
| 初始化记忆 | <50ms | - |
| 写入记忆 | <100ms | - |
| 读取记忆 | <100ms | - |
| 获取锁 | <50ms | - |
| 删除记忆 | <50ms | - |

---

## ⚠️ 注意事项

### 大小限制

- 单个记忆文件 ≤ 1MB
- 超过限制时告警
- 建议分块存储大数据

### 清理策略

- 任务完成后立即清理
- 失败任务保留 24h
- 定期清理孤儿文件（>7 天）

### 错误处理

- 文件不存在 → 返回 null
- 锁冲突 → 等待或返回错误
- 写入失败 → 回滚并告警

---

## 🧪 单元测试

### 测试用例

```powershell
# 1. 初始化测试
Test-Initialize-Memory

# 2. 读写测试
Test-Write-Read-Memory

# 3. 并发测试
Test-Concurrent-Access

# 4. 锁机制测试
Test-Lock-Mechanism

# 5. 清理测试
Test-Cleanup
```

---

## 📝 更新日志

### v1.0.0 (2026-04-07)

- ✅ 初始版本
- ✅ 基础读写 API
- ✅ 并发锁机制
- ✅ JSON 文件存储
- ✅ 访问日志

---

**创建时间：** 2026-04-07  
**维护人：** 开发团队  
**状态：** 🟢 开发完成
