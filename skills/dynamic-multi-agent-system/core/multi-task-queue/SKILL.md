# Multi-Task Queue - 多任务队列管理器

**版本：** 1.0.0  
**类型：** 核心模块  
**依赖：** shared-memory（可选）

---

## 📖 简介

多任务队列管理器负责**管理并发任务的执行队列**，合理分配资源，避免系统过载。

### 核心功能

- 🎯 **任务排队** - 按优先级管理任务队列
- 🚦 **并发控制** - 限制最多 3 个主任务/12 个子 Agent
- ⚡ **智能调度** - 优先级调度 + 资源分配
- 📊 **队列监控** - 实时查看任务状态

---

## 🎬 使用示例

### 示例 1：添加任务到队列

```powershell
# 创建任务
$task = @{
    taskId = "task-001"
    priority = "P1"
    type = "sci-fi-writing"
    estimatedAgents = 4
    payload = @{
        prompt = "写一篇科幻小说"
    }
}

# 添加到队列
Add-TaskToQueue -task $task
```

### 示例 2：启动任务调度

```powershell
# 启动调度器
Start-TaskScheduler

# 调度器会自动：
# 1. 检查可用资源
# 2. 按优先级排序等待队列
# 3. 启动符合条件的任务
```

### 示例 3：查看队列状态

```powershell
# 查看完整状态
$status = Get-QueueStatus

# 输出示例：
# running: 2 个任务
# waiting: 3 个任务
# completed: 15 个任务
# failed: 1 个任务
```

### 示例 4：手动调整优先级

```powershell
# 提升任务优先级
Update-TaskPriority -taskId "task-005" -priority "P0"

# 暂停任务
Suspend-Task -taskId "task-003"

# 恢复任务
Resume-Task -taskId "task-003"
```

---

## 🔧 API 参考

### 添加任务到队列

```powershell
Add-TaskToQueue -task <hashtable>
```

**任务结构：**
```powershell
$task = @{
    taskId = "task-001"           # 必填
    priority = "P1"               # 必填：P0/P1/P2/P3
    type = "sci-fi-writing"       # 必填
    estimatedAgents = 4           # 必填：预计需要的 Agent 数
    createdAt = Get-Date          # 可选
    payload = @{                  # 可选：任务参数
        prompt = "..."
    }
}
```

---

### 启动调度器

```powershell
Start-TaskScheduler [-interval <int>]
```

**参数：**
- `interval` - 调度间隔（秒，默认 5）

**说明：** 后台运行，每 5 秒检查一次队列

---

### 停止调度器

```powershell
Stop-TaskScheduler
```

---

### 获取队列状态

```powershell
Get-QueueStatus
```

**返回：**
```powershell
@{
    running = @(...)      # 运行中任务
    waiting = @(...)      # 等待中任务
    completed = @(...)    # 已完成任务
    failed = @(...)       # 失败任务
    limits = @{
        maxRunningTasks = 3
        maxTotalAgents = 12
        currentAgents = 8
    }
}
```

---

### 更新任务优先级

```powershell
Update-TaskPriority -taskId <string> -priority <string>
```

**优先级：**
- P0 - 紧急（立即执行）
- P1 - 高（优先执行）
- P2 - 中（正常排队）
- P3 - 低（空闲时执行）

---

### 暂停任务

```powershell
Suspend-Task -taskId <string>
```

---

### 恢复任务

```powershell
Resume-Task -taskId <string>
```

---

### 取消任务

```powershell
Cancel-Task -taskId <string>
```

---

## 📊 优先级规则

| 优先级 | 类型 | 示例 | 响应时间 |
|--------|------|------|----------|
| **P0** | 紧急 | 系统故障、数据丢失 | 立即执行 |
| **P1** | 高 | 复杂任务、多 Agent | 排队优先 |
| **P2** | 中 | 标准任务 | 正常排队 |
| **P3** | 低 | 简单查询、后台任务 | 空闲时执行 |

---

## 🚦 并发限制

### 系统限制

| 限制项 | 值 | 说明 |
|--------|-----|------|
| 最大主任务数 | 3 | 同时运行的主任务 |
| 最大子 Agent 数 | 12 | 所有任务的子 Agent 总计 |
| 单任务最大 Agent | 8 | 单个任务最多 8 个 Agent |
| 任务超时 | 30 分钟 | 超过自动暂停 |
| 失败重试 | 1 次 | 自动重试 1 次 |

### 资源计算

