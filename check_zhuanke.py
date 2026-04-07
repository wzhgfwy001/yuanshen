# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# 读取专科Excel
path = r'E:\硕博教育\数据库\2025年\百年硕博咨询师专用（山东专科）.xlsx'

if not os.path.exists(path):
    print(f"文件不存在: {path}")
else:
    df = pd.read_excel(path)
    print(f"总数据: {len(df)} 条")
    print(f"\n所有列名:")
    for i, c in enumerate(df.columns):
        print(f"  {i}: {c}")
