# SKILLS-INDEX - 阳神系统技能索引

**版本：** v1.9.6  
**更新：** 2026-04-11  
**总计：** 9个用户技能 + 3个内置技能 = 12个技能

---

## 用户创建技能（9个）

| # | 技能名称 | 路径 | 触发关键词 | 核心能力 |
|---|----------|------|-----------|----------|
| 1 | **code-review** | `skills/code-review/` | 审查代码, code review, 检查代码, review code, 代码审计 | Bug检测, 性能分析, 安全检查, 代码质量 |
| 2 | **writing-blog** | `skills/writing-blog/` | 写博客, 写文章, blog, article, 写作, 文案 | 博客写作, 文章创作, 内容策划 |
| 3 | **data-analysis** | `skills/data-analysis/` | 数据分析, data analysis, 分析数据, 统计 | 数据分析, 报表生成, 可视化 |
| 4 | **research-assistant** | `skills/research-assistant/` | 研究, 调研, research, 整理资料, 生成报告 | 信息收集, 资料整理, 报告生成 |
| 5 | **project-planner** | `skills/project-planner/` | 项目规划, project plan, 做计划, 规划 | 需求分析, 计划制定, 任务分解 |
| 6 | **visualization-creator** | `skills/visualization-creator/` | 可视化, visualization, 图表, 画图 | 图表生成, 数据可视化, 架构图 |
| 7 | **content-collector** | `skills/content-collector/` | 内容采集, 收集内容, collector | 内容抓取, 信息搜索, 数据整理 |
| 8 | **xiaohongshu-editor** | `skills/xiaohongshu-editor/` | 小红书, xiaohongshu, 红书编辑 | 内容改写, emoji添加, 标签优化, 排版 |
| 9 | **content-publisher** | `skills/content-publisher/` | 发布内容, content publish, 发布, 发布助手 | 文件保存, 格式转换, 批量导出 |

---

## 内置技能（3个）

| # | 技能名称 | 路径 | 触发关键词 | 核心能力 |
|---|----------|------|-----------|----------|
| 1 | **skill-creator** | `openclaw/skills/skill-creator` | 创建技能, 优化技能, 审计技能 | 从零创建, 优化现有, 审计结构 |
| 2 | **clawflow** | `openclaw/skills/clawflow` | 复杂任务, 多步骤, 需要持久化 | 工作流管理, 状态跟踪, 输出持久化 |
| 3 | **clawflow-inbox-triage** | `openclaw/skills/clawflow-inbox-triage` | 消息分类, 收件箱路由 | 消息分类, 路由决策, 通知分发 |

---

## 技能分类索引

### 按用途分类

| 类别 | 技能 |
|------|------|
| **开发** | code-review, project-planner |
| **内容创作** | writing-blog, xiaohongshu-editor, content-publisher |
| **数据分析** | data-analysis, visualization-creator |
| **信息收集** | research-assistant, content-collector |
| **系统工具** | skill-creator, clawflow, clawflow-inbox-triage |

### 按触发语言分类

| 语言 | 技能 |
|------|------|
| **中文优先** | 全部用户技能（中文关键词为主） |
| **英文支持** | code-review, writing-blog, data-analysis, research-assistant, visualization-creator |

---

## 快速调用指南

```
用户: "帮我审查这段代码"  → 触发 code-review
用户: "写一篇技术博客"    → 触发 writing-blog  
用户: "分析这份销售数据"  → 触发 data-analysis
用户: "调研一下竞品"      → 触发 research-assistant
用户: "规划这个项目"      → 触发 project-planner
用户: "生成可视化图表"    → 触发 visualization-creator
用户: "采集一些内容"      → 触发 content-collector
用户: "改写成小红书风格"  → 触发 xiaohongshu-editor
用户: "保存并发布内容"    → 触发 content-publisher
```

---

## 集成位置

- **技能注册表:** `core/skill-integrator/SKILL.md`
- **系统主文档:** `SKILL.md`（E1章节）
- **索引文件:** `SKILLS-INDEX.md`

---

*v1.0.0 - 2026-04-11*
