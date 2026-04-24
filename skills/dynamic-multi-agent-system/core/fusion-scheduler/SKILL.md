---
name: fusion-scheduler
description: |
  融合调度器 - 自动为子Agent匹配女娲人格或Agency模板。
  触发条件：
  - 「分解任务并装备人格」「spawn子agent」「任务分配」
  - 「给这个任务找对应的skill」「自动装备角色」
  - 「子agent应该用什么角色」「分析这个任务需要什么能力」
---

# 融合调度器 - Fusion Scheduler

> 自动化匹配 + 智能装备 + Fallback机制

## 核心功能

当主Agent分解任务并spawn子Agent时，融合调度器自动：

1. **分析子任务** - 理解每个子任务需要什么能力
2. **智能匹配** - 从注册表查找匹配的女娲人格或Agency模板
3. **自动装备** - 将SKILL内容注入到子Agent的prompt
4. **Fallback** - 都没有时spawn自定义子Agent

---

## 工作流程

```
用户任务
   ↓
主Agent任务分解
   ↓
融合调度器分析
   ↓
┌─────────────────────────────────────┐
│         检查注册表                   │
│  女娲人格 → Agency模板 → Fallback   │
└─────────────────────────────────────┘
   ↓
装备SKILL → Spawn子Agent → 并行执行
```

---

## 使用方式

### 方式1：手动调用（当前推荐）

当需要spawn子Agent时，主Agent读取并使用：

```javascript
// 主Agent判断需要spawn子Agent
const scheduler = require('./fusion-scheduler.js');

// 分析任务装备计划
const result = await scheduler.planEquip([
  { id: 'task1', description: '用张雪峰风格分析高考志愿' },
  { id: 'task2', description: '做一个数据分析报告' }
]);

console.log(result.plans);
// 输出装备计划：哪个用女娲，哪个用Agency，哪个自定义
```

### 方式2：自动集成（未来）

集成到subagent-manager后，自动触发。

---

## 注册表结构

### 女娲人格（高优先级）

```json
{
  "毛泽东": {
    "path": "brain/agents/mao-zedong/SKILL.md",
    "type": "nuwa",
    "triggers": ["战略", "困难", "矛盾", "革命"],
    "description": "战略思维、矛盾分析"
  },
  "张雪峰": {
    "path": "brain/agents/zhang-xuefeng/SKILL.md",
    "type": "nuwa",
    "triggers": ["高考", "志愿", "考研", "专业"],
    "description": "高考志愿、考研规划"
  }
}
```

### Agency模板（中优先级）

```json
{
  "data-analyst": {
    "path": "core/subagent-manager/roles/data-analyst.md",
    "triggers": ["分析", "数据", "报表", "统计"],
    "capabilities": ["SQL查询", "数据可视化"]
  },
  "product-manager": {
    "path": "core/subagent-manager/roles/product-manager.md",
    "triggers": ["产品", "需求", "PRD"],
    "capabilities": ["需求分析", "PRD撰写"]
  }
}
```

### Fallback（最低优先级）

当没有匹配时，spawn自定义子Agent。

---

## 装备优先级

| 优先级 | 类型 | 说明 |
|--------|------|------|
| 1 | 女娲人格 | 触发词匹配时，装备真实人物认知框架 |
| 2 | Agency模板 | 触发词匹配时，装备标准工作能力 |
| 3 | 自定义Agent | 都没匹配时，用通用prompt |

---

## 匹配规则

```javascript
matchingRules: {
  priorityOrder: ["persona", "agencyTemplate", "fallback"],
  matchThreshold: 0.6,      // 60%匹配度触发
  caseSensitive: false,      // 不区分大小写
  allowPartialMatch: true   // 允许部分匹配
}
```

### 触发词匹配示例

用户说："帮我用张雪峰的风格分析文科生适合的专业"

调度器检测到：
- 触发词"张雪峰" → 匹配女娲人格
- 触发词"专业" → 也可能匹配Agency

优先级决定：使用**女娲人格**。

---

## 返回格式

```javascript
{
  success: true,
  summary: {
    total: 3,           // 总任务数
    equipped: 2,        // 已装备数
    fallback: 1,        // 自定义数
    nuwaCount: 1,       // 女娲人格数
    agencyCount: 1,     // Agency模板数
    customCount: 1     // 自定义数
  },
  plans: [
    {
      taskId: "task1",
      type: "nuwa",           // nuwa | agency | custom
      name: "张雪峰",
      skillPath: "brain/agents/...",
      skillContent: "...",    // SKILL.md完整内容
      matchScore: 0.85,
      reasoning: ["匹配女娲人格: 张雪峰 (0.85)"]
    },
    // ...
  ]
}
```

---

## 自动注册机制

### 女娲蒸馏后自动注册

当使用女娲skill成功蒸馏新人物后：

```javascript
// 自动注册到融合调度器
scheduler.registerPersona(
  '新人物名',
  'brain/agents/新人物/SKILL.md',
  ['触发词1', '触发词2'],
  '描述'
);
```

### 注册表自动更新

融合调度器会定期扫描：
- `brain/agents/*/SKILL.md` → 自动加入personas
- `core/subagent-manager/roles/*.md` → 自动加入agencyTemplates

---

## 示例对话

### 用户请求

```
用户：帮我分析一下这个文科生应该选什么专业，同时做一个数据报告
```

### 主Agent执行

1. **任务分解**：
   - task1: 分析文科生专业选择
   - task2: 生成数据报告

2. **调用融合调度器**：

```javascript
const result = await scheduler.planEquip([
  { id: '分析任务', description: '分析文科生适合的专业，用专业视角' },
  { id: '数据任务', description: '生成数据报告，包含统计图表' }
]);
```

3. **结果**：

| 子Agent | 装备类型 | 名称 | 原因 |
|---------|---------|------|------|
| Agent A | 女娲人格 | 张雪峰 | 匹配"专业"触发词 |
| Agent B | Agency模板 | data-analyst | 匹配"数据报告"触发词 |

4. **Spawn执行**

---

## 技术细节

### 文件结构

```
fusion-scheduler/
├── SKILL.md                    # 本文件
├── fusion-registry.json        # 注册表（自动更新）
├── fusion-scheduler.js         # 调度逻辑
└── README.md                   # 使用指南
```

### 依赖

- Node.js (fs, path模块)
- fusion-registry.json

### 性能

- 注册表查询: O(n) n=人格+模板数
- 触发词匹配: O(m) m=触发词数
- 典型任务分析: <10ms

---

## 下一步

1. 集成到subagent-manager自动触发
2. 支持更多女娲人格自动注册
3. 添加学习机制（根据使用自动调整触发词权重）
