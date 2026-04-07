# -*- coding: utf-8 -*-
"""测试Data Analyzer"""
import sys
sys.path.insert(0, 'C:/Users/DELL/.openclaw/workspace/skills/data-analyzer')
from core.data_analyzer import DataAnalyzer

# 分析数据文件夹
analyzer = DataAnalyzer('C:/Users/DELL/.openclaw/workspace/excel-filter-project/data')
result = analyzer.generate_summary()

print('=== 数据分析结果 ===')
print('总文件数:', result['total_files'])
for ftype, count in result['file_count_by_type'].items():
    if count > 0:
        print(f'  {ftype}: {count}个')

print('\n=== 文件详情 ===')
for detail in result['file_details']:
    print(f"文件名: {detail['name']}")
    print(f"类型: {detail['type']}")
    print(f"状态: {detail['status']}")
    print('---')
