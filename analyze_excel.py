# -*- coding: utf-8 -*-
import pandas as pd
import os

# Find the xlsx file
workspace = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(workspace) if f.endswith('.xlsx')]
print(f"Found {len(files)} Excel files:")
for f in files:
    print(f"  - {f}")

# Read the first file
if files:
    filepath = os.path.join(workspace, files[0])
    print(f"\nReading: {files[0]}")
    
    # Read all sheets
    xl = pd.ExcelFile(filepath)
    print(f"Sheets: {xl.sheet_names}")
    
    # Read first sheet and show structure
    for sheet in xl.sheet_names[:3]:
        print(f"\n=== Sheet: {sheet} ===")
        df = pd.read_excel(xl, sheet_name=sheet)
        print(f"Shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        print(f"\nFirst 3 rows:")
        print(df.head(3).to_string())
