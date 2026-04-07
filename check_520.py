# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

col = '院校水平'

# 统计各类学校
has_985 = df[col].fillna('').str.contains('985').sum()
has_211 = df[col].fillna('').str.contains('211').sum()
has_shuang = df[col].fillna('').str.contains('双一流').sum()
has_benke = df[col].fillna('').str.contains('本科').sum()

print(f"总数据: {len(df)} 条")
print(f"\n学校层次统计:")
print(f"  含985: {has_985}")
print(f"  含211: {has_211}")
print(f"  含双一流: {has_shuang}")
print(f"  含本科: {has_benke}")

# 不含985/211/双一流的 - 这些是普通本科
plain = df[~df[col].fillna('').str.contains('985|211|双一流', regex=True)]
print(f"\n普通本科(不含985/211/双一流): {len(plain)} 条")

# 看看普通本科的分数分布
if len(plain) > 0:
    score_col = '25年预测分数'
    print(f"\n普通本科分数分布:")
    for low, high in [(400, 450), (450, 500), (500, 550), (550, 600), (600, 700)]:
        count = ((plain[score_col] >= low) & (plain[score_col] < high)).sum()
        print(f"  {low}-{high}分: {count} 条")
else:
    print("\n数据中只有985/211/双一流学校，没有普通本科学校！")
