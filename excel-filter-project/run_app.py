#!/usr/bin/env python3
"""
运行 Excel 筛选器 v1.3 应用
"""

import sys
import os

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("启动 Excel 筛选器 v1.3...")
    print("=" * 50)
    
    # 检查依赖
    print("检查依赖包...")
    try:
        import customtkinter
        import pandas
        print("✅ customtkinter, pandas - 已安装")
    except ImportError as e:
        print(f"❌ 缺少依赖: {e}")
        print("请运行: pip install -r requirements.txt")
        sys.exit(1)
    
    try:
        import reportlab
        print("✅ reportlab - 已安装 (PDF导出支持)")
    except ImportError:
        print("⚠️  reportlab - 未安装 (PDF导出功能将不可用)")
        print("   安装命令: pip install reportlab")
    
    # 导入应用
    print("\n导入应用模块...")
    from src.main import main
    
    print("\n✅ 所有检查通过")
    print("=" * 50)
    print("\n启动主应用...")
    print("注意: 如果窗口没有显示，请检查系统任务栏")
    
    # 运行应用
    main()
    
except Exception as e:
    print(f"\n❌ 启动失败: {e}")
    import traceback
    traceback.print_exc()
    input("\n按 Enter 键退出...")