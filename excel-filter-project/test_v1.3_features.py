#!/usr/bin/env python3
"""
Excel 筛选器 v1.3 功能测试脚本
测试新功能：学校搜索、Excel导出、PDF导出、数据持久化
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.services import DataService, FilterService
from src.models import Student, Major, MatchResult, FilterConfig
import tempfile
import json

def test_school_search():
    """测试学校搜索功能"""
    print("=== 测试学校搜索功能 ===")
    
    data_service = DataService(":memory:")
    
    # 添加一些测试数据
    test_majors = [
        Major(
            major_id="1",
            school_id="tsinghua",
            school_name="清华大学",
            major_name="计算机科学与技术",
            major_category="理工",
            subject_requirement="物理必选",
            subject_required=["物理"],
            subject_optional=["化学"],
            year=2025,
            min_score=680,
            min_rank=100
        ),
        Major(
            major_id="2",
            school_id="pku",
            school_name="北京大学",
            major_name="金融学",
            major_category="文史",
            subject_requirement="不限",
            subject_required=[],
            subject_optional=[],
            year=2025,
            min_score=670,
            min_rank=150
        ),
        Major(
            major_id="3",
            school_id="fudan",
            school_name="复旦大学",
            major_name="临床医学",
            major_category="医学",
            subject_requirement="化学必选",
            subject_required=["化学"],
            subject_optional=["生物"],
            year=2025,
            min_score=660,
            min_rank=200
        ),
    ]
    
    data_service.schools = test_majors
    
    # 测试搜索
    print("1. 搜索'大学':")
    results = data_service.search_schools("大学")
    for r in results:
        print(f"   - {r['school_name']} ({r.get('province', '')}·{r.get('level', '')})")
    
    print("\n2. 搜索'清华':")
    results = data_service.search_schools("清华")
    for r in results:
        print(f"   - {r['school_name']}")
    
    print("\n3. 搜索空关键词:")
    results = data_service.search_schools("")
    print(f"   结果数量: {len(results)} (应为0)")
    
    print("\n4. 获取所有学校名称:")
    all_schools = data_service.get_all_school_names()
    print(f"   学校列表: {all_schools}")
    
    return len(results) > 0

def test_excel_export():
    """测试Excel导出功能"""
    print("\n=== 测试Excel导出功能 ===")
    
    data_service = DataService(":memory:")
    
    # 创建测试结果
    test_results = [
        MatchResult(
            student_id="001",
            student_name="张三",
            school_id="tsinghua",
            school_name="清华大学",
            major_id="1",
            major_name="计算机科学与技术",
            match_type="冲",
            score_gap=-5.0,
            rank_gap=-50,
            min_score=680,
            min_rank=100
        ),
        MatchResult(
            student_id="001",
            student_name="张三",
            school_id="pku",
            school_name="北京大学",
            major_id="2",
            major_name="金融学",
            match_type="稳",
            score_gap=10.0,
            rank_gap=50,
            min_score=670,
            min_rank=150
        ),
    ]
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        success = data_service.export_results(test_results, tmp_path)
        print(f"1. Excel导出结果: {'成功' if success else '失败'}")
        
        if success and os.path.exists(tmp_path):
            file_size = os.path.getsize(tmp_path)
            print(f"2. 文件大小: {file_size} 字节")
            print(f"3. 文件路径: {tmp_path}")
            
            # 验证文件内容（简单检查）
            import pandas as pd
            df = pd.read_excel(tmp_path)
            print(f"4. 导出数据行数: {len(df)}")
            print(f"5. 导出列: {list(df.columns)}")
            
            return success and len(df) == 2
        else:
            return False
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

def test_pdf_export():
    """测试PDF导出功能"""
    print("\n=== 测试PDF导出功能 ===")
    
    data_service = DataService(":memory:")
    
    # 创建测试结果
    test_results = [
        MatchResult(
            student_id="001",
            student_name="张三",
            school_id="tsinghua",
            school_name="清华大学",
            major_id="1",
            major_name="计算机科学与技术",
            match_type="冲",
            score_gap=-5.0,
            rank_gap=-50,
            min_score=680,
            min_rank=100
        ),
        MatchResult(
            student_id="001",
            student_name="张三",
            school_id="pku",
            school_name="北京大学",
            major_id="2",
            major_name="金融学",
            match_type="稳",
            score_gap=10.0,
            rank_gap=50,
            min_score=670,
            min_rank=150
        ),
    ]
    
    # 创建临时文件
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        success = data_service.export_to_pdf(test_results, tmp_path, "张三")
        print(f"1. PDF导出结果: {'成功' if success else '失败'}")
        
        if success and os.path.exists(tmp_path):
            file_size = os.path.getsize(tmp_path)
            print(f"2. 文件大小: {file_size} 字节")
            print(f"3. 文件路径: {tmp_path}")
            return success and file_size > 0
        else:
            print("4. 注意: PDF导出可能需要安装 reportlab 库: pip install reportlab")
            return False
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

def test_sqlite_persistence():
    """测试SQLite数据持久化"""
    print("\n=== 测试SQLite数据持久化 ===")
    
    # 使用内存数据库测试
    data_service = DataService(":memory:")
    
    # 创建测试学生
    test_student = Student(
        student_id="001",
        student_name="张三",
        category="物理类",
        subjects=["物理", "化学", "生物"],
        total_score=675.0,
        rank=120,
        province="北京"
    )
    
    # 创建测试结果
    test_results = [
        MatchResult(
            student_id="001",
            student_name="张三",
            school_id="tsinghua",
            school_name="清华大学",
            major_id="1",
            major_name="计算机科学与技术",
            match_type="冲",
            score_gap=-5.0,
            rank_gap=-50,
            min_score=680,
            min_rank=100
        ),
    ]
    
    # 创建测试配置
    test_config = FilterConfig(
        provinces=["北京", "上海"],
        levels=["985", "211"],
        categories=["理工", "医学"],
        score_min=600,
        score_max=700,
        include_tier_chong=True,
        include_tier_wen=True,
        include_tier_bao=True
    )
    
    # 测试保存历史
    success = data_service.save_history(test_student, test_results, test_config)
    print(f"1. 保存历史结果: {'成功' if success else '失败'}")
    
    # 测试加载历史
    history = data_service.load_history(limit=5)
    print(f"2. 加载历史记录: {len(history)} 条")
    
    if history:
        print(f"3. 历史记录示例: {history[0]}")
    
    return success and len(history) > 0

def test_filter_service():
    """测试筛选服务"""
    print("\n=== 测试筛选服务 ===")
    
    data_service = DataService(":memory:")
    filter_service = FilterService(data_service)
    
    # 添加测试数据
    test_majors = [
        Major(
            major_id="1",
            school_id="tsinghua",
            school_name="清华大学",
            major_name="计算机科学与技术",
            major_category="理工",
            subject_requirement="物理必选",
            subject_required=["物理"],
            subject_optional=["化学"],
            year=2025,
            min_score=680,
            min_rank=100,
            level="985"
        ),
    ]
    data_service.schools = test_majors
    
    # 创建测试学生
    test_student = Student(
        student_id="001",
        student_name="张三",
        category="物理类",
        subjects=["物理", "化学", "生物"],
        total_score=675.0,
        rank=120,
        province="北京"
    )
    
    # 创建测试配置
    test_config = FilterConfig(
        levels=["985"],
        include_tier_chong=True,
        include_tier_wen=True,
        include_tier_bao=True
    )
    
    # 执行筛选
    results = filter_service.filter(test_student, test_config)
    print(f"1. 筛选结果数量: {len(results)}")
    
    if results:
        print(f"2. 第一条结果:")
        r = results[0]
        print(f"   学校: {r.school_name}")
        print(f"   专业: {r.major_name}")
        print(f"   类型: {r.match_type}")
        print(f"   分数差: {r.score_gap}")
    
    return len(results) > 0

def main():
    """主测试函数"""
    print("Excel 筛选器 v1.3 功能测试")
    print("=" * 50)
    
    tests = [
        ("学校搜索功能", test_school_search),
        ("Excel导出功能", test_excel_export),
        ("PDF导出功能", test_pdf_export),
        ("SQLite数据持久化", test_sqlite_persistence),
        ("筛选服务", test_filter_service),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            print(f"\n📋 测试: {test_name}")
            if test_func():
                print(f"✅ {test_name} - 通过")
                passed += 1
            else:
                print(f"❌ {test_name} - 失败")
        except Exception as e:
            print(f"❌ {test_name} - 异常: {e}")
    
    print("\n" + "=" * 50)
    print(f"测试完成: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有v1.3功能测试通过！")
        return 0
    else:
        print("⚠️  部分功能测试失败，请检查")
        return 1

if __name__ == "__main__":
    sys.exit(main())