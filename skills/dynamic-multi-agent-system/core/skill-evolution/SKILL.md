---
name: deerflow-skill-evolution
description: DeerFlow增强版技能进化系统 - 使用追踪、成功率分析、自动优化建议、版本管理
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | skill_evolution=true | analytics=true | performance_tracking=true
---

# DeerFlow增强版技能进化系统

**【附魔·改】Evolution Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 技能进化 | `skill_evolution=true` | 启用技能追踪 |
| 分析 | `analytics=true` | 使用分析 |
| 性能追踪 | `performance_tracking=true` | 追踪性能 |

## 核心功能

### 1. 记录技能使用

```javascript
const { SkillEvolution } = require('./deerflow_enhanced.js');

const evolution = new SkillEvolution({
  successThreshold: 0.8,
  minUsesForEvolution: 10
});

// 记录成功使用
evolution.recordUsage('my-skill', true, 1500, {
  context: 'user-request',
  taskType: 'coding'
});

// 记录失败使用
evolution.recordUsage('my-skill', false, 500, {
  error: new Error('Timeout')
});
```

### 2. 获取技能状态

```javascript
const status = evolution.getSkillStatus('my-skill');
console.log(`
技能: ${status.name}
版本: ${status.currentVersion}
成功率: ${(status.stats.successRate * 100).toFixed(1)}%
使用次数: ${status.stats.uses}
需要进化: ${status.needsEvolution}
`);
```

### 3. 获取优化建议

```javascript
// 当需要进化时触发
evolution.on('optimization_suggested', ({ skill, suggestions }) => {
  console.log(`技能 ${skill} 需要优化:`);
  for (const s of suggestions) {
    console.log(`- [${s.priority}] ${s.suggestion}`);
    if (s.errors) {
      for (const e of s.errors) {
        console.log(`  - ${e.error}: ${e.count}次`);
      }
    }
  }
});
```

### 4. 创建新版本

```javascript
// 基于分析创建新版本
const version = evolution.createVersion('my-skill', {
  changes: [
    '增加超时处理',
    '优化错误处理逻辑',
    '添加新的示例'
  ]
});

console.log(`新版本: ${version.version}`);
```

### 5. 获取所有技能状态

```javascript
const allStatus = evolution.getAllStatus();
console.log(`共 ${allStatus.length} 个技能`);

// 按需要进化排序
const needsEvolution = allStatus.filter(s => s.needsEvolution);
console.log(`需要进化的技能: ${needsEvolution.length}`);
```

### 6. 获取统计

```javascript
const stats = evolution.getStatistics();
console.log(`
总技能数: ${stats.totalSkills}
总使用次数: ${stats.totalUses}
总成功: ${stats.totalSuccesses}
总失败: ${stats.totalFailures}
整体成功率: ${stats.overallSuccessRate}
需要进化: ${stats.skillsNeedingEvolution}
`);
```

### 7. 导出/导入数据

```javascript
// 导出
const data = evolution.exportData();
fs.writeFileSync('evolution-data.json', JSON.stringify(data, null, 2));

// 导入
const importedData = JSON.parse(fs.readFileSync('evolution-data.json'));
evolution.importData(importedData);
```

## 配置

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `successThreshold` | 0.8 | 成功率阈值 |
| `minUsesForEvolution` | 10 | 触发进化的最小使用次数 |
| `maxVersions` | 5 | 最大版本数 |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
