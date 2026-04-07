# -*- coding: utf-8 -*-
"""
数据质量检查脚本
使用 Data Analyzer Skill 进行数据质量评估
"""
import sys
sys.path.insert(0, 'C:/Users/DELL/.openclaw/workspace/skills/data-analyzer')
from core.data_analyzer import DataAnalyzer
from pathlib import Path

def check_data_quality():
    """检查数据质量"""
    data_dir = Path('C:/Users/DELL/.openclaw/workspace/excel-filter-project/data')
    output_file = 'C:/Users/DELL/.openclaw/workspace/excel-filter-project/docs/DATA-QUALITY-REPORT.md'
    
    print("=== 高考志愿系统数据质量检查 ===\n")
    
    # 扫描数据文件
    analyzer = DataAnalyzer(str(data_dir))
    result = analyzer.generate_summary()
    
    # 生成报告
    report = "# 数据质量报告\n\n"
    report += "**生成时间：** 2026-04-07\n"
    report += f"**数据目录：** {data_dir}\n\n"
    report += "---\n\n"
    report += "## 摘要\n\n"
    report += f"| 指标 | 数值 |\n"
    report += f"|------|------|\n"
    report += f"| 总文件数 | {result['total_files']} |\n"
    
    for ftype, count in result['file_count_by_type'].items():
        if count > 0:
            report += f"| {ftype.upper()}文件 | {count} |\n"
    
    report += "\n---\n\n## 文件详情\n\n"
    
    for item in analyzer.analysis_results:
        report += f"### {item['name']}\n\n"
        report += f"- **类型：** {item['type']}\n"
        
        if item['analysis'].get('success'):
            analysis = item['analysis']
            if 'rows' in analysis:
                report += f"- **行数：** {analysis['rows']}\n"
            if 'columns' in analysis:
                report += f"- **列数：** {analysis['columns']}\n"
            if 'column_names' in analysis:
                cols = analysis['column_names']
                report += f"- **列名：** {', '.join(str(c) for c in cols[:10])}"
                if len(cols) > 10:
                    report += f" ... (+{len(cols)-10}列)"
                report += "\n"
        else:
            report += f"- **状态：** 分析失败\n"
        
        report += "\n"
    
    # 保存报告
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"报告已生成: {output_file}")
    return result

if __name__ == '__main__':
    check_data_quality()
