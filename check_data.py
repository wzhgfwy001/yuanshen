# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

# 设置输出编码
sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

print("Columns with '水平' or '层次':")
for c in df.columns:
    if '水平' in c or '层次' in c:
        print(f"  {c}")

# 直接用中文列名
col = '院校水平'
print(f"\nUsing column: {col}")
print(f"Non-null count: {df[col].count()}")
print("\nSample values (first 5):")
for i, v in enumerate(df[col].dropna().head(5)):
    print(f"  {i+1}. {v[:80]}")

# 统计各关键词数量
print("\n=== Statistics ===")
for keyword in ['985', '211', '双一流', '普通本科', '本科']:
    count = df[col].fillna('').str.contains(keyword, regex=False).sum()
    print(f"Contains '{keyword}': {count}")
