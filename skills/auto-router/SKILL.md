---
name: auto-router
description: "Skills意图自动路由器。根据用户消息自动判断意图，路由到对应技能（代码审查/博客写作/数据分析/项目规划/研究调研/可视化/小红书等），并集成情绪检测。"
version: "1.0.0"
metadata:
  {
    openclaw:
      {
        emoji: "🔀",
        category: "utility",
        requires: {},
      },
  }
---

# auto-router

**【气流顺引】Gust of Wind** — 

## 功能

根据用户消息自动识别意图，路由到对应技能。

### 路由规则

| 关键词 | 技能 | 方法 |
|--------|------|------|
| 代码、review、审查、检查代码 | codeReview | reviewCode |
| 博客、文章、写一篇 | blog | writeBlog |
| 分析、数据、统计 | analysis | analyze |
| 规划、计划、项目 | planner | planProject |
| 研究、调研、调查 | research | research |
| 图表、可视化、dashboard | visual | createChart |
| 小红书、种草 | xiaohongshu | writeXiaohongshu |
| 任务、分类 | classifier | classifyTask |

### 情绪检测

始终检测用户情绪信号，优先级最高：
- `frustration.level >= 2` 时触发情绪安抚
- 影响所有路由决策

## API

```javascript
const router = require('./auto-router.js');

// 路由分析
const recs = router.route("帮我写一篇博客");

// 自动执行
const result = router.autoExecute("代码有bug", { options });

// 技能状态
const status = router.getSkillsStatus();
```

## 依赖

- skill-hub.js（技能中心）
- frustration-detector（情绪检测）
