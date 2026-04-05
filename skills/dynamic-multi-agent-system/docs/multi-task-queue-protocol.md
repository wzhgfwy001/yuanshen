# 多任务队列管理器 v1.0

## 概述

多任务队列管理器负责系统的并发控制和资源调度，确保：
- ✅ 最多 3 个主任务并行执行
- ✅ 最多 12 个子 Agent 同时运行
- ✅ 任务优先级调度
- ✅ 超时和重试机制
- ✅ 资源公平分配

---

## 核心概念

### 任务队列结构

```
┌─────────────────────────────────────────────────────────┐
│                    任务队列管理器                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  待处理队列 (Pending Queue)                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ Task-001│  │ Task-002│  │ Task-003│  ...           │
│  │  priority:high   │  │  priority:normal│            │
│  └─────────┘  └─────────┘  └─────────┘                 │
│                                                         │
│  运行中任务 (Running Tasks) - 最多 3 个                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ Task-A  │  │ Task-B  │  │ Task-C  │                 │
│  │ 4 subagents  │  │ 3 subagents │  │ 2 subagents │     │
│  └─────────┘  └─────────┘  └─────────┘                 │
│                                                         │
│  已完成队列 (Completed Queue)                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ Task-X  │  │ Task-Y  │  │ Task-Z  │  ...           │
│  └─────────┘  └─────────┘  └─────────┘                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 任务状态机

```
                    ┌──────────────┐
                    │   Created    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Pending    │◄──────┐
                    └──────┬───────┘       │
                           │               │
              ┌────────────┼────────────┐  │
              │            │            │  │
              ▼            ▼            │  │
        ┌─────────┐  ┌─────────┐       │  │
        │ Running │  │ Failed  │───────┤  │
        └────┬────┘  └────┬────┘       │  │
             │            │            │  │
             │     ┌──────┘            │  │
             │     │                   │  │
             ▼     ▼                   │  │
        ┌──────────────┐               │  │
        │   Completed  │───────────────┘  │
        └──────────────┘                  │
                                          │
              重试 (max 3 次)───────────────┘
```

---

## 资源配置

### 系统限制

| 资源 | 限制 | 说明 |
|------|------|------|
| **最大并发主任务** | 3 | 同时运行的主任务数 |
| **最大子 Agent 总数** | 12 | 所有任务共享的子 Agent 池 |
| **单任务最大子 Agent** | 6 | 单个任务最多占用 6 个子 Agent |
| **子 Agent 超时** | 300s | 5 分钟无响应自动终止 |
| **任务超时** | 3600s | 1 小时未完成自动失败 |
| **最大重试次数** | 3 | 失败后最多重试 3 次 |

### 资源分配策略

```yaml
# 默认配额
default-quota:
  max-concurrent-tasks: 3
  max-subagents-total: 12
  max-subagents-per-task: 6
  
# 优先级配额
priority-quotas:
  high:
    max-concurrent-tasks: 1  # 高优先级任务可独占 1 个槽位
    max-subagents: 6
    timeout-multiplier: 1.5
  
  normal:
    max-concurrent-tasks: 2
    max-subagents: 4
    timeout-multiplier: 1.0
  
  low:
    max-concurrent-tasks: 1
    max-subagents: 2
    timeout-multiplier: 0.8
