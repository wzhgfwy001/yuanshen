# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys
import io

# Set encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

workspace = r'C:\Users\DELL\.openclaw\workspace'
files = [f for f in os.listdir(workspace) if f.endswith('.xlsx')]

if files:
    filepath = os.path.join(workspace, files[0])
    print(f"File: {files[0]}")
    print(f"Size: {os.path.getsize(filepath) / 1024 / 1024:.2f} MB")
    
    # Read with openpyxl engine
    df = pd.read_excel(filepath, sheet_name=0, engine='openpyxl')
    
    print(f"\nData: {df.shape[0]} rows x {df.shape[1]} columns\n")
    
    # Get original column names (should be Chinese)
    print("=" * 60)
    print("Original Column Names:")
    print("=" * 60)
    for i, col in enumerate(df.columns):
        print(f"{i+1:2d}. {col}")
    
    print("\n" + "=" * 60)
    print("First 5 rows (key columns):")
    print("=" * 60)
    print(df.head().to_string())
