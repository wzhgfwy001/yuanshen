# -*- coding: utf-8 -*-
import pandas as pd
import os

# Find the xlsx file
workspace = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(workspace) if f.endswith('.xlsx')]

if files:
    filepath = os.path.join(workspace, files[0])
    print(f"文件: {files[0]}\n")
    
    # Read the sheet
    df = pd.read_excel(filepath, sheet_name=0)
    
    # Rename columns to readable format (based on position)
    # The actual columns are in Chinese but garbled due to encoding
    print(f"数据量: {df.shape[0]} 行 x {df.shape[1]} 列\n")
    
    print("=" * 60)
    print("主要列名（第1-20列）:")
    print("=" * 60)
    for i, col in enumerate(df.columns[:20]):
        print(f"{i+1:2d}. {col}")
    
    print("\n" + "=" * 60)
    print("关键数据示例（前5行）:")
    print("=" * 60)
    
    # Show key columns (if we can identify them)
    # The data appears to be:
    # Column 1: 25年选科要求
    # Column 2: 院校名称  
    # Column 3: 学科门类
    # Column 4: 25年专业名称
    # Column 5: 25年计划数
    # Column 6: 25年预测分数
    # Column 7: 25年预测位次
    # Column 8: 24录取分数
    # Column 9: 24录取位次
    
    print("\n前5条数据:")
    print(df[['25����', '25ѡ��Ҫ��', 'ԺУ����', '��ѧ����', '25רҵ����', '25רҵ����', '25��Ԥ�����', '25��Ԥ��λ��']].head().to_string())
