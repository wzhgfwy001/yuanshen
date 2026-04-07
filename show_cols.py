# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ws = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(ws) if f.endswith('.xlsx')]
df = pd.read_excel(os.path.join(ws, files[0]))

print("All columns (index: name):")
for i, c in enumerate(df.columns):
    print(f"  {i}: {c}")

print("\nSample data for first row:")
for i, c in enumerate(df.columns):
    val = df.iloc[0, i]
    if pd.notna(val):
        print(f"  {c}: {str(val)[:50]}")
