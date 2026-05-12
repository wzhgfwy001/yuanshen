# 子Agent决策边界配置 使用指南

## 📍 概述

**agent-authority** 是子Agent的决策边界配置系统，定义：
- 子Agent能做什么、不能做什么
- 什么时候必须回调主Agent
- 遇到模糊任务时的默认行为
- 能力上限和资源限制

---

## 📁 文件结构

```
skills/dynamic-multi-agent-system/core/subagent-manager/
├── agent-authority.schema.json      # 数据结构定义（JSON Schema）
├── agent-authority.examples.json   # 场景示例
├── agent-authority.USAGE.md        # 本文档
└── agent-{type}.authority.json      # 各类型Agent的配置文件（如 agent-writer.authority.json）
```

---

## 🗂️ 核心数据结构

### 四大顶级字段

| 字段 | 用途 | 关键子字段 |
|------|------|-----------|
| `decisionBoundary` | "能做什么" | `allowedScopes[]`, `deniedScopes[]`, `crossBoundaryRules` |
| `callbackRules` | "什么时候必须喊停" | `mustCallbackConditions[]`, `optionalCallbackConditions[]`, `callbackDebounceSeconds` |
| `defaultStrategy` | "模糊任务怎么办" | `onUnknownTask`, `onAmbiguousTask`, `assumptionPolicy` |
| `capabilities` | "能力上限是什么" | `maxContextTokens`, `maxExecutionTime`, `canAccessTools[]` |

### decisionBoundary.allowedScopes 单项结构

```json
{
  "action": "content.gen",
  "description": "生成内容",
  "maxDepth": 2,
  "constraints": {
    "maxRetries": 3,
    "timeoutSeconds": 300,
    "requiresConfirmation": false
  }
}
```

| 字段 | 说明 |
|------|------|
| `action` | 操作类型标识，如 `content.gen`, `format.style` |
| `description` | 中文描述 |
| `maxDepth` | 1=仅执行，2=可拆分，3=可跨模块 |
| `constraints` | 约束条件 |

### callbackRules 必须回调条件

```json
{
  "condition": "scope==='financial' AND amount > 10000",
  "reason": "涉及大额资金",
  "priority": "critical",
  "fallbackAction": "pause",
  "includeContext": ["amount", "scope", "transactionType"]
}
```

---

## 🔗 与 subagent-manager 集成

### 集成点 1：Agent实例化时加载

```javascript
// subagent-manager/spawn.js
const authorityConfig = require('./agent-authority.schema.json');

function spawnSubAgent(task, config) {
  // 1. 读取该Agent类型的决策边界配置
  const agentType = config.type;
  const authority = loadAuthority(agentType); // 读取 agent-{type}.authority.json

  // 2. 将边界注入Agent上下文
  const agentContext = {
    ...config,
    decisionBoundary: authority.decisionBoundary,
    callbackRules: authority.callbackRules,
    defaultStrategy: authority.defaultStrategy,
    capabilities: authority.capabilities,
  };

  // 3. 注入决策检查钩子
  agentContext.onDecision = (action) => checkAuthority(authority, action);
  agentContext.onCallback = (condition) => triggerCallback(authority, condition);

  return createAgent(agentContext);
}
```

### 集成点 2：任务分发前验证

```javascript
// subagent-manager/dispatch.js
function dispatchTask(agent, task) {
  const { deniedScopes } = agent.decisionBoundary;

  // 检查任务是否触犯禁止边界
  for (const denied of deniedScopes) {
    if (task.action.includes(denied)) {
      return {
        status: 'rejected',
        reason: `Task action ${task.action} is in deniedScopes`,
        suggestion: 'Delegate to appropriate agent type'
      };
    }
  }

  // 检查是否为必须回调场景
  const mustCallback = agent.callbackRules.mustCallbackConditions;
  for (const cond of mustCallback) {
    if (matchesCondition(task, cond.condition)) {
      task.flag = 'callback_required';
      task.callbackConfig = cond;
    }
  }

  return { status: 'approved', agent };
}
```

### 集成点 3：Agent运行时拦截

