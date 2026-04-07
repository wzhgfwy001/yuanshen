# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

col = '院校水平'

# 检查"3+3"或"专科"等表示非本科的关键词
non_benke = df[df[col].fillna('').str.contains('专科|3+3|3\+3|高职|技师|技工', regex=True)]
print(f"非本科(专科/3+3/高职等): {len(non_benke)} 条")

# 不包含这些关键词的就是本科
benke = df[~df[col].fillna('').str.contains('专科|3+3|3\+3|高职|技师|技工', regex=True)]
print(f"本科(总数据-非本科): {len(benke)} 条")

# 520-530分段的
score_col = '25年预测分数'
score_df = benke[(benke[score_col] >= 520) & (benke[score_col] <= 530)]
print(f"\n520-530分本科数据: {len(score_df)} 条")

# 选科分析
req_col = '25选考要求'
if req_col in df.columns:
    # 物化生相关
    wuhuasheng = df[df[req_col].fillna('').str.contains('物理|化学|生物', regex=False)]
    print(f"\n含物化生物的专业: {len(wuhuasheng)} 条")
    
    # 520-530分物化生
    target = wuhuasheng[(wuhuasheng[score_col] >= 520) & (wuhuasheng[score_col] <= 530)]
    print(f"520-530分物化生: {len(target)} 条")
