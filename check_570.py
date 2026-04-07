# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

req_col = df.columns[1]  # 25选科要求
level_col = df.columns[21]  # 院校水平
score_col = df.columns[6]  # 25年预测分数
prov_col = df.columns[23]  # 省份

total = 570

print(f"=== 570分山东本科物化生数据分析 ===\n")

# 基础筛选
base = df[(df[score_col] >= total - 20) & (df[score_col] <= total + 20)]
base = base[base[prov_col] == '山东']
base = base[~base[level_col].fillna('').str.contains('专科|3\\+3|高职|技师|技工', regex=True)]
base = base[base[req_col].fillna('').str.contains('物理|化学|生物', regex=True)]

print(f"基础筛选 (分数范围{total-20}-{total+20}, 山东, 本科, 物化生): {len(base)} 条")

# 分类
print(f"\n=== 分类统计 ===")
# 冲刺: d < -10, 即 预测分数 > 580
rush = base[base[score_col] > total + 10]
print(f"冲刺 (预测分数>{total+10}): {len(rush)} 条")

# 稳妥: -10 <= d < 10, 即 total-10 <= 预测分数 <= total+10
stable = base[(base[score_col] >= total - 10) & (base[score_col] <= total + 10)]
print(f"稳妥 ({total-10}-{total+10}): {len(stable)} 条")

# 保底: d >= 10, 即 预测分数 < total
safe = base[base[score_col] < total]
print(f"保底 (预测分数<{total}): {len(safe)} 条")

# 检查每学校数量
print(f"\n=== 每学校数量限制(3个)影响 ===")
rush_schools = rush.groupby(rush.columns[2]).size().reset_index()
rush_over3 = rush_schools[rush_schools[0] > 3]
print(f"冲刺: {len(rush)}条, 学校数: {rush['院校名称'].nunique()}, 超3条的记录: {len(rush_over3) if len(rush_over3) > 0 else 0}")

stable_schools = stable.groupby(stable.columns[2]).size().reset_index()
stable_over3 = stable_schools[stable_schools[0] > 3]
print(f"稳妥: {len(stable)}条, 学校数: {stable['院校名称'].nunique()}, 超3条的记录: {len(stable_over3) if len(stable_over3) > 0 else 0}")

safe_schools = safe.groupby(safe.columns[2]).size().reset_index()
safe_over3 = safe_schools[safe_schools[0] > 3]
print(f"保底: {len(safe)}条, 学校数: {safe['院校名称'].nunique()}, 超3条的记录: {len(safe_over3) if len(safe_over3) > 0 else 0}")
