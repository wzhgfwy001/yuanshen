# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

score_col = '25年预测分数'
level_col = '院校水平'
prov_col = '省份'
req_col = '25选考要求'

# 587分
total = 587
d_min = -20  # 冲刺线
d_max = 20   # 保底线

print(f"=== 587分数据测试 ===\n")

# 1. 分数范围 (total - 20) 到 (total + 20)
score_df = df[(df[score_col] >= total - 20) & (df[score_col] <= total + 20)]
print(f"1. 分数范围567-607分: {len(score_df)} 条")

# 2. 省份筛选
score_df = score_df[score_df[prov_col].isin(['山东', '浙江', '江苏'])]
print(f"2. 加上山东浙江江苏: {len(score_df)} 条")

# 3. 本科筛选 (排除专科/3+3/高职/技师/技工)
benke_df = score_df[~score_df[level_col].fillna('').str.contains('专科|3\\+3|高职|技师|技工', regex=True)]
print(f"3. 加上本科筛选: {len(benke_df)} 条")

# 4. 985/211/双一流
elite_df = benke_df[benke_df[level_col].fillna('').str.contains('985|211|双一流', regex=True)]
print(f"4. 加上985/211/双一流: {len(elite_df)} 条")

# 5. 选科筛选 - 物化生
if req_col in df.columns:
    wuhua = elite_df[elite_df[req_col].fillna('').str.contains('物理|化学|生物', regex=False)]
    print(f"5. 加上物化生筛选: {len(wuhua)} 条")
    
    # 检查实际的专业要求内容
    print(f"\n=== 选科要求样本 ===")
    for v in elite_df[req_col].dropna().head(10):
        print(f"  {v[:50]}")
