# -*- coding: utf-8 -*-
"""
高考志愿系统 - 基础测试
测试数据加载和基本功能
"""
import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

def test_imports():
    """测试模块导入"""
    print("Test 1: Module Import...")
    try:
        import main_launcher
        print("  [OK] main_launcher imported")
        return True
    except Exception as e:
        print(f"  [FAIL] Import failed: {e}")
        return False

def test_data_files():
    """测试数据文件"""
    print("Test 2: Data Files Check...")
    data_dir = os.path.join(project_root, 'data')
    if not os.path.exists(data_dir):
        print("  [FAIL] data directory not found")
        return False
    
    files = os.listdir(data_dir)
    print(f"  [OK] data directory exists, {len(files)} files")
    for f in files:
        print(f"     - {f}")
    return True

def test_syntax():
    """测试语法"""
    print("Test 3: Syntax Check...")
    main_files = ['main_launcher.py', 'main_simple2.py', 'main_zhuanke.py']
    all_ok = True
    for f in main_files:
        fpath = os.path.join(project_root, f)
        if os.path.exists(fpath):
            try:
                with open(fpath, 'r', encoding='utf-8') as fp:
                    compile(fp.read(), fpath, 'exec')
                print(f"  [OK] {f} syntax correct")
            except SyntaxError as e:
                print(f"  [FAIL] {f} syntax error: {e}")
                all_ok = False
        else:
            print(f"  [WARN] {f} not found")
    return all_ok

def run_tests():
    """运行所有基础测试"""
    print("=" * 50)
    print("Gaokao志愿系统 - Basic Tests")
    print("=" * 50)
    print()
    
    results = []
    results.append(("Module Import", test_imports()))
    results.append(("Data Files", test_data_files()))
    results.append(("Syntax Check", test_syntax()))
    
    print()
    print("=" * 50)
    print("Test Results")
    print("=" * 50)
    
    passed = sum(1 for _, ok in results if ok)
    for name, ok in results:
        status = "[PASS]" if ok else "[FAIL]"
        print(f"{status} {name}")
    
    print()
    print(f"Total: {passed}/{len(results)} passed")
    
    return passed == len(results)


if __name__ == '__main__':
    run_tests()
