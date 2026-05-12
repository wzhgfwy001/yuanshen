# 融合调度器 - Fusion Scheduler

> 自动化匹配女娲人格/Agency模板 + 智能装备子Agent

## 快速开始

### 1. 查看当前状态

```bash
node fusion-scheduler.js
```

### 2. 自动更新注册表

```bash
node fusion-auto-updater.js --full
```

### 3. 在主Agent中使用

```javascript
const scheduler = require('./fusion-scheduler.js');

// 分析任务装备
const result = await scheduler.planEquip([
  { id: 'task1', description: '用张雪峰风格分析高考志愿' },
  { id: 'task2', description: '做一个数据分析报告' }
]);

// 查看装备计划
console.log(result.plans);
console.log(result.summary);
```

---

## 架构

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

## 注册表

### 女娲人格（当前）

| 人格 | 路径 | 触发词 |
|------|------|--------|
| 毛泽东 | brain/agents/mao-zedong/SKILL.md | 战略、困难、矛盾、革命 |
| 张雪峰 | brain/agents/zhang-xuefeng/SKILL.md | 高考、志愿、考研、专业 |

### Agency模板（部分）

| 模板 | 分类 | 触发词 |
|------|------|--------|
| data-analyst | data | 分析、数据、报表 |
| product-manager | product | 产品、需求、PRD |
| ui-designer | design | 界面、UI、设计 |
| growth-hacker | operations | 增长、获客、AARRR |
| ... | ... | ... |

完整列表请查看 `fusion-registry.json`

---

## 装备优先级

1. **女娲人格** - 触发词匹配真实人物认知框架
2. **Agency模板** - 触发词匹配标准工作能力
3. **自定义Agent** - 都没有时spawn通用子Agent

---

## 匹配规则

```javascript
{
  matchThreshold: 0.6,      // 60%匹配度触发
  caseSensitive: false,      // 不区分大小写
  allowPartialMatch: true   // 允许部分匹配
}
```

---

## 文件结构

```
fusion-scheduler/
├── SKILL.md                    # 技能定义
├── fusion-registry.json         # 注册表（自动维护）
├── fusion-scheduler.js          # 调度逻辑
├── fusion-auto-updater.js       # 自动注册更新器
└── README.md                   # 本文件
```

---

## 自动更新

系统会定期扫描：

- `brain/agents/*/SKILL.md` → 女娲人格
- `core/subagent-manager/roles/*.md` → Agency模板

### 手动更新

```bash
node fusion-auto-updater.js --full
```

---

## 示例输出

```javascript
{
  success: true,
  summary: {
    total: 3,
    equipped: 2,
    fallback: 1,
    nuwaCount: 1,
    agencyCount: 1,
    customCount: 1
  },
  plans: [
    {
      taskId: "task1",
      type: "nuwa",
      name: "张雪峰",
      matchScore: 0.85,
      reasoning: ["匹配女娲人格: 张雪峰 (0.85)"]
    },
    {
      taskId: "task2", 
      type: "agency",
      name: "data-analyst",
      matchScore: 0.72,
      reasoning: ["匹配Agency模板: data-analyst (0.72)"]
    },
    {
      taskId: "task3",
      type: "custom",
      fallback: true,
      reasoning: ["触发Fallback: 无匹配，spawn自定义Agent"]
    }
  ]
}
```
