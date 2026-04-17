# Skills Evolution System - 技能进化系统

**版本：** v1.0.0
**创建时间：** 2026-04-16T01:05:00+08:00
**状态：** 阶段1实施中

---

## 核心原理

Skills进化系统让元神能够**通过完成任务自动积累经验，形成可复用的技能**。

```
任务完成 → 追踪记录 → 成功率达标 → 自动创建Skill草稿
```

---

## 触发机制

### 1. 创建新Skill（任务类型成功率）

**条件：** 某类任务连续完成 **5次以上**，成功率 **> 80%**

```javascript
// 伪代码
if (taskTypeStats.total >= 5 && taskTypeStats.success_rate > 0.8) {
  triggerCreateSkillDraft(taskType);
}
```

**输出：** 新Skill草稿（包含成功模式、最佳实践、提示词模板）

### 2. Skill改进审查（Skill使用成功率）

**条件：** 某Skill被调用后成功率 **< 60%**

```javascript
if (skillStats.success_rate < 0.6) {
  triggerSkillReview(skillName);
}
```

**输出：** 审查建议（改进/丢弃/合并）

---

## 任务类型分类

| 类型 | 子类型 | 示例 |
|------|--------|------|
| `code` | 代码开发 | 前端组件、后端API、脚本 |
| `code_review` | 代码审查 | Bug修复、性能优化、安全审计 |
| `research` | 研究分析 | 竞品分析、技术调研 |
| `writing` | 内容创作 | 博客、文档、营销文案 |
| `data_analysis` | 数据分析 | 报表、统计、可视化 |
| `system` | 系统任务 | 部署、配置、监控 |

---

## 数据结构

### task_tracking（任务追踪）

```json
{
  "task_tracking": {
    "[task_type]": {
      "total": 10,
      "success": 9,
      "failed": 1,
      "success_rate": 0.9,
      "last_5": [true, true, true, true, false],
      "trigger_new_skill": true,
      "avg_confidence": 0.85,
      "examples": ["成功案例1", "成功案例2"]
    }
  }
}
```

### skill_tracking（技能追踪）

```json
{
  "skill_tracking": {
    "[skill_name]": {
      "invoked": 20,
      "success": 18,
      "failed": 2,
      "success_rate": 0.9,
      "needs_improvement": false,
      "avg_execution_time": "5min"
    }
  }
}
```

---

## Skill草稿格式

```markdown
# Skill: [技能名称]

**创建时间：** YYYY-MM-DD
**触发条件：** [任务类型] 成功率 > 80%
**状态：** 草稿（待用户确认）

## 核心能力
- 能力1
- 能力2

## 最佳实践
1. 步骤1
2. 步骤2

## 提示词模板
\`\`\`
[任务描述]
要求：...
\`\`\`

## 成功案例
- 案例1
- 案例2

## 注意事项
- 注意点1
```

---

## 使用流程

### 记录任务完成

```javascript
// 任务完成时调用
recordTaskComplete({
  type: "code",
  subtype: "frontend_react",
  success: true,
  confidence: 0.9,
  example: "完成了React组件开发"
});
```

### 检查触发条件

```javascript
// 每次记录后检查
checkEvolutionTrigger();
// 如果 trigger_new_skill = true，生成Skill草稿
```

---

## 存储位置

- 主状态：`brain/progress.json` → `skills_evolution.task_tracking`
- Skill草稿：`skills/skill-drafts/[skill-name].md`
- 已固化Skill：`skills/[category]/[skill-name]/SKILL.md`

---

## 待完善

- [x] 自动化触发检查逻辑 → `trigger.schema.json` 已定义
- [ ] Skill草稿生成模板
- [ ] 用户确认后固化流程
- [ ] 与现有Skill系统的整合
