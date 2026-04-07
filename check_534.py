# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

# 用列索引代替列名
req_col = df.columns[1]  # 25选考要求
level_col = df.columns[21]  # 院校水平
score_col = df.columns[6]  # 25年预测分数
prov_col = df.columns[23]  # 省份

total = 534

print(f"=== 534分数据测试 ===\n")
print(f"使用列: {req_col}, {level_col}, {score_col}, {prov_col}")

# 1. 分数范围 (534-20到534+20)
score_df = df[(df[score_col] >= total - 20) & (df[score_col] <= total + 20)]
print(f"1. 分数范围{total-20}-{total+20}分: {len(score_df)} 条")

# 2. 山东
score_df = score_df[score_df[prov_col] == '山东']
print(f"2. 加上山东: {len(score_df)} 条")

# 3. 本科筛选 (排除专科/3+3/高职/技师/技工)
benke_df = score_df[~score_df[level_col].fillna('').str.contains('专科|3\\+3|高职|技师|技工', regex=True)]
print(f"3. 加上本科筛选: {len(benke_df)} 条")

# 4. 物化生筛选
wuhua = benke_df[benke_df[req_col].fillna('').str.contains('物理|化学|生物', regex=True)]
print(f"4. 加上物化生筛选: {len(wuhua)} 条")

# 5. 分类统计
print(f"\n=== 分类统计 (d = 总分 - 预测分数) ===")
for cat, low, high in [('冲刺', -1000, -10), ('稳妥', -10, 10), ('保底', 10, 1000)]:
    d_low = total - low
    d_high = total - high
    if low == -1000:
        cat_df = wuhua[wuhua[score_col] <= d_high]
    elif high == 1000:
        cat_df = wuhua[wuhua[score_col] >= d_low]
    else:
        cat_df = wuhua[(wuhua[score_col] >= d_low) & (wuhua[score_col] < d_high)]
    print(f"  {cat} (预测分数{d_high}-{d_low}分): {len(cat_df)} 条")

# 6. 山东所有本科数据
print(f"\n=== 山东本科数据 ===")
all_shandong = df[df[prov_col] == '山东']
all_shandong_benke = all_shandong[~all_shandong[level_col].fillna('').str.contains('专科|3\\+3|高职|技师|技工', regex=True)]
print(f"山东本科总数: {len(all_shandong_benke)} 条")
range_df = all_shandong_benke[(all_shandong_benke[score_col] >= 400) & (all_shandong_benke[score_col] <= 600)]
print(f"其中400-600分: {len(range_df)} 条")
