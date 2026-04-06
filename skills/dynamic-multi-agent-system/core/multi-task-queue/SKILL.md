---
name: multi-task-queue
description: 混合动态多Agent协作系统核心模块 - 多任务队列管理器，支持任务依赖、分组、批量操作、事件系统、进度追踪
parent: dynamic-multi-agent-system
version: 1.3.0
---

# Multi-Task Queue Manager v1.1 - 多任务队列管理器

**版本：** 1.1.0  
**类型：** 核心模块  
**依赖：** 无  
**状态：** 🟢 增强完成

---

## 📖 简介

多任务队列管理器负责**管理并发任务的执行队列**，合理分配资源，支持任务依赖和分组。

### 核心功能 (v1.1)

| 功能 | 说明 | 状态 |
|------|------|------|
| 🎯 **任务排队** | 按优先级管理任务队列 | ✅ |
| 🚦 **并发控制** | 限制最多 3 个主任务/12 个子 Agent | ✅ |
| ⚡ **智能调度** | 优先级调度 + 资源分配 | ✅ |
| 📊 **队列监控** | 实时查看任务状态 | ✅ |
| 🔗 **任务依赖** | 支持等待其他任务完成 | ✅ 新 |
| 👥 **任务分组** | 批量管理相关任务 | ✅ 新 |
| 📦 **批量操作** | 一次提交多个任务 | ✅ 新 |
| 📝 **进度追踪** | 分阶段进度跟踪 | ✅ 新 |
| 🔔 **事件系统** | 任务状态变化通知 | ✅ 新 |
| ⚠️ **超时处理** | 自动处理超时任务 | ✅ |

---

## 优先级

| 优先级 | 标识 | 最大Agent | 超时倍数 | 说明 |
|--------|------|-----------|----------|------|
| **P0** | 紧急 | 8 | 2.0x | 立即执行 |
| **P1** | 高 | 6 | 1.5x | 优先调度 |
| **P2** | 中 | 4 | 1.0x | 正常调度 |
| **P3** | 低 | 2 | 0.8x | 资源紧张时暂停 |
| **P4** | 空闲 | 1 | 0.5x | 仅空闲时执行 |

---

## API 参考

### 添加任务

```powershell
$result = Add-TaskToQueue `
    -taskId "task-001" `
    -priority "P2" `
    -taskType "sci-fi-writing" `
    -estimatedAgents 4 `
    -dependsOn @("task-000") `
    -groupId "novel-project" `
    -description "创作第一章"

# 响应
# {
#   success = true
#   taskId = "task-001"
#   status = "waiting" 或 "blocked"
#   priority = "P2"
#   allocatedAgents = 4
#   queuePosition = 2
# }
```

### 批量添加任务

```powershell
$batch = @(
    @{taskId="ch-001"; priority="P2"; taskType="writing"; estimatedAgents=2}
    @{taskId="ch-002"; priority="P2"; taskType="writing"; estimatedAgents=2}
    @{taskId="ch-003"; priority="P2"; taskType="writing"; estimatedAgents=2}
)
$result = Add-TaskBatch -tasks $batch

# 响应: { submitted = 3, failed = 0, results = [...] }
```

### 任务依赖

```powershell
# 任务2依赖任务1完成
Add-TaskToQueue -taskId "task-2" -priority "P1" -dependsOn @("task-1")

# 任务3依赖任务1和任务2都完成
Add-TaskToQueue -taskId "task-3" -priority "P1" -dependsOn @("task-1", "task-2")

# 查看依赖状态
$deps = Get-TaskDependencies -taskId "task-3"
```

### 任务分组

```powershell
# 添加到组
Add-TaskToQueue -taskId "ch-01" -priority "P2" -groupId "novel-001"
Add-TaskToQueue -taskId "ch-02" -priority "P2" -groupId "novel-001"

# 查看组状态
$group = Get-TaskGroup -groupId "novel-001"
# { total: 2, statusCounts: { running: 1, waiting: 1 } }

# 取消整个组
Cancel-TaskGroup -groupId "novel-001"
```

### 进度追踪

```powershell
# 添加阶段
Add-TaskStage -taskId "task-001" -stage @{
    name = "outline"
    description = "创建大纲"
}

# 更新进度
Update-TaskProgress -taskId "task-001" -progress 0.3 -currentStage "outline"

# 完成阶段
Complete-TaskStage -taskId "task-001" -stageName "outline" -result @{
    outlineLength = 1500
}
```

### 事件系统

```powershell
# 注册事件处理器
Register-EventHandler -event "onTaskCompleted" -handler {
    param($data)
    Write-Host "Task $($data.taskId) completed!" -ForegroundColor Green
}

Register-EventHandler -event "onTaskFailed" -handler {
    param($data)
    Write-Host "Task $($data.taskId) failed: $($data.error)" -ForegroundColor Red
}
```

### 调度器

```powershell
# 启动调度器
Start-TaskScheduler -intervalSeconds 5

# 手动触发调度
$result = Invoke-SchedulerTick

# 停止调度器
Stop-TaskScheduler
```

### 超时检查

```powershell
# 检查并处理超时任务
$timedOut = Check-TaskTimeouts
```

### 队列状态

```powershell
$status = Get-QueueStatus

