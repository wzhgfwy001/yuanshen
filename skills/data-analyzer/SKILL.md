---
name: data-analyzer
description: "数据分析器 - 分析和汇总Excel、CSV、Word、PDF文件数据，支持多格式输入输出"
version: "1.0.0"
metadata:
  {
    "openclaw":
      {
        "emoji": "📊",
        "category": "data-analysis",
      },
  }
---

# Data Analyzer Skill v1.0

## 核心功能

- 📊 多格式输入：Excel, CSV, Word, PDF, TXT, Markdown
- 📁 文件夹扫描：分析整个文件夹
- 📈 统计分析：求和、平均、趋势
- 🔄 数据合并：合并多个文件
- 📉 可视化：生成图表
- 📋 多格式输出：Markdown, Excel, Word, PDF
- 🌍 多语言：中文、英文输出

## 触发条件

- "分析这个文件夹"
- "对比这些Excel文件"
- "汇总数据"
- "生成数据报告"
- "data-analyzer"

## 使用方法

```python
from data_analyzer import DataAnalyzer

analyzer = DataAnalyzer("C:/path/to/folder")
result = analyzer.generate_summary()
analyzer.export_report("markdown", "report.md")
```

## 目录结构

```
data-analyzer/
├── SKILL.md           # 本文件
├── core/
│   └── data_analyzer.py  # 核心分析代码
├── templates/         # 报告模板
└── config/           # 配置文件
```

## 依赖

- pandas
- openpyxl
- python-docx
- PyMuPDF (fitz)
- matplotlib (可视化)

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-04-07 | 初始版本 |

---

*Created by 混合动态多Agent系统 v1.3.1*
