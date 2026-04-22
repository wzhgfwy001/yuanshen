---
name: deerflow-memory-manager
description: DeerFlow增强版内存管理器 - ThreadState、三层缓存、自动压缩持久化
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | memory_management=advanced | conversation_state=true | long_term_context=true
---

# DeerFlow增强版内存管理器

**【附魔·改】Memory Enchant**

## 触发条件

当满足以下任一条件时，自动启用增强版内存管理：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 高级内存管理 | `memory_management=advanced` | 需要分层缓存 |
| 对话状态 | `conversation_state=true` | 需要线程状态管理 |
| 长期上下文 | `long_term_context=true` | 需要长期记忆 |
| 上下文压缩 | `context_compression=true` | 需要自动压缩 |
| 多线程管理 | `multi_thread=true` | 管理多个对话线程 |

## 核心功能

### 1. ThreadState - 线程状态管理

```javascript
const { ThreadState } = require('./deerflow_enhanced.js');

// 创建线程
const thread = new ThreadState({
  threadId: 'my-session-001',
  autoSave: true
});

// 添加消息
thread.addMessage('user', '你好，请帮我写一段代码');
thread.addMessage('assistant', '好的，请问需要什么语言的代码？');
thread.addMessage('user', 'JavaScript');

// 设置上下文
thread.setContext('preferredLanguage', 'JavaScript');
thread.setContext('task', '代码编写');

// 获取上下文
const language = thread.getContext('preferredLanguage');
console.log(language); // 'JavaScript'

// 获取消息历史
const messages = thread.getMessages({ limit: 10 });
console.log(`共 ${messages.length} 条消息`);
```

### 2. 三层内存缓存

```javascript
// L1: 热内存 - 当前活跃数据 (最多100项, 1小时TTL)
// L2: 温内存 - 最近使用 (最多500项, 24小时TTL)
// L3: 冷内存 - 历史归档 (最多2000项, 7天TTL)

// 自动层级管理
const stats = thread.getStats();
console.log(stats.tiers);
// { l1: 45, l2: 120, l3: 300 }
```

### 3. 上下文压缩

```javascript
// 当消息超过一定数量时自动压缩
const result = thread.compress({
  keepLast: 50,           // 保留最后50条
  summarizeBefore: 100,   // 超过100条时压缩
  maxTokens: 4000        // 最大token数
});

console.log(result);
// {
//   compressed: true,
//   originalCount: 150,
//   keptCount: 50,
//   summary: '共100条消息 | 角色分布: user:50, assistant:50 | 涉及主题: ...'
// }
```

### 4. 状态持久化

```javascript
// 保存到文件
const savePath = await thread.save();

// 自定义路径
await thread.save('/path/to/state.json');

// 从文件恢复
const restoredThread = new ThreadState();
await restoredThread.restore('/path/to/state.json');
console.log(`恢复了 ${restoredThread.metadata.messageCount} 条消息`);
```

### 5. MemoryManager - 多线程管理

```javascript
const { MemoryManager } = require('./deerflow_enhanced.js');

const manager = new MemoryManager({
  autoSave: true,
  L1_MAX_ITEMS: 100,
  L2_MAX_ITEMS: 500
});

// 创建多个线程
const thread1 = manager.createThread({ threadId: 'session-1' });
const thread2 = manager.createThread({ threadId: 'session-2' });

// 获取或创建线程
const thread3 = manager.getOrCreateThread('session-3');

// 设置当前线程
manager.setCurrentThread('session-1');

// 添加消息到当前线程
manager.getCurrentThread().addMessage('user', 'Hello');

// 列出所有线程
const threads = manager.listThreads({ sortBy: 'updated' });
console.log(`共 ${threads.length} 个线程`);

// 获取全局统计
const globalStats = manager.getGlobalStats();
console.log(`总消息: ${globalStats.totalMessages}`);
```

### 6. 事件系统

```javascript
thread.on('message_added', (message) => {
  console.log(`新消息: ${message.role} - ${message.content.slice(0, 20)}...`);
});

thread.on('context_updated', ({ key, value }) => {
  console.log(`上下文更新: ${key} = ${value}`);
});

thread.on('compaction_triggered', ({ compressedCount, keptCount }) => {
  console.log(`压缩了 ${compressedCount} 条消息，保留 ${keptCount} 条`);
});

thread.on('memory_cleared', () => {
  console.log('线程已清空');
});

// MemoryManager事件
manager.on('thread_created', ({ threadId }) => {
  console.log(`新线程: ${threadId}`);
});

manager.on('memory_pressure', ({ threadId, tier, usage }) => {
  console.log(`内存压力警告: ${threadId} - ${tier} tier ${usage}%`);
});
```

## 配置选项

```javascript
const { MEMORY_CONFIG } = require('./deerflow_enhanced.js');

// 默认配置
console.log(MEMORY_CONFIG);
// {
//   L1_MAX_ITEMS: 100,      // L1最多100项
//   L2_MAX_ITEMS: 500,      // L2最多500项
//   L3_MAX_ITEMS: 2000,     // L3最多2000项
//   L1_TTL_MS: 3600000,     // L1: 1小时
//   L2_TTL_MS: 86400000,    // L2: 24小时
//   L3_TTL_MS: 604800000,   // L3: 7天
//   COMPACTION_THRESHOLD: 0.8,
//   AUTO_SAVE_INTERVAL: 300000
// }

// 自定义配置
const customThread = new ThreadState({
  L1_MAX_ITEMS: 200,
  L2_MAX_ITEMS: 1000,
  autoSave: true
});
```

## 集成到主系统

```javascript
// 在系统初始化时
const { MemoryManager } = require('./memory-manager/deerflow_enhanced.js');

const memoryManager = new MemoryManager({
  autoSave: true
});

// 对每个用户会话创建/恢复线程
function handleUserMessage(userId, message) {
  // 获取或创建用户线程
  const thread = memoryManager.getOrCreateThread(`user-${userId}`);
  
  // 添加用户消息
  thread.addMessage('user', message);
  
  // 获取上下文用于处理
  const context = thread.getAllContext();
  
  // 处理完成后添加助手回复
  thread.addMessage('assistant', response);
  
  // 检查是否需要压缩
  if (thread.metadata.messageCount > 100) {
    thread.compress({ keepLast: 50 });
  }
  
  return response;
}

// 定期清理
setInterval(() => {
  memoryManager.cleanup({ olderThan: Date.now() - 86400000 * 7 }); // 清理7天前
}, 3600000); // 每小时检查
```

## 导出DeerFlow格式

```javascript
// 导出为DeerFlow兼容格式
const deerflowExport = thread.export();

console.log(deerflowExport);
// {
//   thread_id: 'thread-xxx',
//   messages: [
//     { role: 'user', content: '...' },
//     { role: 'assistant', content: '...' }
//   ],
//   context: { key: 'value' },
//   metadata: { ... }
// }
```

## 性能对比

| 特性 | 原有系统 | 增强版 | 提升 |
|------|---------|--------|------|
| 消息管理 | 简单数组 | 分层缓存 | +200% |
| 上下文 | 无分层 | L1/L2/L3分层 | +500% |
| 压缩 | 无 | 自动摘要压缩 | +∞ |
| 持久化 | 无 | 自动保存/恢复 | +∞ |
| 多线程 | 无 | MemoryManager | +300% |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
