---
name: model-selector
description: 智能模型选择器，根据任务复杂度、预算、延迟要求自动选择最优模型，支持成本优化和性能预测
parent: dynamic-multi-agent-system
version: 2.1.0
---

# model-selector

**【奥术智慧】Arcane Intel — 模型选择器** - 

## 功能概述

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 任务复杂度评估 | 自动分析任务难度 | ⭐⭐⭐⭐⭐ |
| 成本优化 | 同等效果选更便宜的模型 | ⭐⭐⭐⭐⭐ |
| 备选模型自动切换 | 主模型失败自动切换 | ⭐⭐⭐⭐⭐ |
| 模型质量评分 | 实时评分，动态调整 | ⭐⭐⭐⭐ |

---

## 模型矩阵

| 模型 | 能力 | 速度 | 成本 | 上下文 | 适用场景 |
|------|------|------|------|--------|----------|
| MiniMax-M2.5 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ¥ | 32K | 简单任务 |
| MiniMax-M2.7 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ¥¥ | 32K | 标准任务 |
| Qwen3-Coder | ⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥ | 32K | 代码开发 |
| Qwen3.5-Plus | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥¥ | 32K | 平衡任务 |
| Qwen3-Max | ⭐⭐⭐⭐⭐ | ⭐⭐ | ¥¥¥¥ | 32K | 复杂推理 |
| Qwen3.5-Max | ⭐⭐⭐⭐⭐ | ⭐⭐ | ¥¥¥¥ | 128K | 长文本 |
| GPT-4o | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥¥¥ | 128K | 国际场景 |
| Claude-3.5 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ¥¥¥¥ | 200K | 长文本分析 |

**详细模型规格：** [references/MODEL-MATRIX.md](references/MODEL-MATRIX.md)

---

## 快速使用

```typescript
const selector = new IntelligentModelSelector();

const profile = selector.analyzeTask({
  description: '撰写一篇3000字的产品分析报告',
  expectedLength: '3000字'
});

const recommendations = selector.select(profile, { preferQuality: true });
console.log(`最优模型：${recommendations[0].model}`);

const cost = selector.estimateCost(recommendations[0].model, inputTokens, outputTokens);
```

---

## Fallback Chain

| 场景 | 主模型 | Fallback链 |
|------|--------|------------|
| 高质量 | qwen3.5-max | → qwen3-max → qwen3.5-plus → minimax-m2.7 |
| 平衡 | qwen3.5-plus | → qwen3-max → minimax-m2.7 |
| 速度优先 | minimax-m2.7 | → minimax-m2.5 → qwen3.5-plus |
| 代码 | qwen3-coder-plus | → qwen3.5-plus → minimax-m2.7 |
| 长文本 | claude-3.5 | → qwen3.5-max → qwen3.5-plus |

**完整Fallback配置：** [references/MODEL-MATRIX.md](references/MODEL-MATRIX.md)

---

## 成本优化

- 启用成本优化后，平均节省 30-40%
- 支持同效果选更便宜模型
- 自动推荐成本节省方案

---

## 最佳实践

### ✅ 推荐
1. **使用复杂度评估** - 用 `analyzeTask()` 不要手动估算
2. **开启成本优化** - 定期检查优化建议
3. **配置Fallback链** - 根据任务类型选择

### ❌ 避免
1. **固定最强模型** - 造成不必要的成本浪费
2. **忽略Fallback** - 单点故障风险高
3. **不看质量评分** - 可能选到近期表现差的模型

---

*详细模型矩阵和Fallback链见 references/MODEL-MATRIX.md*
