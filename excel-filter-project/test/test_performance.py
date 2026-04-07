# -*- coding: utf-8 -*-
"""
高考志愿系统 - 性能测试
"""
import sys
import time
sys.path.insert(0, 'C:/Users/DELL/.openclaw/workspace')
from excel_filter_project.data_loader import DataLoader

class PerformanceTest:
    """性能测试"""
    
    def __init__(self):
        self.loader = DataLoader()
        self.results = []
    
    def test_load_speed(self, label, load_func):
        """测试加载速度"""
        print(f"测试: {label}...")
        start = time.time()
        try:
            df = load_func()
            elapsed = time.time() - start
            status = "✅" if elapsed < 5 else "⚠️"
            print(f"  {status} 耗时: {elapsed:.2f}秒")
            self.results.append((label, True, f"{elapsed:.2f}秒", len(df) if df is not None else 0))
            return elapsed
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append((label, False, str(e), 0))
            return None
    
    def test_filter_speed(self, label, df, filter_func):
        """测试筛选速度"""
        print(f"测试: {label}...")
        start = time.time()
        try:
            result = filter_func(df)
            elapsed = time.time() - start
            status = "✅" if elapsed < 1 else "⚠️"
            print(f"  {status} 耗时: {elapsed:.3f}秒, 结果: {len(result)}条")
            self.results.append((label, True, f"{elapsed:.3f}秒", len(result)))
            return elapsed
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append((label, False, str(e), 0))
            return None
    
    def run_all_tests(self):
        """运行所有性能测试"""
        print("=" * 50)
        print("高考志愿系统 - 性能测试")
        print("=" * 50)
        print()
        
        # 测试1: 数据加载速度
        print("【数据加载速度】")
        benke_time = self.test_load_speed("本科数据加载", self.loader.load_benke_data)
        zhuanke_time = self.test_load_speed("专科数据加载", self.loader.load_zhuanke_data)
        
        # 测试2: 筛选速度
        print()
        print("【筛选速度】")
        df = self.loader.load_benke_data()
        if df is not None:
            # 模拟省份筛选
            self.test_filter_speed(
                "省份筛选(山东)", 
                df, 
                lambda d: d[d['省份'] == '山东'] if '省份' in d.columns else d.head(100)
            )
        
        print()
        print("=" * 50)
        print("性能测试汇总")
        print("=" * 50)
        
        for label, success, time_str, count in self.results:
            status = "✅" if success else "❌"
            print(f"{status} {label}: {time_str} ({count}条)")
        
        print()
        print("【性能评估】")
        if benke_time and benke_time < 5:
            print("✅ 本科数据加载: 优秀 (<5秒)")
        elif benke_time:
            print("⚠️ 本科数据加载: 待优化 (>=5秒)")
        
        return self.results


if __name__ == '__main__':
    tester = PerformanceTest()
    tester.run_all_tests()
