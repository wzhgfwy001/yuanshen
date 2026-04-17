---
name: result-reuse
description: 结果复用器，识别相似任务，复用历史结果或微调后复用，大幅节省 Token
parent: dynamic-multi-agent-system
version: 1.1.0
---

# 结果复用器 v1.1

## 核心价值

| 价值 | 说明 | 效果 |
|------|------|------|
| 零 Token 复用 | 直接返回历史结果 | 100% 节省 |
| 微调复用 | 基于历史结果修改 | 70-80% 节省 |
| 部分复用 | 复用部分章节/段落 | 40-60% 节省 |

---

## 复用策略

| 策略 | 相似度 | 节省 | 适用场景 |
|------|--------|------|----------|
| 直接复用 | ≥0.95 | 100% | 完全相同任务 |
| 微调复用 | ≥0.85 | 70-80% | 高度相似任务 |
| 部分复用 | ≥0.70 | 40-60% | 中度相似任务 |

**详细策略配置：** [references/REUSE-STRATEGIES.md](references/REUSE-STRATEGIES.md)

---

## 快速使用

```typescript
const reuse = new ResultReuse({
  similarityThreshold: 0.85,
  maxHistoricalResults: 10000,
  enableSemanticSearch: true,
});

const result = await reuse.process(task, async () => {
  return await callAPI(prompt);
});

console.log(`节省 Token: ${result.tokenSaved}`);
```

---

## 相似度计算

| 类型 | 权重 | 说明 |
|------|------|------|
| 语义相似度 | 70% | 基于嵌入模型 |
| 结构相似度 | 30% | 任务类型、格式、领域 |

**完整相似度算法：** [references/REUSE-STRATEGIES.md](references/REUSE-STRATEGIES.md)

---

## 最佳实践

### ✅ 推荐
1. **启用语义搜索** - 更准确匹配
2. **定期清理** - 删除过时结果
3. **设置合理阈值** - 平衡质量和节省

### ❌ 避免
1. **过度复用** - 质量可能下降
2. **忽略时效性** - 内容可能过时
3. **无限增长** - 定期清理

---

*详细复用策略和代码示例见 references/REUSE-STRATEGIES.md*
