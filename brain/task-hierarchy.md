# 任务系统分层（Task Hierarchy）

> 基于 Claude Code 的 src/tasks/ 设计理念
> 目标：区分本地/远程/异步任务，实现任务队列管理
> 生成时间：2026-05-12

## 核心理念

Claude Code 区分了三种任务类型：

| 类型 | 说明 | 特点 |
|------|------|------|
| 本地任务 | 当前会话执行 | 同步，阻塞 |
| 远程任务 | 异步执行，结果回调 | 非阻塞，可等待 |
| Agent任务 | 托管给子Agent | 并行，自主 |

## 我们的任务分层

```
┌─────────────────────────────────────────┐
│           任务入口                        │
│  用户输入 → 任务分类 → 路由分发           │
└─────────────────────────────────────────┘
                    │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ 本地任务 │  │ 远程任务 │  │Agent任务 │
   │ (sync)  │  │ (async) │  │ (parallel)│
   └─────────┘  └─────────┘  └─────────┘
       ↓             ↓             ↓
   执行并等待   回调结果      子Agent执行
```

## 任务状态机

```
pending（待处理）
    ↓
queued（已入队）
    ↓
running（执行中）
    ↓ 完成
completed（已完成）
    ↓ 失败
failed（失败）
    ↓ 重试
retrying（重试中）
```

## 任务队列结构

### 本地任务（同步）

```json
{
  "taskId": "t-20260512-001",
  "type": "local",
  "command": "node build.js",
  "status": "completed",
  "startTime": "2026-05-12T10:00:00Z",
  "endTime": "2026-05-12T10:02:00Z",
  "result": "Build successful",
  "exitCode": 0
}
```

### 远程任务（异步回调）

```json
{
  "taskId": "t-20260512-002",
  "type": "remote",
  "action": "send-email",
  "status": "pending",
  "callback": "https://example.com/webhook/task-result",
  "retry": {
    "maxAttempts": 3,
    "current": 0,
    "delay": 5000
  }
}
```

### Agent 任务（托管）

```json
{
  "taskId": "t-20260512-003",
  "type": "agent",
  "agentType": "research-agent",
  "task": "研究高考志愿系统竞品",
  "status": "running",
  "subAgents": [
    { "agentId": "agent-1", "status": "completed" },
    { "agentId": "agent-2", "status": "running" }
  ],
  "timeout": 300000
}
```

## 任务管理器

```javascript
class TaskManager {
  constructor() {
    this.local = new LocalTaskQueue()
    this.remote = new RemoteTaskQueue()
    this.agents = new AgentTaskPool()
  }
  
  // 路由任务
  async submit(task) {
    switch (task.type) {
      case 'local':
        return this.local.enqueue(task)
      case 'remote':
        return this.remote.enqueue(task)
      case 'agent':
        return this.agents.spawn(task)
    }
  }
  
  // 状态查询
  async status(taskId) {
    return (
      this.local.get(taskId) ||
      this.remote.get(taskId) ||
      this.agents.get(taskId)
    )
  }
  
  // 取消任务
  async cancel(taskId) {
    const task = await this.status(taskId)
    if (task.type === 'agent') {
      this.agents.kill(taskId)
    }
    task.status = 'cancelled'
  }
}
```

## 优先级队列

```javascript
const TaskQueue = {
  // 优先级：P0 > P1 > P2 > P3
  queue: [],
  
  enqueue(task) {
    this.queue.push(task)
    this.queue.sort((a, b) => b.priority - a.priority)
  },
  
  dequeue() {
    return this.queue.shift()
  }
}
```

## 任务依赖

```javascript
// 任务依赖：DAG（有向无环图）
const TaskDAG = {
  tasks: {
    't1': { deps: [], status: 'completed' },
    't2': { deps: ['t1'], status: 'pending' },
    't3': { deps: ['t1'], status: 'pending' },
    't4': { deps: ['t2', 't3'], status: 'pending' }
  },
  
  canRun(taskId) {
    const task = this.tasks[taskId]
    return task.deps.every(depId => 
      this.tasks[depId].status === 'completed'
    )
  }
}
```

## 任务执行示例

```markdown
# 高考系统开发任务

## 主任务链
t1（需求分析） → t2（数据库设计） → t3（后端开发） → t4（前端开发）

## 并行子任务
t2.1（用户表设计） ─┐
t2.2（志愿表设计） ─┼─→ t2（汇总设计）
t2.3（日志表设计） ─┘

## Agent 托管任务
t3.1（用户模块）   → agent-user
t3.2（志愿模块）   → agent-gaokao
t3.3（支付模块）   → agent-payment
```

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Claude Code 任务系统理念*