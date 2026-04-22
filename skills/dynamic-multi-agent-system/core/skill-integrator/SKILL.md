---
name: deerflow-skill-integrator
description: DeerFlow增强版技能集成器 - 多技能协调、依赖解析、冲突检测、组合执行
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | skill_integration=true | multi_skill=true | orchestration=true
---

# DeerFlow增强版技能集成器

**【附魔·改】Integrator Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 技能集成 | `skill_integration=true` | 多技能协作 |
| 编排 | `orchestration=true` | 任务编排 |

## 核心功能

### 1. 注册技能

```javascript
const { SkillIntegrator } = require('./deerflow_enhanced.js');

const integrator = new SkillIntegrator();

// 注册技能
integrator.registerSkill({
  name: 'code-skill',
  execute: async (ctx) => { /* ... */ }
});

integrator.registerSkill({
  name: 'review-skill',
  execute: async (ctx) => { /* ... */ }
});
```

### 2. 创建集成

```javascript
// 创建技能集成
const integration = integrator.createIntegration('code-workflow', [
  'code-skill',
  'review-skill'
], {
  continueOnError: true,
  executionOrder: {
    'code-skill': 1,
    'review-skill': 2
  }
});
```

### 3. 执行集成

```javascript
// 执行整个工作流
const result = await integrator.executeIntegration('code-workflow', {
  task: '写一个排序算法'
});

console.log(`
成功: ${result.success}
结果: ${JSON.stringify(result.results)}
错误: ${result.errors.length}
`);
```

### 4. 事件监听

```javascript
integrator.on('skill_executed', ({ skill, result }) => {
  console.log(`技能 ${skill} 执行完成`);
});

integrator.on('skill_failed', ({ skill, error }) => {
  console.error(`技能 ${skill} 失败: ${error}`);
});

integrator.on('conflicts_detected', ({ conflicts }) => {
  console.error('冲突:', conflicts);
});
```

### 5. 列出集成

```javascript
const integrations = integrator.listIntegrations();
console.log(integrations);
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
