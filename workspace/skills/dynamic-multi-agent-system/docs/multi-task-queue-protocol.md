# 多任务队列管理器协议 v1.1

## 概述

多任务队列管理器负责系统的并发控制和资源调度，确保：
- ✅ 最多 3 个主任务并行执行
- ✅ 最多 12 个子 Agent 同时运行
- ✅ 任务优先级调度（P0-P4）
- ✅ 任务依赖管理
- ✅ 任务分组和批量操作
- ✅ 超时和重试机制
- ✅ 事件系统通知
- ✅ 资源公平分配

**当前实现版本：** v1.1  
**协议最后更新：** 2026-04-07

---

## 核心概念

### 任务状态

| 状态 | 说明 |
|------|------|
| `waiting` | 等待调度执行 |
| `blocked` | 等待依赖任务完成 |
| `running` | 正在执行 |
| `suspended` | 已暂停 |
| `completed` | 成功完成 |
| `failed` | 失败（可重试） |
| `cancelled` | 已取消 |

### 优先级定义

| 优先级 | 标识 | 最大Agent | 超时倍数 | 说明 |
|--------|------|-----------|----------|------|
| P0 | 紧急 | 8 | 2.0x | 立即执行，可抢占资源 |
| P1 | 高 | 6 | 1.5x | 优先调度 |
| P2 | 中 | 4 | 1.0x | 正常调度（默认） |
| P3 | 低 | 2 | 0.8x | 资源紧张时暂停 |
| P4 | 空闲 | 1 | 0.5x | 仅空闲时执行 |

---

## 任务结构

```json
{
  "taskId": "task-001",
  "priority": "P2",
  "taskType": "sci-fi-writing",
  "allocatedAgents": 4,
  "maxAgents": 4,
  "timeout": 3600,
  "createdAt": "2026-04-07T09:00:00Z",
  "status": "waiting",
  "retryCount": 0,
  "maxRetries": 3,
  "description": "创作科幻小说",
  "groupId": "novel-001",
  "dependencies": ["task-000"],
  "progress": 0,
  "currentStage": "",
  "stages": [
    {
      "name": "outline",
      "description": "创建大纲",
      "startedAt": "2026-04-07T09:10:00Z",
      "completedAt": "2026-04-07T09:15:00Z",
      "result": { "outlineLength": 1500 }
    }
  ]
}
```

---

## API 协议

### 1. 添加任务

**接口：** `Add-TaskToQueue(taskId, priority, taskType, estimatedAgents, dependsOn, groupId, description)`

```powershell
$result = Add-TaskToQueue `
    -taskId "task-001" `
    -priority "P2" `
    -taskType "sci-fi-writing" `
    -estimatedAgents 4 `
    -dependsOn @("task-000") `
    -groupId "novel-001" `
    -description "创作第一章"
```

**响应：**
```json
{
  "success": true,
  "taskId": "task-001",
  "status": "waiting",
  "priority": "P2",
  "allocatedAgents": 4,
  "queuePosition": 2,
  "createdAt": "2026-04-07T09:00:00Z"
}
```

---

### 2. 批量添加任务

**接口：** `Add-TaskBatch(tasks[])`

```powershell
$batch = @(
    @{taskId="ch-001"; priority="P2"; taskType="writing"; estimatedAgents=2}
    @{taskId="ch-002"; priority="P2"; taskType="writing"; estimatedAgents=2}
)
$result = Add-TaskBatch -tasks $batch
```

**响应：**
```json
{
  "submitted": 2,
  "failed": 0,
  "results": [...]
}
```

---

### 3. 任务依赖管理

```powershell
# 查看依赖状态
$deps = Get-TaskDependencies -taskId "task-003"

# 响应
{
  "taskId": "task-003",
  "dependencies": [
    { "taskId": "task-001", "status": "completed" },
    { "taskId": "task-002", "status": "running" }
  ],
  "allSatisfied": false
}
```

---

### 4. 任务分组

```powershell
# 查看组状态
$group = Get-TaskGroup -groupId "novel-001"

