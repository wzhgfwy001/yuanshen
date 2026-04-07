# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

req_col = '25选科要求'
level_col = '院校水平'
score_col = '25年预测分数'

# 587分，985/211/双一流
base = df[(df[score_col] >= 567) & (df[score_col] <= 607)]
base = base[base['省份'].isin(['山东', '浙江', '江苏'])]
elite = base[base[level_col].fillna('').str.contains('985|211|双一流', regex=True)]

print(f"elite count: {len(elite)}")

# 直接测试str.contains
test1 = elite[elite[req_col].fillna('').str.contains('物理')]
print(f"contains '物理': {len(test1)}")

test2 = elite[elite[req_col].fillna('').str.contains('化学')]
print(f"contains '化学': {len(test2)}")

test3 = elite[elite[req_col].fillna('').str.contains('生物')]
print(f"contains '生物': {len(test3)}")

# 合并测试
test4 = elite[elite[req_col].fillna('').str.contains('物理|化学|生物', regex=False)]
print(f"contains '物理|化学|生物': {len(test4)}")

# 看几个样本的原始bytes
print(f"\n=== 样本分析 ===")
for v in elite[req_col].dropna().head(5):
    print(f"Value: {repr(v)}")
    print(f"  Bytes: {v.encode('utf-8')}")
    print(f"  Contains '物理': {'物理' in str(v)}")
