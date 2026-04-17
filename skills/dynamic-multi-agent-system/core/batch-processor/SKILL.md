---
name: batch-processor
description: 批量处理器，将多个相似任务合并为一次 API 调用，大幅节省 Token
parent: dynamic-multi-agent-system
version: 1.1.0
---

# 批量处理器 v1.1

## 核心优势

| 优势 | 说明 | 节省效果 |
|------|------|----------|
| 减少调用次数 | N 个任务 → 1 次调用 | N-1 次节省 |
| 减少 Token | 共享上下文和提示 | 50-70% 节省 |
| 提高速度 | 并行处理 | 2-5 倍提升 |
| 保持一致性 | 同一模型同一批次 | 质量稳定 |

---

## 批量策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `simple` | 共享提示模板 | 翻译、总结 |
| `structured` | JSON 格式批量 | 数据处理、填充 |
| `template` | 槽位填充 | 情感分析、分类 |

**详细策略配置：** [references/BATCH-STRATEGIES.md](references/BATCH-STRATEGIES.md)

---

## 快速使用

```typescript
const processor = new BatchProcessor({
  maxBatchSize: 20,
  timeout: 60000,
  retryFailed: true,
});

const tasks = [
  { type: 'translate', content: '你好' },
  { type: 'translate', content: '谢谢' },
  { type: 'translate', content: '再见' },
];

const results = await processor.process(tasks);
```

---

## 批量大小优化

| 场景 | 推荐大小 |
|------|----------|
| 简单任务 | 10-20 个 |
| 复杂任务 | 5-10 个 |
| 超长上下文 | 3-5 个 |

---

## 最佳实践

### ✅ 推荐
1. **识别相似任务** - 相同类型、结构、格式
2. **设置合理批量** - 10-20 个最佳
3. **使用结构化输出** - JSON 格式易解析
4. **处理部分失败** - 支持重试单个项目

### ❌ 避免
1. **过度批量** - 太大可能超时或降低质量
2. **混合类型** - 不同类型任务不要批量
3. **依赖任务** - 有依赖关系的任务不能批量
4. **忽略错误** - 需要处理部分失败

---

*详细批量策略和场景示例见 references/BATCH-STRATEGIES.md*
