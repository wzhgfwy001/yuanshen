---
name: deerflow-brain
description: DeerFlow增强版大脑系统 - 长期记忆、记忆检索、上下文管理、知识图谱
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | memory=true | brain=true | knowledge_graph=true
---

# DeerFlow增强版大脑系统

**【附魔·改】Brain Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 记忆系统 | `memory=true` | 启用记忆 |
| 大脑系统 | `brain=true` | 使用大脑系统 |

## 核心功能

### 1. 记忆存储

```javascript
const { Brain } = require('./deerflow_enhanced.js');

const brain = new Brain();

// 存储记忆
brain.remember('user-name', 'John', {
  type: 'fact',
  importance: 0.9,
  tags: ['user', 'personal']
});

brain.remember('last-task', { id: 1, status: 'completed' }, {
  type: 'experience'
});
```

### 2. 记忆检索

```javascript
// 精确检索
const name = brain.recall('user-name');

// 搜索
const results = brain.search('user', {
  tags: ['user'],
  limit: 10
});
```

### 3. 上下文管理

```javascript
// 设置上下文
brain.setContext('currentUser', 'John');
brain.setContext('sessionId', 'abc123');

// 获取上下文
const user = brain.getContext('currentUser');

// 获取所有上下文
const all = brain.getAllContext();
```

### 4. 对话历史

```javascript
// 添加对话
brain.addToHistory('user', 'Hello');
brain.addToHistory('assistant', 'Hi there!');

// 获取历史
const history = brain.getHistory(50);
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
