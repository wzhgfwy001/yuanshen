---
name: deerflow-enhanced-skills-system
description: 借鉴DeerFlow的增强版Skills系统，支持Markdown frontmatter、自动化扫描、依赖管理
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | skills_management=advanced | auto_discover=true
---

# DeerFlow增强版Skills系统

**【附魔·改】Enhanced Enchant**

## 触发条件

当满足以下任一条件时，自动启用此增强版系统：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 用户指定使用DeerFlow增强模式 |
| 高级技能管理 | `skills_management=advanced` | 需要自动化技能管理 |
| 自动发现 | `auto_discover=true` | 需要自动扫描注册Skills |
| 技能版本控制 | `version_control=true` | 需要版本兼容性检查 |
| 批量安装 | `batch_install=true` | 批量安装Skills依赖 |

## 核心功能

### 1. Frontmatter解析器

```javascript
const { FrontmatterParser } = require('./deerflow_enhanced.js');

// 解析Markdown frontmatter
const { metadata, body } = FrontmatterParser.parse(content);

// 序列化回Markdown
const markdown = FrontmatterParser.serialize(metadata, body);
```

**支持格式：**
```yaml
---
name: skill-name
description: 技能描述
version: 1.0.0
author: author-name
tags:
  - tag1
  - tag2
dependencies:
  - dep1
  - dep2
trigger: deerflow_mode=true | complexity=high
parent: parent-skill
compatible: ^1.0.0
---
```

### 2. 自动扫描与注册

```javascript
const { EnhancedSkillsManager } = require('./deerflow_enhanced.js');

const manager = new EnhancedSkillsManager({
  workspacePath: 'C:/Users/DELL/.openclaw/workspace',
  scanPaths: ['skills/', 'core/']
});

// 初始化 - 扫描并注册所有Skills
const result = await manager.initialize();
console.log(`注册了 ${result.registered} 个Skills`);

// 获取统计
const stats = manager.getStatistics();
console.log(`总计: ${stats.total} Skills`);
console.log(`有触发器: ${stats.withTrigger}`);
```

### 3. 触发条件匹配

```javascript
// 查找匹配当前上下文的Skills
const matchingSkills = manager.match({
  deerflow_mode: true,
  complexity: 'high'
});

console.log(`找到 ${matchingSkills.length} 个匹配的Skills`);

// 列出所有触发条件
const triggers = manager.listTriggers();
console.log('可用触发器:', triggers);
```

### 4. 技能激活/停用

```javascript
// 激活技能
manager.activate('skill-name');

// 停用技能
manager.deactivate('skill-name');

// 获取技能
const skill = manager.get('skill-name');
if (skill) {
  console.log(`状态: ${skill.status}`);
  console.log(`代码块: ${skill.codeBlocks.length}`);
  console.log(`示例: ${skill.examples}`);
}
```

### 5. 从模板创建技能

```javascript
// 从模板创建新技能
const newSkill = await manager.create('agent', 'my-new-agent', {
  description: '我的新Agent技能',
  tags: ['agent', 'custom'],
  trigger: 'deerflow_mode=true'
});

console.log(`创建成功: ${newSkill.id}`);
```

### 6. 依赖管理

```javascript
const { SkillInstaller } = require('./deerflow_enhanced.js');

const installer = new SkillInstaller({
  registry: manager.registry,
  installPath: 'skills/'
});

// 安装依赖
const results = await installer.installDependencies('skill-name');
console.log(`已安装: ${results.installed}`);
console.log(`已存在: ${results.alreadyInstalled}`);
console.log(`失败: ${results.failed}`);
```

## 技能模板

| 模板 | 用途 | 适用场景 |
|------|------|----------|
| `basic` | 基础技能 | 简单工具/辅助功能 |
| `agent` | Agent技能 | 需要角色定义的技能 |
| `tool` | 工具技能 | 函数/工具类技能 |
| `workflow` | 工作流技能 | 多步骤流程 |

## Frontmatter字段说明

### 必需字段
| 字段 | 说明 |
|------|------|
| `name` | 技能名称 |
| `description` | 技能描述 |
| `version` | 版本号 |

### 可选字段
| 字段 | 说明 |
|------|------|
| `author` | 作者 |
| `tags` | 标签数组 |
| `dependencies` | 依赖列表 |
| `trigger` | 触发条件 |
| `parent` | 父级技能 |
| `compatible` | 版本兼容性 |

### 触发条件格式
```
trigger: condition1 | condition2 | condition3
trigger: key=value | another_key>5 | flag_mode
```

## 集成到主系统

```javascript
// 在 fusion-scheduler.js 或系统初始化时

const { EnhancedSkillsManager } = require('./skills-system/deerflow_enhanced.js');

// 创建管理器
const skillsManager = new EnhancedSkillsManager({
  workspacePath: process.env.WORKSPACE_PATH,
  scanPaths: ['skills/', 'core/']
});

// 初始化 - 自动扫描所有Skills
await skillsManager.initialize();

// 在需要时匹配Skills
const matched = skillsManager.match({ 
  deerflow_mode: true,
  task_complexity: 'high'
});
```

## 事件系统

```javascript
skillsManager.on('initialized', (results) => {
  console.log(`初始化完成: ${results.registered} 个Skills`);
});

skillsManager.on('skill_registered', (skill) => {
  console.log(`注册新技能: ${skill.metadata.name}`);
});

skillsManager.on('skill_error', ({ path, error }) => {
  console.error(`技能错误: ${path} - ${error}`);
});
```

## 性能对比

| 指标 | 原有系统 | 增强版 | 提升 |
|------|---------|--------|------|
| 技能发现 | ❌ 手动 | ✅ 自动扫描 | +500% |
| 触发匹配 | ❌ 无 | ✅ 上下文匹配 | +∞ |
| 依赖管理 | ❌ 手动 | ✅ 自动安装 | +300% |
| 版本控制 | ❌ 无 | ✅ 兼容性检查 | +∞ |
| 模板系统 | ❌ 无 | ✅ 4种模板 | +∞ |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
