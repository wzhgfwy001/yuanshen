# Multi-Model API Guide

> 详细指南：如何在混合动态多Agent系统中选择和使用多种AI模型。

## 模型对比

| Provider | 模型 | 上下文 | 输入价格 | 输出价格 | 最佳场景 |
|----------|------|--------|----------|----------|----------|
| OpenAI | GPT-4-Turbo | 128K | $10/1M | $30/1M | 复杂推理、代码 |
| OpenAI | GPT-3.5-Turbo | 16K | $0.5/1M | $1.5/1M | 快速响应 |
| Anthropic | Claude-3-Opus | 200K | $15/1M | $75/1M | 高质量内容 |
| Anthropic | Claude-3-Sonnet | 200K | $3/1M | $15/1M | 平衡场景 |
| Anthropic | Claude-3-Haiku | 200K | $0.25/1M | $1.25/1M | 快速简单任务 |
| Google | Gemini-Pro | 32K | $0.25/1M | $1.25/1M | 多模态 |
| Local | Llama-2-70B | 4K | Free | Free | 隐私敏感 |

## 选择策略

### 按任务类型

| 任务 | 推荐模型 | 原因 |
|------|----------|------|
| 代码生成/审查 | GPT-4, Claude-3-Opus | 上下文理解强 |
| 创意写作 | Claude-3-Sonnet | 平衡质量成本 |
| 快速问答 | GPT-3.5, Haiku | 速度快、成本低 |
| 长文档分析 | Claude-3-Opus/Sonnet | 200K上下文 |
| 多语言翻译 | GPT-4, Gemini | 多语言优化 |
| 隐私数据处理 | 本地模型 | 数据不出网 |

### 按成本预算

```
预算有限: Haiku → GPT-3.5 → Sonnet → Opus/GPT-4
预算充足: Opus → GPT-4 → Sonnet
```

### 按响应速度

```
最快: Haiku (150 tokens/s)
  → GPT-3.5 (80 tokens/s)
  → Sonnet (60 tokens/s)
  → Opus/GPT-4 (40 tokens/s)
```

## 成本优化技巧

1. **使用合适的温度值**
   - 创意写作: 0.7-0.9
   - 一般对话: 0.5-0.7
   - 精确任务: 0.1-0.3

2. **限制maxTokens**
   - 避免过度生成
   - 设置合理的上限

3. **使用缓存**
   - 启用结果缓存
   - 减少重复请求

4. **批量处理**
   - 合并多个请求
   - 减少API调用次数

## 熔断配置

```typescript
const api = new APIClient(registry, {
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    halfOpenRequests: 3,
  },
});
```

## 最佳实践

1. 始终设置fallback模型
2. 监控成本和用量
3. 使用流式响应提升体验
4. 实现重试机制
5. 记录所有API调用
