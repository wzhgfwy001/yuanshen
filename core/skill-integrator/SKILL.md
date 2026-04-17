---
name: skill-integrator
description: "技能触发整合器。根据用户输入的关键词，自动识别并调用相应的技能。"
version: 1.0.0
intranet: compatible
intranet_notes: "纯路由匹配，无外部依赖"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔗",
        "category": "orchestration",
      },
  }
---

# Skill Integrator - 技能触发整合器

## 功能

根据用户输入的关键词，自动识别并调用相应的技能模块。

---

## 技能触发关键词表

### 1. code-review（代码审查助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 审查代码 | code review | 代码审查请求 |
| 检查代码 | check code | 代码检查 |
| 代码审计 | code audit | 安全审计 |
| review code | audit code | 英文触发 |
| 帮我看看代码 | review this | 口语化 |

**触发条件：** 用户要求审查、检查、审计代码

---

### 2. writing-blog（博客写作助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 写博客 | write blog | 博客写作 |
| 写文章 | write article | 文章创作 |
| 写作 | writing | 一般写作 |
| 文案 | copy | 文案撰写 |
| blog | article | 英文触发 |

**触发条件：** 用户要求写博客、文章、文案

---

### 3. data-analysis（数据分析助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 分析数据 | analyze data | 数据分析 |
| 数据分析 | data analysis | 分析请求 |
| 报表 | report | 报表生成 |
| 统计 | statistics | 统计分析 |
| 数据报告 | data report | 报告需求 |

**触发条件：** 用户要求分析数据、生成报表、统计分析

---

### 4. research-assistant（研究助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 研究 | research | 研究请求 |
| 调研 | survey | 调研任务 |
| 整理资料 | organize info | 资料整理 |
| 生成报告 | generate report | 报告生成 |
| 研究一下 | look into | 口语化研究 |

**触发条件：** 用户要求研究、调研、整理资料

**内网提示：** 研究助手依赖外部网络，内网环境下请提供本地资料

---

### 5. project-planner（项目规划助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 规划项目 | plan project | 项目规划 |
| 项目规格 | project spec | 规格文档 |
| 写需求 | write requirements | 需求文档 |
| 帮我规划 | help me plan | 口语化 |
| spec | project plan | 英文触发 |

**触发条件：** 用户要求规划项目、写需求文档

---

### 6. visualization-creator（可视化助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 可视化 | visualization | 可视化请求 |
| 生成图表 | create chart | 图表生成 |
| 图表 | chart | 图表需求 |
| 可视化页面 | visualization page | 页面生成 |
| 画图 | draw diagram | 图形绘制 |

**触发条件：** 用户要求生成图表、可视化内容

---

### 7. content-collector（内容采集助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 采集内容 | collect content | 内容采集 |
| 抓取内容 | scrape content | 内容抓取 |
| 搜索内容 | search content | 内容搜索 |
| 搜索网页 | search web | 网页搜索 |
| collect | scrape | 英文触发 |

**触发条件：** 用户要求采集、抓取、搜索内容

**内网提示：** 内容采集依赖外部网络，内网环境下请提供URL列表或本地文件

---

### 8. xiaohongshu-editor（小红书编辑助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 小红书 | xiaohongshu | 小红书相关 |
| 改写 | rewrite | 内容改写 |
| 笔记编辑 | edit note | 笔记编辑 |
| 笔记排版 | format note | 排版需求 |
| 改写成小红书 | convert to XHS | 格式转换 |

**触发条件：** 用户要求改写/编辑小红书风格内容

---

### 9. content-publisher（内容发布助手）

| 关键词（中文） | 关键词（英文） | 触发场景 |
|--------------|--------------|---------|
| 发布内容 | publish content | 发布请求 |
| 自动发布 | auto publish | 自动化发布 |
| 上传笔记 | upload post | 上传发布 |
| 发布到 | post to | 指定平台 |

**触发条件：** 用户要求发布内容

**内网提示：** 当前Phase 1内容编辑已完成，自动化发布需额外配置

---

## 路由规则

### 优先级

1. **精确匹配** - 关键词完全一致时优先
2. **模糊匹配** - 包含关键词即可触发
3. **上下文推断** - 无关键词时根据上下文推断

### 冲突解决

| 场景 | 解决方式 |
|------|---------|
| 多个技能都匹配 | 选择匹配关键词最多的 |
| 关键词重叠 | 选择更具体的 |
| 无法判断 | 返回多个候选让用户选择 |

### 示例路由

```
用户: "帮我审查一下这段Python代码"
→ 匹配: code-review
→ 调用: skills/code-review/SKILL.md

用户: "写一篇关于AI大模型的博客"
→ 匹配: writing-blog
→ 调用: skills/writing-blog/SKILL.md

用户: "分析一下这份销售数据"
→ 匹配: data-analysis
→ 调用: skills/data-analysis/SKILL.md

用户: "研究一下2024年AI Agent的发展"
→ 匹配: research-assistant
→ 调用: skills/research-assistant/SKILL.md
→ 提示: 内网环境下建议提供本地资料

用户: "帮我做个数据可视化"
→ 匹配: visualization-creator
→ 调用: skills/visualization-creator/SKILL.md
```

---

## 内网适配

所有触发关键词均支持本地匹配，无外部依赖。

**内网限制提示（自动添加）：**
- research-assistant → "内网环境下建议提供本地资料"
- content-collector → "内网环境下请提供URL列表"
- content-publisher → "自动化发布需配置，当前仅支持手动发布"

---

## 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-04-11 | 初始版本，包含9个技能的触发关键词 |

---
