# -*- coding: utf-8 -*-
import json

with open(r'C:\Users\DELL\.openclaw\workspace\cloudbase_data\zhuanke_fixed.json', 'r', encoding='utf-8') as f:
    zk = json.load(f)

print(f'专科数据: {len(zk)} 条')
print()
print('前5条样本:')
for i, r in enumerate(zk[:5]):
    school = r.get('school_name', 'N/A')
    major = r.get('major_name', 'N/A')
    province = r.get('province', 'N/A')
    city = r.get('city', 'N/A')
    score = r.get('predicted_score_2025', 'N/A')
    print(f'{i+1}. 学校:{school} | 专业:{major} | 省份:{province} | 城市:{city} | 预测分:{score}')
