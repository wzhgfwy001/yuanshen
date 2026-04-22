---
name: deerflow-progressive-processor
description: DeerFlow增强版渐进处理器 - 流式处理、分块执行、检查点保存、可恢复
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | streaming=true | progressive=true | large_data=true
---

# DeerFlow增强版渐进处理器

**【附魔·改】Progressive Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 流式处理 | `streaming=true` | 启用流式处理 |
| 渐进处理 | `progressive=true` | 分块渐进处理 |
| 大数据处理 | `large_data=true` | 处理大数据集 |

## 核心功能

### 1. 渐进处理

```javascript
const { ProgressiveProcessor } = require('./deerflow_enhanced.js');

const processor = new ProgressiveProcessor({
  chunkSize: 100,
  maxConcurrency: 3,
  enableCheckpointing: true,
  checkpointInterval: 5
});

// 处理大量数据
const result = await processor.process(
  largeDataset,  // 数据
  {
    processorFn: async (chunk, index, total) => {
      // 处理每个块
      return await processChunk(chunk);
    },
    aggregatorFn: async (results) => {
      // 聚合所有块的结果
      return results.reduce((acc, r) => [...acc, ...r], []);
    },
    onProgress: (progress) => {
      console.log(`${progress.percent.toFixed(1)}% - ${progress.current}/${progress.total}`);
    }
  }
);
```

### 2. 可恢复处理

```javascript
// 从检查点恢复
const result = await processor.process(
  data,
  {
    processorFn: async (chunk) => processChunk(chunk),
    resumeFromCheckpoint: true  // 从上次中断处恢复
  }
);
```

### 3. 流式处理

```javascript
const { StreamingProcessor } = require('./deerflow_enhanced.js');

const stream = new StreamingProcessor({
  bufferSize: 10,
  flushInterval: 1000
});

// 开始处理
stream.start(async (batch) => {
  console.log(`处理 ${batch.length} 条数据`);
  return await processBatch(batch);
});

// 推送数据
stream.push(data1);
stream.push(data2);
stream.push(data3);

// 停止
await stream.stop();
```

### 4. 进度追踪

```javascript
processor.on('chunk_started', ({ index, total }) => {
  console.log(`开始处理块 ${index + 1}/${total}`);
});

processor.on('chunk_completed', ({ index, duration }) => {
  console.log(`块 ${index + 1} 完成, 耗时 ${duration}ms`);
});

processor.on('checkpoint_saved', ({ index }) => {
  console.log(`检查点保存: ${index}`);
});

processor.on('processing_completed', ({ totalChunks, successful, failed }) => {
  console.log(`完成! 成功: ${successful}, 失败: ${failed}`);
});
```

### 5. 错误处理

```javascript
const processor = new ProgressiveProcessor({
  continueOnError: true  // 遇到错误继续处理
});

processor.on('chunk_failed', ({ index, error }) => {
  console.error(`块 ${index} 失败: ${error}`);
});
```

## 配置选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `chunkSize` | 1000 | 每块数据量 |
| `maxConcurrency` | 3 | 最大并发数 |
| `enableCheckpointing` | true | 启用检查点 |
| `checkpointInterval` | 5 | 检查点间隔 |
| `continueOnError` | false | 错误继续处理 |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