```

---

## 任务优先级

### 优先级定义

| 优先级 | 标识 | 说明 | 示例 |
|--------|------|------|------|
| **高** | `high` | 紧急任务，优先调度 | 用户明确标注"紧急" |
| **中** | `normal` | 普通任务，默认优先级 | 大多数任务 |
| **低** | `low` | 后台任务，空闲时执行 | 批量处理、离线任务 |

### 优先级计算

```javascript
function calculatePriority(task) {
  let priority = 'normal'
  let score = 50  // 基础分
  
  // 用户标注
  if (task.metadata.urgent) score += 30
  if (task.metadata.lowPriority) score -= 20
  
  // 任务类型
  if (task.type === 'innovative') score += 10
  if (task.type === 'simple') score -= 10
  
  // 等待时间（避免饥饿）
  const waitTimeMinutes = (Date.now() - task.createdAt) / 60000
  score += Math.min(waitTimeMinutes, 20)  // 最多 +20 分
  
  // 用户等级
  if (task.user.vipLevel >= 3) score += 15
  
  // 判定优先级
  if (score >= 70) priority = 'high'
  else if (score <= 30) priority = 'low'
  
  return { priority, score }
}
```

### 调度规则

```
1. 高优先级任务优先出队
2. 同优先级按等待时间排序（FIFO）
3. 低优先级任务仅在系统空闲时执行
4. 运行中的高优先级任务可抢占低优先级任务的资源
```

---

## API 协议

### 1. 提交任务

**接口：** `submitTask(task)`

**请求：**
```json
{
  "action": "submit-task",
  "task": {
    "id": "task-001",
    "type": "innovative",
    "description": "创作科幻小说",
    "priority": "normal",
    "metadata": {
      "urgent": false,
      "deadline": "2026-04-05T12:00:00Z"
    },
    "estimatedSubagents": 4,
    "estimatedDuration": 70
  }
}
```

**响应：**
```json
{
  "success": true,
  "taskId": "task-001",
  "status": "pending",
  "queuePosition": 2,
  "estimatedStartTime": "2026-04-04T19:15:00Z"
}
```

---

### 2. 查询任务状态

**接口：** `getTaskStatus(taskId)`

**请求：**
```json
{
  "action": "get-task-status",
  "taskId": "task-001"
}
```

**响应：**
```json
{
  "success": true,
  "task": {
    "id": "task-001",
    "status": "running",
    "priority": "normal",
    "progress": 0.6,
    "currentStage": "writing",
    "activeSubagents": 3,
    "startedAt": "2026-04-04T19:10:00Z",
    "estimatedCompletion": "2026-04-04T19:40:00Z"
  }
}
```

---

### 3. 取消任务

**接口：** `cancelTask(taskId, reason)`

**请求：**
```json
{
  "action": "cancel-task",
  "taskId": "task-001",
  "reason": "用户取消"
}
```

**响应：**
```json
{
  "success": true,
  "taskId": "task-001",
  "previousStatus": "pending",
  "cancelledAt": "2026-04-04T19:12:00Z"
}
```

**注意：** 运行中的任务取消会终止所有子 Agent

---

### 4. 暂停/恢复任务

**接口：** `pauseTask(taskId)` / `resumeTask(taskId)`

**请求：**
```json
{
  "action": "pause-task",
  "taskId": "task-001"
}
```

**响应：**
```json
{
  "success": true,
  "taskId": "task-001",
  "status": "paused",
  "pausedAt": "2026-04-04T19:15:00Z"
}
```

**注意：** 暂停的任务保留资源，但停止进度

---

### 5. 查询队列状态

**接口：** `getQueueStatus()`

**响应：**
```json
{
  "success": true,
  "queue": {
    "pending": {
      "count": 5,
      "high": 1,
      "normal": 3,
      "low": 1
    },
    "running": {
      "count": 2,
      "tasks": ["task-A", "task-B"],
      "activeSubagents": 7
    },
    "completed": {
      "count": 12,
      "today": 5
    },
    "resources": {
      "availableTaskSlots": 1,
      "availableSubagents": 5,
      "totalSubagents": 12
    }
  }
}
```

---

## 调度算法

### 主循环

```javascript
async function schedulerLoop() {
  while (true) {
    // 1. 检查运行中任务的状态
    await checkRunningTasks()
    
    // 2. 清理已完成/失败的任务
    await cleanupFinishedTasks()
    
    // 3. 尝试启动新任务
    await tryStartNewTasks()
    
    // 4. 处理超时
    await handleTimeouts()
    
    // 5. 等待下次调度
    await sleep(SCHEDULER_INTERVAL_MS)
  }
}
```

### 启动新任务逻辑

```javascript
async function tryStartNewTasks() {
  const runningCount = getRunningTaskCount()
  const availableSlots = MAX_CONCURRENT_TASKS - runningCount
  
  if (availableSlots <= 0) return
  
  // 按优先级排序待处理队列
  const pendingTasks = getPendingTasksSortedByPriority()
  
  for (const task of pendingTasks) {
    // 检查子 Agent 资源
    const availableSubagents = MAX_SUBAGENTS - getActiveSubagentCount()
    const neededSubagents = task.estimatedSubagents
    
    if (neededSubagents > availableSubagents) {
      // 资源不足，跳过
      continue
    }
    
    // 检查是否达到单任务上限
    if (neededSubagents > MAX_SUBAGENTS_PER_TASK) {
      // 需要拆分或拒绝
      handleOversizedTask(task)
      continue
    }
    
    // 启动任务
    await startTask(task)
    
    // 更新计数
    runningCount++
    if (runningCount >= MAX_CONCURRENT_TASKS) break
  }
}
```

### 资源抢占逻辑

```javascript
async function handleResourcePreemption(highPriorityTask) {
  // 高优先级任务需要资源但资源不足
  const runningLowPriorityTasks = getRunningTasksByPriority('low')
  
  if (runningLowPriorityTasks.length === 0) return false
  
  // 选择影响最小的低优先级任务
  const targetTask = selectTaskToPreempt(runningLowPriorityTasks)
  
  // 暂停低优先级任务
  await pauseTask(targetTask)
  
  // 释放资源
  releaseSubagents(targetTask.activeSubagents)
  
  // 启动高优先级任务
  await startTask(highPriorityTask)
  
  return true
}
```

---

## 超时处理

### 子 Agent 超时

```javascript
async function checkSubagentTimeout(subagent) {
  const elapsed = Date.now() - subagent.lastHeartbeat
  
  if (elapsed > SUBAGENT_TIMEOUT_MS) {
    // 标记超时
    subagent.status = 'timeout'
    
    // 终止子 Agent
    await terminateSubagent(subagent.id)
    
    // 通知主 Agent
    await notifyParent({
      type: 'subagent-timeout',
      subagentId: subagent.id,
      taskId: subagent.taskId
    })
    
    // 尝试重试
    await retrySubagent(subagent)
  }
}
```

### 任务超时

```javascript
async function checkTaskTimeout(task) {
  const elapsed = Date.now() - task.startedAt
  const timeout = task.timeout || TASK_DEFAULT_TIMEOUT
  
  if (elapsed > timeout) {
    // 任务超时
    task.status = 'failed'
    task.failureReason = 'timeout'
    
    // 终止所有子 Agent
    await terminateAllSubagents(task.id)
    
    // 记录日志
    logTaskFailure(task, '任务执行超时')
    
    // 通知用户
    await notifyUser({
      type: 'task-timeout',
      taskId: task.id,
      message: `任务 "${task.description}" 执行超时，已自动终止`
    })
  }
}
```

---

## 重试机制

### 子 Agent 重试

```javascript
async function retrySubagent(failedSubagent) {
  if (failedSubagent.retryCount >= MAX_SUBAGENT_RETRIES) {
    // 超过最大重试次数，标记失败
    failedSubagent.status = 'failed'
    await handleSubagentFailure(failedSubagent)
    return
  }
  
  // 等待退避时间
  const backoffMs = calculateBackoff(failedSubagent.retryCount)
  await sleep(backoffMs)
  
  // 重新创建子 Agent
  const newSubagent = await createSubagent({
    task: failedSubagent.task,
    role: failedSubagent.role,
    retryOf: failedSubagent.id
  })
  
  failedSubagent.retryCount++
  failedSubagent.replacedBy = newSubagent.id
}
```

### 任务重试

```javascript
async function retryTask(failedTask) {
  if (failedTask.retryCount >= MAX_TASK_RETRIES) {
    // 超过最大重试次数，标记永久失败
    failedTask.status = 'permanently-failed'
    await handlePermanentFailure(failedTask)
    return
  }
  
  // 移回待处理队列（保持原优先级）
  failedTask.status = 'pending'
  failedTask.retryCount++
  
  // 记录重试
  logTaskRetry(failedTask)
  
  // 下次调度时会自动尝试启动
}
```

### 退避算法

```javascript
function calculateBackoff(retryCount) {
  // 指数退避：1s, 2s, 4s, 8s, ...
  const baseDelay = 1000
  const maxDelay = 60000  // 最多 1 分钟
  
  const delay = baseDelay * Math.pow(2, retryCount)
  const jitter = Math.random() * 0.3 * delay  // 30% 随机抖动
  
  return Math.min(delay + jitter, maxDelay)
}
```

---

## 监控指标

### 实时指标

```json
{
  "timestamp": "2026-04-04T19:20:00Z",
  "metrics": {
    "queue": {
      "pending": 5,
      "running": 2,
      "paused": 1,
      "completed": 12
    },
    "subagents": {
      "active": 7,
      "idle": 5,
      "failed": 0
    },
    "throughput": {
      "tasksPerHour": 8.5,
      "avgTaskDuration": 420
    },
    "quality": {
      "successRate": 0.96,
      "avgRetryCount": 0.3
    }
  }
}
```

### 历史统计

```json
{
  "date": "2026-04-04",
  "stats": {
    "totalTasks": 15,
    "completedTasks": 14,
    "failedTasks": 1,
    "avgWaitTime": 180,
    "avgExecutionTime": 420,
    "peakConcurrentTasks": 3,
    "peakActiveSubagents": 11
  }
}
```

---

## 错误处理

### 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `QUEUE_FULL` | 队列已满 | 等待或取消其他任务 |
| `NO_RESOURCES` | 资源不足 | 等待资源释放 |
| `TASK_NOT_FOUND` | 任务不存在 | 检查 task-id |
| `INVALID_PRIORITY` | 优先级无效 | 使用 high/normal/low |
| `CANCEL_FAILED` | 取消失败 | 任务已完成或正在清理 |
| `TIMEOUT` | 执行超时 | 检查任务复杂度 |

### 错误恢复

```javascript
async function handleError(error, context) {
  switch (error.code) {
    case 'QUEUE_FULL':
      // 加入等待队列
      await addToWaitlist(context.task)
      break
    
    case 'NO_RESOURCES':
      // 尝试资源抢占
      if (context.task.priority === 'high') {
        await handleResourcePreemption(context.task)
      } else {
        // 等待资源
        await waitForResources(context.task)
      }
      break
    
    case 'TIMEOUT':
      // 记录并通知
      await logTimeout(context.task)
      await notifyUser(context.user)
      break
    
    default:
      // 未知错误，标记失败
      await markTaskFailed(context.task, error)
  }
}
```

---

## 使用示例

### 示例 1：提交普通任务

```javascript
// 提交任务
const result = await submitTask({
  id: "task-sci-fi-001",
  type: "standard",
  description: "创作科幻短篇小说",
  priority: "normal",
  estimatedSubagents: 4,
  estimatedDuration: 70
})

