---
name: deerflow-auto-skill-creator
description: DeerFlow增强版自动技能创建器 - 从任务学习、模板生成、技能优化
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | auto_skill=true | skill_generation=true | pattern_learning=true
---

# DeerFlow增强版自动技能创建器

**【附魔·改】AutoCreate Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 自动创建技能 | `auto_skill=true` | 自动从任务创建技能 |
| 模式学习 | `pattern_learning=true` | 从任务历史学习模式 |

## 核心功能

### 1. 从任务学习创建技能

```javascript
const { AutoSkillCreator } = require('./deerflow_enhanced.js');

const creator = new AutoSkillCreator({
  outputDir: './skills'
});

// 从任务历史学习
const skills = await creator.learnFromTasks(taskHistory, {
  minFrequency: 3,
  extractPatterns: true,
  generateExamples: true
});

console.log(`创建了 ${skills.length} 个技能`);
```

### 2. 分析任务模式

```javascript
// 自动分析高频任务模式
const patterns = creator._analyzePatterns(tasks);

console.log(patterns.slice(0, 5));
// [
//   { keyword: 'code', frequency: 42, examples: [...] },
//   { keyword: 'write', frequency: 38, examples: [...] },
//   ...
// ]
```

### 3. 保存技能

```javascript
// 保存单个技能
const filePath = await creator.saveSkill(skill);

// 保存所有技能
const results = await creator.saveAllSkills();
console.log(`保存了 ${results.length} 个技能文件`);
```

### 4. 优化技能

```javascript
// 根据使用反馈优化技能
const optimized = await creator.optimizeSkill('auto-code-skill', {
  successRate: 0.75,
  failureReasons: ['timeout', 'incorrect format']
});

console.log(optimized.metadata.suggestion);
// "Add more examples or refine capabilities"
```

### 5. 事件监听

```javascript
creator.on('learning_started', ({ taskCount }) => {
  console.log(`开始学习 ${taskCount} 个任务`);
});

creator.on('patterns_found', ({ count }) => {
  console.log(`发现 ${count} 个模式`);
});

creator.on('skill_created', ({ name }) => {
  console.log(`创建技能: ${name}`);
});

creator.on('skill_saved', ({ name, path }) => {
  console.log(`保存技能: ${name} -> ${path}`);
});
```

## 生成的技能格式

自动生成的技能遵循DeerFlow的SKILL.md格式：

```markdown
---
name: auto-code-skill
description: Auto-generated skill for code tasks
version: 1.0.0
author: auto-generated
tags:
  - code
  - auto-generated
triggers:
  - code
---

# auto-code-skill

## 描述
Auto-generated skill for code tasks

## 功能
- Handle code related tasks
- Process code requests

## 示例
### 示例 1
...
```

## 配置

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `outputDir` | ./skills | 技能输出目录 |
| `minFrequency` | 3 | 最小出现频率 |
| `extractPatterns` | true | 提取模式 |
| `generateExamples` | true | 生成示例 |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
