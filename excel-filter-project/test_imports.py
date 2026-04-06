#!/usr/bin/env python3
"""
测试 v1.3 功能导入
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from src.services import DataService
    from src.models import Student, Major, MatchResult, FilterConfig
    print("Import successful")
    
    # 测试学校搜索
    ds = DataService(":memory:")
    print("DataService created successfully")
    
    # 测试搜索方法
    results = ds.search_schools("test")
    print(f"School search test completed, results: {len(results)}")
    
    print("\nv1.3 core features import test passed!")
    
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()