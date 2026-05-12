---
name: auto-router
description: "Skills意图自动路由器。根据用户消息自动判断意图，路由到对应技能（代码审查/博客写作/数据分析/项目规划/研究调研/可视化/小红书等），并集成情绪检测、三位一体向量触发器（错误预警+Skills推荐+Agents推荐）。"
version: "2.1.0"
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

**【气流顺引】Gust of Wind** — 自动路由 + 三位一体向量触发器

## 功能

根据用户消息自动识别意图，路由到对应技能，并集成**向量触发机制**，在路由决策时自动注入错误预警、Skills推荐和Agents推荐。

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

### 四位一体向量触发器（v2.2新增）

当启用向量搜索时，自动触发四层防护：

| 触发类型 | 集合 | 用途 |
|----------|------|------|
| **错误预警** | yangshen_errors | 预防历史错误重蹈覆辙 |
| **Skills推荐** | yangshen_skills | 推荐最佳Skill组合 |
| **Agents推荐** | yangshen_agents | 推荐专业Agent角色 |
| **记忆上下文** | yangshen_brain/memory | 相关记忆辅助决策 |

**触发方式：** `route(message, { vector: true })`

### 情绪检测

始终检测用户情绪信号，优先级最高：
- `frustration.level >= 2` 时触发情绪安抚
- 影响所有路由决策

## 文件结构

```
auto-router/
├── auto-router.js          # 原版路由（关键词匹配）
├── auto-router-enhanced.js # 增强版路由（含向量触发器）⭐推荐
├── auto-trigger-sync.js     # 同步触发器（路由决策时即时调用）
├── auto-trigger.js          # 异步触发器（后台任务）
├── file-watcher.js          # 文件监控自动向量化
├── vector-search.js         # 向量搜索封装
├── vector-trigger.js        # VectorTrigger类
└── SKILL.md                 # 本文档
```

## API

```javascript
// 增强版路由（推荐）
const router = require('./auto-router-enhanced.js');

// 路由分析（启用向量搜索）
const result = router.route("开发一个新的向量数据库功能", { vector: true });

result.recommendations    // 路由到的技能列表
result.vector.warnings    // 错误预警 [{id, type, hint}]
result.vector.skillHints  // Skills推荐 [{skill_name, description}]
result.vector.agentHints  // Agents推荐 [{agent_name, description}]
result.vector.memoryContext // 记忆上下文 [{source, id, content, relevance}]
result.metadata           // 路由元数据

// 自动执行（含预警输出）
const exec = router.autoExecute("代码有bug", { vector: true });

// 启动文件监控（后台自动向量化新文件）
router.startWatcher();

// 向量化单个文件
router.vectorizeFile("C:/path/to/file.md", "yangshen_brain");

// 【写时同步】写入文件并立即更新向量数据库
const { written, vectorized, pid } = router.writeAndVectorize(
    "C:/path/to/file.md",     // 文件路径
    "# 内容",                  // 文件内容
    "yangshen_brain"          // 集合名
);
```

## 向量数据库

**Chroma路径：** `D:/vector_db/chroma`

| 集合 | 文档数 | 说明 |
|------|--------|------|
| yangshen_skills | 21 | Skills定义向量 |
| yangshen_errors | 11 | 错误/恢复案例 |
| yangshen_agents | 285 | Agent定义向量 |
| yangshen_brain | 19 | brain文件向量 |
| yangshen_memory | 28 | memory文件向量 |

**Embedding模型：** LM Studio bge-small-zh-v1.5 (512维)
**API地址：** http://127.0.0.1:1234/v1/embeddings

## 依赖

- skill-hub.js（技能中心）
- frustration-detector（情绪检测）
- D:/vector_db/skill_recommend.py（Skills向量搜索）
- D:/vector_db/error_search.py（错误预防向量搜索）
- D:/vector_db/agent_recommend.py（Agent推荐向量搜索）