# 响应
{
  "groupId": "novel-001",
  "total": 10,
  "statusCounts": {
    "running": 2,
    "waiting": 5,
    "completed": 3,
    "failed": 0
  },
  "tasks": [...]
}

# 取消整个组
$result = Cancel-TaskGroup -groupId "novel-001"
```

---

### 5. 进度追踪

```powershell
# 添加阶段
Add-TaskStage -taskId "task-001" -stage @{
    name = "outline"
    description = "创建大纲"
}

# 更新进度
Update-TaskProgress -taskId "task-001" -progress 0.5 -currentStage "writing"

# 完成阶段
Complete-TaskStage -taskId "task-001" -stageName "outline"
```

---

### 6. 查询任务状态

**接口：** `Get-TaskStatus(taskId)`

```powershell
$status = Get-TaskStatus -taskId "task-001"

# 响应
{
  "success": true,
  "task": {
    "taskId": "task-001",
    "status": "running",
    "priority": "P2",
    "progress": 0.6,
    "currentStage": "writing",
    "allocatedAgents": 4,
    "createdAt": "...",
    "startedAt": "..."
  },
  "availableAgents": 4
}
```

---

### 7. 查询队列状态

**接口：** `Get-QueueStatus()`

```powershell
$status = Get-QueueStatus

# 响应
{
  "version": "1.1",
  "running": {
    "count": 2,
    "peak": 3
  },
  "waiting": {
    "count": 5,
    "byPriority": { "P0": 1, "P1": 2, "P2": 2 }
  },
  "blocked": {
    "count": 1
  },
  "limits": {
    "maxConcurrentTasks": 3,
    "maxTotalAgents": 12,
    "currentAgents": 8,
    "availableAgents": 4
  },
  "stats": {
    "totalSubmitted": 15,
    "totalCompleted": 12,
    "totalFailed": 1
  }
}
```

---

### 8. 事件系统

```powershell
# 注册事件
Register-EventHandler -event "onTaskCompleted" -handler {
    param($data)
    Write-Host "Task $($data.taskId) completed in $($data.duration)s"
}

# 事件类型
# - onTaskStarted
# - onTaskCompleted
# - onTaskFailed
# - onTaskPaused
# - onTaskResumed
# - onQueueFull
# - onResourceAlert
```

---

### 9. 调度器控制

```powershell
# 启动调度器
Start-TaskScheduler -intervalSeconds 5

# 手动触发调度
$result = Invoke-SchedulerTick

# 停止调度器
Stop-TaskScheduler

# 检查超时
$timedOut = Check-TaskTimeouts
```

---

## 调度算法

### 优先级计算

```powershell
# 综合考虑：
# 1. 基础优先级权重
# 2. 等待时间（防止饥饿）
$score = $priorityWeight + ($waitMinutes / 60) * 0.1
```

### 调度流程

```
1. 检查运行中任务状态
2. 清理已完成/失败任务
3. 检查 blocked 任务依赖
4. 按优先级排序 waiting 队列
5. 尝试启动新任务（检查资源）
6. 处理超时任务
```

---

## 实现状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 基础队列 | ✅ 完成 | v1.0 |
| 优先级调度 | ✅ 完成 | v1.0 |
| 资源管理 | ✅ 完成 | v1.0 |
| 超时重试 | ✅ 完成 | v1.0 |
| 任务依赖 | ✅ 完成 | v1.1 |
| 任务分组 | ✅ 完成 | v1.1 |
| 批量操作 | ✅ 完成 | v1.1 |
| 进度追踪 | ✅ 完成 | v1.1 |
| 事件系统 | ✅ 完成 | v1.1 |

---

## 下一步

1. **资源抢占** - 高优先级任务抢占低优先级资源
2. **负载均衡** - 根据系统负载动态调整
3. **分布式支持** - 跨节点队列支持
4. **预测调度** - 基于历史数据预测执行时间

---

*协议版本：1.1*  
*最后更新：2026-04-07*
