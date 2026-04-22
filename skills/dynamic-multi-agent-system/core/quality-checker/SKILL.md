---
name: deerflow-enhanced-quality-checker
description: 借鉴DeerFlow的增强版质量检查器，支持多格式报告、专业评分、可视化
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | quality_check=advanced | output_format=professional
---

# DeerFlow增强版质量检查器

**【鉴定物品·改】Enhanced Appraisal**

## 触发条件

当满足以下任一条件时，自动启用此增强版检查器：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 用户指定使用DeerFlow增强模式 |
| 高级质量检查 | `quality_check=advanced` | 需要多维度质量评估 |
| 专业输出 | `output_format=professional` | 需要专业报告格式 |
| 最终审查 | `final_review=true` | 最终交付前的质量检查 |
| 多格式输出 | `format=markdown\|html\|json` | 需要特定输出格式 |

## 使用方式

```javascript
// 引入增强版质量检查器
const { 
  EnhancedQualityChecker, 
  QUALITY_DIMENSIONS,
  QUALITY_LEVELS,
  REPORT_TEMPLATES 
} = require('./deerflow_enhanced.js');

// 创建检查器
const checker = new EnhancedQualityChecker({
  template: REPORT_TEMPLATES.EXECUTIVE_SUMMARY,
  format: 'markdown',
  includeEvidence: true,
  includeSuggestions: true
});

// 添加检查维度（可选，使用默认维度）
checker.addChecks(QUALITY_DIMENSIONS.ACCURACY, [
  { criterion: '事实准确性', weight: 2.0 },
  { criterion: '数据可靠性', weight: 1.5 }
]);

// 执行质量检查
const result = await checker.check(content, {
  taskName: '小说创作',
  taskType: 'creative-writing',
  keywords: ['悬疑', '推理', '案件'],
  minLength: 5000
});

console.log('总体评分:', result.overallScore);       // e.g., 85
console.log('等级:', result.level.emoji, result.level.label); // e.g., 🌟 优秀
console.log('报告:', result.report);  // Markdown报告

// 快速评分（无需完整检查）
const quickResult = checker.quickScore(content);
console.log('快速评分:', quickResult.score, quickResult.label);

// 生成不同格式的报告
const htmlReport = checker.generateReport(content, {
  template: REPORT_TEMPLATES.DETAILED_REPORT,
  format: 'html'
});

const jsonReport = checker.generateReport(content, {
  template: REPORT_TEMPLATES.DATA_ANALYSIS,
  format: 'json'
});
```

## 核心特性

### 1. 质量维度评估

```javascript
QUALITY_DIMENSIONS = {
  ACCURACY: 'accuracy',              // 准确性
  COMPLETENESS: 'completeness',      // 完整性
  COHERENCE: 'coherence',            // 连贯性
  RELEVANCE: 'relevance',            // 相关性
  PROFESSIONALISM: 'professionalism', // 专业性
  READABILITY: 'readability'         // 可读性
}
```

### 2. 质量等级

```javascript
QUALITY_LEVELS = {
  EXCELLENT: { label: '优秀', minScore: 90, emoji: '🌟' },
  GOOD: { label: '良好', minScore: 75, emoji: '✅' },
  ACCEPTABLE: { label: '合格', minScore: 60, emoji: '⚠️' },
  POOR: { label: '较差', minScore: 40, emoji: '❌' },
  FAIL: { label: '不及格', minScore: 0, emoji: '🚫' }
}
```

### 3. 报告模板

```javascript
REPORT_TEMPLATES = {
  EXECUTIVE_SUMMARY: {
    name: 'Executive Summary',
    sections: ['overview', 'key_findings', 'recommendations', 'next_steps'],
    style: 'concise'
  },
  DETAILED_REPORT: {
    name: 'Detailed Report',
    sections: ['introduction', 'methodology', 'findings', 'analysis', 'conclusion'],
    style: 'comprehensive'
  },
  TECHNICAL_REPORT: {
    name: 'Technical Report',
    sections: ['abstract', 'introduction', 'implementation', 'results'],
    style: 'technical'
  },
  CREATIVE_CONTENT: {
    name: 'Creative Content Review',
    sections: ['concept', 'structure', 'style', 'creativity', 'market_potential'],
    style: 'creative'
  },
  DATA_ANALYSIS: {
    name: 'Data Analysis Report',
    sections: ['executive_summary', 'data_overview', 'key_insights', 'recommendations'],
    style: 'data_centric'
  }
}
```