# 输出：
# {
#   running: { count: 2, tasks: [...] }
#   waiting: { count: 5, byPriority: { P0: 1, P1: 2, P2: 2 } }
#   blocked: { count: 1, tasks: [...] }
#   limits: { maxConcurrentTasks: 3, currentAgents: 8, availableAgents: 4 }
#   stats: { totalSubmitted: 15, totalCompleted: 12 }
# }
```

### 统计数据

```powershell
$stats = Get-QueueStats

# 输出：
# {
#   total: { submitted: 15, completed: 12, failed: 1, successRate: 0.92 }
#   today: { completed: 5, avgDurationSeconds: 420 }
#   resources: { peakConcurrentTasks: 3, utilizationPercent: 100 }
#   byPriority: { P0: {waiting: 0, running: 1}, P1: {...}, ... }
# }
```

---

## 配置

```powershell
# 查看配置
$config = Get-QueueConfig

# 修改限制
Set-QueueConfig -limitName "maxConcurrentTasks" -value 5

# 可配置的参数：
# - maxConcurrentTasks: 最大并发任务数 (默认 3)
# - maxTotalAgents: 最大 Agent 总数 (默认 12)
# - maxAgentsPerTask: 单任务最大 Agent 数 (默认 6)
# - maxTaskTimeout: 任务超时秒数 (默认 3600)
# - maxSubagentTimeout: 子 Agent 超时秒数 (默认 300)
# - maxRetries: 最大重试次数 (默认 3)
# - maxQueueSize: 队列最大容量 (默认 100)
```

---

## 任务生命周期

```
                    ┌──────────────┐
                    │   waiting    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌──────────┐  ┌─────────┐
        │ blocked │  │ running  │  │  fail   │
        │(pending │  │          │  │(retry)  │
        │ deps)   │  └────┬─────┘  └────┬────┘
        └─────────┘       │             │
              ▲            │             │
              │            ▼             │
              │       ┌──────────┐       │
              │       │completed│       │
              │       └──────────┘       │
              │                         │
              └─────────────────────────┘
                         (retry <= max)
```

---

## 使用示例

### 示例 1：小说创作项目

```powershell
$groupId = "novel-$(Get-Date -Format 'yyyyMMdd')"

# 1. 创建世界观（最先执行）
$worldTask = Add-TaskToQueue `
    -taskId "$groupId-world" `
    -priority "P1" `
    -taskType "worldbuilding" `
    -groupId $groupId

# 2. 大纲（依赖世界观）
$outlineTask = Add-TaskToQueue `
    -taskId "$groupId-outline" `
    -priority "P1" `
    -taskType "outlining" `
    -dependsOn @("$groupId-world") `
    -groupId $groupId

# 3. 各章节（依赖大纲）
1..10 | ForEach-Object {
    Add-TaskToQueue `
        -taskId "$groupId-ch-$_" `
        -priority "P2" `
        -taskType "writing" `
        -dependsOn @("$groupId-outline") `
        -groupId $groupId
}

# 4. 启动调度器
Start-TaskScheduler

# 5. 跟踪进度
$group = Get-TaskGroup -groupId $groupId
Write-Host "进度: $($group.statusCounts.completed)/$($group.total)"
```

### 示例 2：数据分析流水线

```powershell
# P0 紧急任务，可抢占资源
Add-TaskToQueue -taskId "urgent-report" -priority "P0" -taskType "analysis"

# 普通任务
Add-TaskToQueue -taskId "daily-report" -priority "P2" -taskType "analysis"

# 后台任务（仅空闲时执行）
Add-TaskToQueue -taskId "weekly-agg" -priority "P4" -taskType "aggregation"
```

---

## 事件类型

| 事件 | 触发时机 | 数据 |
|------|----------|------|
| `onTaskStarted` | 任务开始执行 | taskId, priority, allocatedAgents |
| `onTaskCompleted` | 任务成功完成 | taskId, priority, duration, result |
| `onTaskFailed` | 任务失败 | taskId, error, reason, retryCount |
| `onTaskPaused` | 任务被暂停 | taskId |
| `onTaskResumed` | 任务恢复执行 | taskId |
| `onQueueFull` | 队列已满 | taskId, queueSize |
| `onResourceAlert` | 资源不足 | currentAgents, availableAgents |

---

## 最佳实践

1. **合理设置优先级** - P0 仅用于真正的紧急任务
2. **使用任务分组** - 方便批量管理和取消
3. **设置任务依赖** - 确保执行顺序正确
4. **注册事件处理器** - 实现实时通知
5. **定期检查超时** - 避免任务永久阻塞

---

## 🧪 测试

```powershell
# 加载模块
Import-Module (Join-Path $PSScriptRoot "queue-manager.ps1") -Force

# 运行测试
Test-MultiTaskQueue
```

---

## 📝 更新日志

### v1.1.0 (2026-04-07)

- ✅ **任务依赖**：支持 waitFor 依赖链
- ✅ **任务分组**：批量管理相关任务
- ✅ **批量操作**：一次提交多个任务
- ✅ **进度追踪**：分阶段进度跟踪
- ✅ **事件系统**：任务状态变化通知
- ✅ **增强统计**：详细的成功率和资源利用率

### v1.0.0 (2026-04-07)

- ✅ 任务队列管理
- ✅ 优先级调度
- ✅ 并发控制
- ✅ 超时处理
- ✅ 失败重试

---

**创建时间：** 2026-04-07  
**维护人：** 开发团队  
**版本：** v1.1
