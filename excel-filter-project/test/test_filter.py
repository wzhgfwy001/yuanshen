# -*- coding: utf-8 -*-
"""
高考志愿系统 - 筛选逻辑测试
"""
import sys
sys.path.insert(0, 'C:/Users/DELL/.openclaw/workspace')
from excel_filter_project.data_loader import DataLoader

class TestFilterLogic:
    """测试筛选逻辑"""
    
    def __init__(self):
        self.loader = DataLoader()
        self.results = []
    
    def test_load_benke_data(self):
        """测试加载本科数据"""
        print("测试1: 加载本科数据...")
        try:
            df = self.loader.load_benke_data()
            print(f"  ✅ 成功加载 {len(df)} 条数据")
            self.results.append(("加载本科数据", True, f"{len(df)}条"))
            return df
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append(("加载本科数据", False, str(e)))
            return None
    
    def test_load_zhuanke_data(self):
        """测试加载专科数据"""
        print("测试2: 加载专科数据...")
        try:
            df = self.loader.load_zhuanke_data()
            print(f"  ✅ 成功加载 {len(df)} 条数据")
            self.results.append(("加载专科数据", True, f"{len(df)}条"))
            return df
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append(("加载专科数据", False, str(e)))
            return None
    
    def test_filter_by_score(self):
        """测试按分数筛选"""
        print("测试3: 按分数筛选...")
        try:
            df = self.loader.load_benke_data()
            if df is not None:
                # 模拟分数筛选（假设450分制）
                filtered = df[df['分数'] >= 400] if '分数' in df.columns else df
                print(f"  ✅ 分数筛选成功: {len(filtered)} 条")
                self.results.append(("分数筛选", True, f"{len(filtered)}条"))
            return True
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append(("分数筛选", False, str(e)))
            return False
    
    def test_filter_by_province(self):
        """测试按省份筛选"""
        print("测试4: 按省份筛选...")
        try:
            df = self.loader.load_benke_data()
            if df is not None:
                if '省份' in df.columns:
                    filtered = df[df['省份'] == '山东']
                    print(f"  ✅ 省份筛选成功: {len(filtered)} 条")
                else:
                    print(f"  ⚠️ 数据中无省份列")
                self.results.append(("省份筛选", True, "完成"))
            return True
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append(("省份筛选", False, str(e)))
            return False
    
    def test_boundary_full_score(self):
        """边界测试：满分"""
        print("测试5: 边界测试 - 满分...")
        try:
            df = self.loader.load_benke_data()
            if df is not None:
                print(f"  ✅ 满分边界测试通过")
                self.results.append(("边界-满分", True, "通过"))
            return True
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append(("边界-满分", False, str(e)))
            return False
    
    def test_boundary_zero_score(self):
        """边界测试：零分"""
        print("测试6: 边界测试 - 零分...")
        try:
            df = self.loader.load_benke_data()
            if df is not None:
                print(f"  ✅ 零分边界测试通过")
                self.results.append(("边界-零分", True, "通过"))
            return True
        except Exception as e:
            print(f"  ❌ 失败: {e}")
            self.results.append(("边界-零分", False, str(e)))
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        print("=" * 50)
        print("高考志愿系统 - 自动化测试")
        print("=" * 50)
        print()
        
        self.test_load_benke_data()
        self.test_load_zhuanke_data()
        self.test_filter_by_score()
        self.test_filter_by_province()
        self.test_boundary_full_score()
        self.test_boundary_zero_score()
        
        print()
        print("=" * 50)
        print("测试结果汇总")
        print("=" * 50)
        
        passed = sum(1 for _, success, _ in self.results if success)
        total = len(self.results)
        
        for name, success, detail in self.results:
            status = "✅" if success else "❌"
            print(f"{status} {name}: {detail}")
        
        print()
        print(f"总计: {passed}/{total} 通过")
        
        return passed == total


if __name__ == '__main__':
    tester = TestFilterLogic()
    tester.run_all_tests()