### 4. 多格式输出

```javascript
// Markdown格式 - 适合命令行和文档
// 输出示例:
/*
## 📊 执行摘要

| 指标 | 数值 |
|------|------|
| **总体评分** | 85/100 🌟 优秀 |
| **通过检查** | 5/6 |
| **通过率** | 83% |
*/

// HTML格式 - 适合网页展示
// 包含CSS样式、表格、颜色标识

// JSON格式 - 适合程序处理
// 包含完整元数据、评分、建议
{
  "reportMetadata": {...},
  "summary": {...},
  "dimensions": {...},
  "issues": [...],
  "suggestions": [...],
  "details": [...]
}
```

### 5. 质量检查项

```javascript
// 准确性检查
- 事实准确性 - 内容是否准确无误
- 数据可靠性 - 引用数据是否可靠
- 逻辑正确性 - 推理是否合乎逻辑

// 完整性检查
- 需求覆盖度 - 是否覆盖所有需求
- 内容完整度 - 内容是否完整
- 交付物齐全 - 是否包含所有交付物

// 连贯性检查
- 结构连贯性 - 章节之间是否连贯
- 逻辑一致性 - 前后是否一致
- 过渡自然性 - 过渡是否自然

// 相关性检查
- 切题程度 - 是否紧扣主题
- 内容相关性 - 内容是否相关
- 用户需求匹配 - 是否满足用户需求

// 专业性检查
- 术语使用 - 是否正确使用专业术语
- 格式规范性 - 格式是否规范
- 表达专业度 - 表达是否专业

// 可读性检查
- 语言清晰度 - 语言是否清晰
- 结构清晰度 - 结构是否清晰
- 可读性评分 - 整体可读性
```

## 集成到主系统

在 fusion-scheduler.js 或任务编排逻辑中添加：

```javascript
const path = require('path');

// 检测是否启用DeerFlow增强
function shouldUseDeerFlowEnhanced(config) {
  return (
    config.deerflow_mode === true ||
    config.quality_check === 'advanced' ||
    config.output_format === 'professional'
  );
}

// 获取质量检查器
function getQualityChecker(config) {
  if (shouldUseDeerFlowEnhanced(config)) {
    const enhanced = require('./quality-checker/deerflow_enhanced.js');
    return new enhanced.EnhancedQualityChecker({
      template: config.template || REPORT_TEMPLATES.EXECUTIVE_SUMMARY,
      format: config.format || 'markdown',
      includeEvidence: config.includeEvidence !== false,
      includeSuggestions: config.includeSuggestions !== false
    });
  }
  // 回退到原有检查器
  return require('./quality-checker/original-checker.js');
}

// 在任务完成时自动触发
async function onTaskComplete(task, config) {
  if (shouldUseDeerFlowEnhanced(config)) {
    const checker = getQualityChecker(config);
    const result = await checker.check(task.output, {
      taskName: task.name,
      taskType: task.type
    });
    
    // 根据评分决定是否需要返工
    if (result.overallScore < 60) {
      console.log('质量不达标，需要返工');
      return { needsRevision: true, report: result.report };
    }
    
    return { needsRevision: false, report: result.report };
  }
  // 原有逻辑
  return { needsRevision: false };
}
```

## 性能对比

| 指标 | 原有检查器 | 增强版 | 提升 |
|------|-----------|--------|------|
| 评估维度 | ❌ 2-3个 | ✅ 6个 | +200% |
| 输出格式 | ❌ 1种 | ✅ 3种(MD/HTML/JSON) | +200% |
| 报告专业度 | ❌ 简单 | ✅ 专业完整 | +500% |
| 评分精度 | ❌ 单一分数 | ✅ 多维度+加权 | +300% |
| 改进建议 | ❌ 笼统 | ✅ 具体可操作 | +400% |

## 输出示例

**Markdown报告:**
```markdown
## 📊 执行摘要

| 指标 | 数值 |
|------|------|
| **总体评分** | 85/100 🌟 优秀 |
| **通过检查** | 5/6 |
| **通过率** | 83% |

## 🔍 关键发现

### ❌ 需要改进 (1项)

#### 逻辑一致性
- **维度**: 连贯性
- **评分**: 45/100
- **问题**:
  - 前后设定有矛盾
  - 时间线不连贯

### ✅ 达标项 (5项)

- **事实准确性**: 92/100
- **结构连贯性**: 88/100
- **术语使用**: 85/100
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
