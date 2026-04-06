#!/usr/bin/env python3
"""
简单测试 v1.3 功能
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from src.services import DataService
    from src.models import Student, Major, MatchResult, FilterConfig
    print("✅ 导入成功")
    
    # 测试学校搜索
    ds = DataService(":memory:")
    print("✅ DataService 创建成功")
    
    # 测试搜索方法
    results = ds.search_schools("测试")
    print(f"✅ 学校搜索测试完成，结果数: {len(results)}")
    
    print("\n🎉 v1.3 核心功能导入测试通过！")
    
except Exception as e:
    print(f"❌ 导入失败: {e}")
    import traceback
    traceback.print_exc()