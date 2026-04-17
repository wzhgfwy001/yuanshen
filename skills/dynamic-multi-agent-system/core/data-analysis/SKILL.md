# Data Analysis Module v1.0

**模块等级：** 核心模块  
**版本：** 1.0.0  
**父系统：** 混合动态多Agent协作系统 v1.6.0  
**来源：** 原 data-analyzer Skill v1.0.0

---

## 概述

本模块是从独立 Skill `data-analyzer` 整合而来的数据分析核心引擎，提供多格式文件分析、统计汇总和数据报告生成能力。

## 核心功能

| 功能 | 说明 |
|------|------|
| 多格式分析 | Excel, CSV, Word, PDF, TXT, Markdown |
| 文件夹扫描 | 递归扫描目录下的所有支持文件 |
| 统计分析 | 行数/列数/数据类型/缺失值/描述性统计 |
| 数据对比 | 对比多个文件的结构与内容 |
| 数据合并 | 合并多个同构数据文件 |
| 报告导出 | Markdown / Excel 格式报告 |

## 触发场景

- 子Agent执行数据处理任务时
- 需要分析上传的 Excel/CSV 数据文件
- 需要对文件夹进行批量数据汇总
- 数据报告自动生成

## 核心类

```python
from core.data_analysis.data_analyzer import DataAnalyzer

analyzer = DataAnalyzer("C:/path/to/folder")
result = analyzer.generate_summary()
analyzer.export_report("markdown", "report.md")
```

## 主要方法

| 方法 | 说明 |
|------|------|
| `DataAnalyzer(folder_path)` | 初始化，扫描文件夹 |
| `analyze_file(path)` | 分析单个文件 |
| `generate_summary()` | 生成分析摘要 |
| `compare_files(paths)` | 对比多个文件 |
| `merge_data(paths, output)` | 合并数据文件 |
| `export_report(format, path)` | 导出报告 |

## 依赖

| 依赖 | 用途 |
|------|------|
| pandas | 数据分析核心 |
| openpyxl | Excel 读写 |
| python-docx | Word 读写 |
| PyMuPDF (fitz) | PDF 解析 |
| matplotlib | 可视化图表 |

## 使用示例

### 示例1：分析文件夹

```python
analyzer = DataAnalyzer("C:/data/reports")
summary = analyzer.generate_summary()
print(f"共 {summary['total_files']} 个文件")
```

### 示例2：对比多个文件

```python
analyzer = DataAnalyzer()
result = analyzer.compare_files(["file1.csv", "file2.csv"])
```

### 示例3：导出 Markdown 报告

```python
analyzer = DataAnalyzer("C:/data")
analyzer.generate_summary()
report = analyzer.export_report("markdown", "report.md", title="月度数据报告")
```

---

*整合自 data-analyzer v1.0.0，原模块已废弃*
