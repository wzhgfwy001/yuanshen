# Skills 自动路由系统规则

**日期:** 2026-04-12  
**状态:** 已实现

---

## 概述

Skills 自动路由系统会根据用户消息自动判断应该调用哪个技能，实现无缝的任务处理。

## 触发机制

**入口脚本:** `scripts/skills-lookup.js`

```bash
node scripts/skills-lookup.js "用户消息"
```

## 路由规则表

| 关键词 | 技能 | 方法 | 优先级 |
|--------|------|------|--------|
| 代码/review/审查/检查代码 | codeReview | reviewCode | normal |
| 博客/文章/写一篇 | blog | writeBlog | normal |
| 分析/数据/统计 | analysis | analyze | normal |
| 规划/计划/项目 | planner | planProject | normal |
| 研究/调研/调查 | research | research | normal |
| 图表/可视化/dashboard | visual | createChart | normal |
| 小红书/种草 | xiaohongshu | writeXiaohongshu | normal |
| 任务/分类 | classifier | classifyTask | normal |
| (情绪检测) | frustration | detectFrustration | **high** |

## 情绪检测优先级

情绪检测（frustration）具有**最高优先级**，无论消息内容如何都会先检测用户情绪状态。

触发条件:
- `level === 'high'` 或 `level >= 3`
- `level !== 'none'` 且 `level !== 'light'`

## 集成方式

### 方式1: 直接调用
```javascript
const autoRouter = require('./skills/auto-router.js');
const result = autoRouter.autoExecute('帮我分析数据');
```

### 方式2: 单独路由
```javascript
const autoRouter = require('./skills/auto-router.js');
const recommendations = autoRouter.route('用户消息');
```

### 方式3: 命令行
```bash
node scripts/skills-lookup.js "帮我分析数据"
```

## 技能状态检查

```javascript
const status = autoRouter.getSkillsStatus();
// { analysis: 'loaded', blog: 'loaded', ... }
```

## 文件结构

```
skills/
├── auto-router.js          # 路由核心
├── skill-hub/
│   └── skill-hub.js        # 技能中心
scripts/
└── skills-lookup.js        # 命令行入口
```

---

**验证命令:** `node scripts/skills-lookup.js "帮我分析数据"`
