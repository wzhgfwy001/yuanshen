# task-typologist

**【职业鉴定】Identify Weakness** — 

任务类型细化系统 - 参考Claude Code的Task类型设计

## 灵感来源

Claude Code的7种任务类型：
- local_bash / local_agent / remote_agent
- in_process_teammate / local_workflow
- monitor_mcp / dream

## 我们的实现：任务分类体系

### 同步任务（Sync Tasks）

**特征：** 需要立即返回结果

| 类型 | 说明 | 示例 |
|------|------|------|
| `query` | 简单查询 | "今天天气如何" |
| `one-shot` | 单次操作 | "帮我写封信" |
| `calculate` | 计算任务 | "计算这个" |

### 异步任务（Async Tasks）

**特征：** 需要时间完成，不阻塞用户

| 类型 | 说明 | 示例 |
|------|------|------|
| `background` | 后台运行 | "帮我监控X数据" |
| `scheduled` | 定时任务 | "明天8点提醒我" |
| `long-running` | 长时任务 | "下载这个大文件" |

### 多步骤任务（Multi-Step Tasks）

**特征：** 多个子步骤，需要协调

| 类型 | 说明 | 示例 |
|------|------|------|
| `workflow` | 工作流 | "完成这个项目报告" |
| `decomposed` | 分解任务 | "分析这个系统架构" |
| `collaborative` | 协作任务 | "和子Agent一起完成" |

### 协作任务（Collaboration Tasks）

**特征：** 需要多个Agent/系统参与

| 类型 | 说明 | 示例 |
|------|------|------|
| `parallel` | 并行任务 | "同时处理A和B" |
| `sequential` | 串行任务 | "先A后B最后C" |
| `team` | 团队任务 | "创建子Agent团队" |

### 监控任务（Monitor Tasks）

**特征：** 持续运行，响应事件

| 类型 | 说明 | 示例 |
|------|------|------|
| `watch` | 监控任务 | "监控文件变化" |
| `listen` | 监听任务 | "监听消息队列" |
| `heartbeat` | 心跳检查 | "定期检查系统健康" |

### 记忆任务（Memory Tasks）

**特征：** 与记忆系统交互

| 类型 | 说明 | 示例 |
|------|------|------|
| `recall` | 回忆任务 | "记得上次我们说到哪吗" |
| `store` | 存储任务 | "帮我记住这个" |
| `organize` | 整理任务 | "整理一下我的文件" |

## 任务属性

```javascript
{
  id: string,           // 唯一标识
  type: TaskType,       // 任务类型
  priority: 'P0-P3',    // 优先级
  sync: boolean,        // 是否同步
  timeout: number,      // 超时时间(ms)
  retry: number,        // 重试次数
  context: {...}        // 任务上下文
}
```

## 类型选择规则

```
1. 用户明确要求 → 按要求
2. 单次操作 + 快 → query
3. 需要子Agent → collaborative
4. 长时间运行 → async + scheduled
5. 需要监控 → monitor
6. 涉及记忆 → memory
```

## 超时配置

| 类型 | 默认超时 | 可配置 |
|------|----------|--------|
| query | 30s | 否 |
| one-shot | 2min | 是 |
| workflow | 10min | 是 |
| background | 无 | 否 |
| scheduled | 按时间 | 否 |
| collaborative | 15min | 是 |
| monitor | 持续 | 否 |
| memory | 5min | 是 |

## 与其他Skill联动

- `frustration-detector` → 任务失败时检测用户情绪
- `context-compactor` → 长任务结束时压缩上下文
- `dynamic-multi-agent-system` → 复杂任务自动启用多Agent

## 实际代码

**文件：** `task-typologist.js`

### 核心函数

```javascript
const tt = require('./task-typologist.js');

// 分类任务
tt.classify(taskText);

// 获取统计
tt.getStats();

// 记录完成
tt.recordCompletion(taskId, type, durationMs);
```

### 触发方式

```javascript
// 自动分类任务
const result = tt.classify(userRequest);
console.log(result.type);        // 'team', 'workflow', 'query'...
console.log(result.needsMultiAgent); // true/false
console.log(result.recommendedApproach);
```

---

_最后更新：2026-04-12_
