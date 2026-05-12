---
name: data-analysis-assistant
description: "数据分析助手。Use when user asks to analyze data, generate reports, or create visualizations. Triggers on: '分析数据', 'data analysis', '数据分析', '报表', '统计'."
version: 1.0.0
intranet: compatible
intranet_notes: "支持本地文件分析（Excel/CSV/Word/PDF/TXT），可调用阳神数据分析模块"
metadata:
  {
    "openclaw":
      {
        "emoji": "📊",
        "category": "analysis",
      },
  }
---

# Data Analysis Assistant

## Quick Start

Use this skill when user asks to analyze data or generate reports.

## 内网兼容性

- ✅ `read` - 读取本地数据文件
- ✅ `write` - 写入分析报告
- ✅ `pdf` - 分析本地PDF文件
- ✅ `exec` - 执行Python脚本/命令
- ✅ 阳神数据分析模块 - 已整合 `core/data-analysis/`
- ⚠️ `web_search` - 外网受限
- ⚠️ `web_fetch` - 外网受限

## Analysis Process

1. **Understand the data** - Ask for source and goals
2. **Data cleaning** - Check for missing values, outliers
3. **Descriptive statistics** - Mean, median, distribution
4. **Identify patterns** - Trends, correlations, anomalies
5. **Generate insights** - What does the data tell us?
6. **Create visualizations** - Charts, tables, dashboards

## Output Format

```markdown
## 📊 Data Analysis Report

### 数据概况
- 数据来源: [source]
- 数据量: [count] 条
- 时间范围: [period]

### 描述性统计
| 指标 | 数值 |
|------|------|
| 均值 | X |
| 中位数 | Y |
| 标准差 | Z |

### 关键发现
1. **[Insight 1]** - [explanation]
2. **[Insight 2]** - [explanation]
3. **[Insight 3]** - [explanation]

### 可视化建议
- [Chart type] for [purpose]
- [Chart type] for [purpose]

### 结论与建议
[Summary and recommendations]
```

## Common Analysis Types

| Type | Use Case | Key Metrics |
|------|----------|-------------|
| Sales | Revenue trends | YoY growth, MoM change |
| User Behavior | Engagement | DAU, retention, churn |
| Marketing | Campaign ROI | CTR, conversion rate |
| Financial | Health | Profit margin, burn rate |

## 内网使用提示

1. **提供数据文件** - Excel/CSV/Word/PDF/TXT 均可
2. **明确分析目标** - 说明想要了解什么
3. **数据脱敏** - 如有敏感数据请提前处理
4. **报告格式** - 支持 Markdown/Excel/HTML 输出

## 阳神系统集成

本技能已集成阳神数据分析模块，文件路径：
`skills/dynamic-multi-agent-system/core/data-analysis/`

---