```powershell
# 可用 Agent 数
$availableAgents = $maxTotalAgents - $currentAgents

# 能否启动新任务
function Can-StartTask {
    param($task)
    
    $hasTaskSlot = $runningTasks.Count -lt $maxRunningTasks
    $hasAgentSlot = $task.estimatedAgents -le $availableAgents
    
    return $hasTaskSlot -and $hasAgentSlot
}
```

---

## 📁 数据结构

### 队列文件结构

```json
{
  "queue": {
    "running": [
      {
        "taskId": "task-001",
        "priority": "P1",
        "type": "sci-fi-writing",
        "agents": 4,
        "status": "running",
        "startedAt": "2026-04-07T09:00:00Z"
      }
    ],
    "waiting": [
      {
        "taskId": "task-004",
        "priority": "P1",
        "type": "market-analysis",
        "agents": 3,
        "status": "waiting",
        "createdAt": "2026-04-07T09:05:00Z"
      }
    ],
    "completed": [...],
    "failed": [...]
  },
  "limits": {
    "maxRunningTasks": 3,
    "maxTotalAgents": 12,
    "currentAgents": 8
  },
  "scheduler": {
    "running": true,
    "interval": 5,
    "lastRun": "2026-04-07T09:10:00Z"
  }
}
```

---

## 🔧 调度算法

### 伪代码

```powershell
function Schedule-Tasks {
    # 1. 检查当前资源
    $availableAgents = $maxAgents - $currentAgents
    
    # 2. 获取等待队列（按优先级排序）
    $sorted = $waitingTasks | Sort-Object Priority, CreatedAt
    
    # 3. 依次启动任务
    foreach ($task in $sorted) {
        # 检查是否达到任务数限制
        if ($runningTasks.Count -ge $maxTasks) { break }
        
        # 检查是否有足够 Agent
        if ($task.agents -le $availableAgents) {
            Start-Task $task
            $availableAgents -= $task.agents
        }
    }
}
```

---

## ⚠️ 异常处理

### 超时处理

```powershell
# 检测超时任务（>30 分钟）
$timeoutTasks = $runningTasks | Where-Object {
    $elapsed = (Get-Date) - $_.startedAt
    $elapsed.TotalMinutes -gt 30
}

# 暂停超时任务
foreach ($task in $timeoutTasks) {
    Suspend-Task -taskId $task.taskId
    Write-Warning "Task $($task.taskId) suspended: timeout"
}
```

### 失败重试

```powershell
# 失败任务自动重试 1 次
if ($task.retryCount -lt 1) {
    $task.retryCount++
    $task.status = "waiting"
    Add-TaskToQueue -task $task
    Write-Host "Retrying task $($task.taskId) (attempt $($task.retryCount))"
} else {
    $task.status = "failed"
    Write-Error "Task $($task.taskId) failed after 1 retry"
}
```

---

## 📊 监控集成

### 与监控大屏集成

```powershell
# 获取队列状态用于监控
$status = Get-QueueStatus

# 发送到监控大屏
Send-ToDashboard -data @{
    runningTasks = $status.running.Count
    waitingTasks = $status.waiting.Count
    agentUsage = $status.limits.currentAgents
    agentTotal = $status.limits.maxTotalAgents
}
```

---

## 🧪 单元测试

### 测试用例

```powershell
function Test-MultiTaskQueue {
    Write-Host "=== Multi-Task Queue Tests ===" -ForegroundColor Cyan
    
    # Test 1: Add Task
    Write-Host "`n[Test 1] Add Task" -ForegroundColor Yellow
    $task = @{
        taskId = "test-001"
        priority = "P2"
        type = "test"
        estimatedAgents = 2
    }
    $result = Add-TaskToQueue -task $task
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 2: Get Status
    Write-Host "`n[Test 2] Get Queue Status" -ForegroundColor Yellow
    $status = Get-QueueStatus
    if ($status.waiting.Count -gt 0) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 3: Update Priority
    Write-Host "`n[Test 3] Update Priority" -ForegroundColor Yellow
    Update-TaskPriority -taskId "test-001" -priority "P0"
    $task = Get-Task "test-001"
    if ($task.priority -eq "P0") { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 4: Scheduler
    Write-Host "`n[Test 4] Start Scheduler" -ForegroundColor Yellow
    Start-TaskScheduler -interval 1
    Start-Sleep -Seconds 2
    Stop-TaskScheduler
    Write-Host "✅ PASS" -ForegroundColor Green
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}
```

---

## 📝 更新日志

### v1.0.0 (2026-04-07)

- ✅ 初始版本
- ✅ 任务队列管理
- ✅ 优先级调度
- ✅ 并发控制
- ✅ 超时处理
- ✅ 失败重试

---

**创建时间：** 2026-04-07  
**维护人：** 开发团队  
**状态：** 🟡 开发中