```javascript
// 伪代码：Agent决策循环中
async function agentLoop(agent, task) {
  const { assumptionPolicy } = agent.defaultStrategy;

  for (const step of task.steps) {
    // 检查是否在允许范围内
    const scope = agent.decisionBoundary.allowedScopes
      .find(s => s.action === step.action);

    if (!scope) {
      // 不在允许范围内，检查回调条件
      const callback = findMatchingCallback(agent.callbackRules, step);
      if (callback) {
        await agent.pause();
        await notifyParent(agent, callback);
        await agent.waitForResume();
        continue;
      }

      // 无匹配回调，按默认策略处理
      await handleByDefaultStrategy(agent.defaultStrategy, step);
      continue;
    }

    // 在允许范围内，追加约束
    step.constraints = { ...step.constraints, ...scope.constraints };

    // 执行
    await agent.execute(step);
  }
}
```

---

## 🔄 决策流程图

```
任务进入
    │
    ▼
是否在 deniedScopes？ ──是──▶ 拒绝 + 回调主Agent
    │否
    ▼
是否存在匹配回调条件？ ──是──▶ 暂停 + 通知主Agent
    │否
    ▼
是否在 allowedScopes？ ──是──▶ 追加约束 + 执行
    │否
    ▼
按 defaultStrategy 处理
    │
    ▼
  ask_parent / refuse / suspend / use_nearest
```

---

## 📋 快速创建新Agent配置

### 方法1：基于examples复制

```bash
# 基于examples创建特定Agent配置
cp agent-authority.examples.json agent-{type}-{name}.authority.json
```

然后修改对应字段即可。

### 方法2：从schema生成

```javascript
const schema = require('./agent-authority.schema.json');
const template = {
  agentId: "agent-custom-001",
  agentType: "custom",
  version: "1.0.0",
  description: "自定义Agent",
  decisionBoundary: {
    allowedScopes: [],
    deniedScopes: ["*"]
  },
  callbackRules: {
    mustCallbackConditions: [],
    callbackDebounceSeconds: 5
  },
  defaultStrategy: {
    onUnknownTask: "ask_parent",
    onAmbiguousTask: "ask_parent",
    assumptionPolicy: "moderate"
  },
  capabilities: {
    maxContextTokens: 100000,
    maxExecutionTime: 300,
    canAccessTools: [],
    cannotAccessTools: ["sendMessages"]
  }
};
```

---

## ⚙️ 字段速查

| 顶级字段 | 用途 | 枚举值 |
|---------|------|--------|
| `onUnknownTask` | 收到未知任务 | `refuse`, `ask_parent`, `use_nearest`, `suspend` |
| `onAmbiguousTask` | 任务模糊不清 | `use_defaults`, `ask_parent`, `pick_most_likely` |
| `assumptionPolicy` | 做假设的激进程度 | `conservative`, `moderate`, `aggressive` |
| `fallbackAction` | 等待主Agent时的行为 | `pause`, `rollback`, `use_default`, `abort` |
| `priority` | 回调优先级 | `low`, `medium`, `high`, `critical` |

---

## 📊 默认策略速查

| 场景 | 推荐策略 |
|------|---------|
| 创意写作类 | `onAmbiguousTask: pick_most_likely`, `assumptionPolicy: aggressive` |
| 精准执行类 | `onAmbiguousTask: ask_parent`, `assumptionPolicy: conservative` |
| 数据分析类 | `onUnknownTask: use_nearest`, `assumptionPolicy: moderate` |
| 对外操作类 | `canSendMessages: false`（默认）|

---

## 🧩 与其他系统集成

### 调度日志格式

```json
{
  "dispatch": {
    "agentName": "山寺三郎",
    "category": "writer",
    "authority": {
      "loaded": true,
      "configPath": "agent-writer.authority.json",
      "allowedScopesCount": 5,
      "callbackConditionsCount": 3,
      "deniedScopesCount": 2
    },
    "mappingSource": "agent-authority.json",
    "timestamp": "2026-04-17T09:00:00+08:00"
  }
}
```

### 与 category-mapping 共存

- **category-mapping.json** — 控制Agent类型的分类映射
- **agent-authority.json** — 控制具体Agent的决策边界
- 两者可同时生效：`mappingSource` 可为 `category-mapping.json` 或 `agent-authority.json`

---

## ❓ 常见问题

**Q: 子Agent没有配置文件怎么办？**
A: 返回默认边界 `getDefaultAuthority(agentType)`，允许基本操作但限制外部行为。

**Q: deniedScopes 和 allowedScopes 冲突怎么办？**
A: `deniedScopes` 优先级更高，即使在 `allowedScopes` 中也会被拒绝。

**Q: 如何禁用决策边界系统？**
A: 在 `agent-{type}.authority.json` 中设置 `_enabled: false`，或跳过 `loadAuthorityConfig` 调用。