// 结果：{success: true, queuePosition: 2}
```

### 示例 2：提交紧急任务

```javascript
// 提交高优先级任务
const result = await submitTask({
  id: "task-urgent-001",
  type: "innovative",
  description: "紧急：会议报告生成",
  priority: "high",
  metadata: {
    urgent: true,
    deadline: "2026-04-04T20:00:00Z"
  },
  estimatedSubagents: 6,
  estimatedDuration: 30
})

// 可能触发资源抢占
```

### 示例 3：查询队列状态

```javascript
const status = await getQueueStatus()

console.log(`待处理：${status.queue.pending.count}`)
console.log(`运行中：${status.queue.running.count}`)
console.log(`可用子 Agent: ${status.queue.resources.availableSubagents}`)
```

### 示例 4：取消任务

```javascript
const result = await cancelTask("task-001", "用户需求变更")

if (result.success) {
  console.log("任务已取消")
} else {
  console.log("取消失败：" + result.error)
}
```

---

## 配置文件

### queue-config.json

```json
{
  "limits": {
    "maxConcurrentTasks": 3,
    "maxSubagentsTotal": 12,
    "maxSubagentsPerTask": 6,
    "maxTaskTimeout": 3600000,
    "maxSubagentTimeout": 300000,
    "maxRetries": 3
  },
  "priorities": {
    "high": {
      "weight": 3,
      "maxSubagents": 6,
      "timeoutMultiplier": 1.5,
      "canPreempt": true
    },
    "normal": {
      "weight": 2,
      "maxSubagents": 4,
      "timeoutMultiplier": 1.0,
      "canPreempt": false
    },
    "low": {
      "weight": 1,
      "maxSubagents": 2,
      "timeoutMultiplier": 0.8,
      "canPreempt": false
    }
  },
  "scheduler": {
    "intervalMs": 1000,
    "backoffBaseMs": 1000,
    "backoffMaxMs": 60000
  }
}
```

---

## 下一步

1. **实现基础队列** - 待处理/运行中/已完成队列
2. **添加优先级调度** - 按优先级排序和调度
3. **实现资源管理** - 子 Agent 池管理
4. **添加超时处理** - 子 Agent 和任务超时
5. **实现重试机制** - 指数退避重试
6. **编写监控指标** - 实时状态和统计

---

*协议版本：1.0*  
*最后更新：2026-04-04*
