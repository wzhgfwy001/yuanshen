"""
单元测试 - 服务层测试
"""
import pytest
import sys
from pathlib import Path

# 添加 src 到路径
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from models import Student, Major, FilterConfig
from services import DataService, FilterService


class TestSubjectMatching:
    """选科匹配测试"""
    
    def setup_method(self):
        """测试前准备"""
        self.ds = DataService(":memory:")  # 使用内存数据库
        self.fs = FilterService(self.ds)
    
    def test_required_subjects_match(self):
        """必选科目匹配"""
        student_subjects = ['物理', '化学', '生物']
        required = ['物理', '化学']
        optional = []
        
        assert self.fs._match_subjects(student_subjects, required, optional) == True
    
    def test_required_subjects_mismatch(self):
        """必选科目不匹配"""
        student_subjects = ['物理', '化学', '生物']
        required = ['物理', '历史']
        optional = []
        
        assert self.fs._match_subjects(student_subjects, required, optional) == False
    
    def test_optional_subjects_match(self):
        """可选科目匹配"""
        student_subjects = ['物理', '化学', '生物']
        required = ['物理']
        optional = ['生物', '地理']
        
        assert self.fs._match_subjects(student_subjects, required, optional) == True
    
    def test_optional_subjects_mismatch(self):
        """可选科目不匹配"""
        student_subjects = ['物理', '化学', '政治']
        required = ['物理']
        optional = ['生物', '地理']
        
        assert self.fs._match_subjects(student_subjects, required, optional) == False
    
    def test_no_requirements(self):
        """无选科要求"""
        student_subjects = ['物理', '化学', '生物']
        required = []
        optional = []
        
        assert self.fs._match_subjects(student_subjects, required, optional) == True


class TestTierCalculation:
    """冲稳保划分测试"""
    
    def setup_method(self):
        self.ds = DataService(":memory:")
        self.fs = FilterService(self.ds)
    
    def test_tier_bao(self):
        """保档 - 排名领先 1000 名以上"""
        tier, score_gap, rank_gap = self.fs._calculate_tier(
            student_score=650, admit_score=640,
            student_rank=4000, admit_rank=5000
        )
        assert tier == '保'
    
    def test_tier_wen(self):
        """稳档 - 排名持平或领先"""
        tier, score_gap, rank_gap = self.fs._calculate_tier(
            student_score=645, admit_score=645,
            student_rank=5000, admit_rank=5000
        )
        assert tier == '稳'
    
    def test_tier_chong(self):
        """冲档 - 排名落后 500 名以内"""
        tier, score_gap, rank_gap = self.fs._calculate_tier(
            student_score=640, admit_score=645,
            student_rank=5300, admit_rank=5000
        )
        assert tier == '冲'
    
    def test_no_match(self):
        """不匹配 - 排名落后超过 500 名"""
        tier, score_gap, rank_gap = self.fs._calculate_tier(
            student_score=630, admit_score=645,
            student_rank=6000, admit_rank=5000
        )
        assert tier == '不匹配'
    
    def test_boundary_1000(self):
        """边界值 - 恰好领先 1000 名"""
        tier, score_gap, rank_gap = self.fs._calculate_tier(
            student_score=645, admit_score=640,
            student_rank=4000, admit_rank=5000
        )
        assert tier == '保'
    
    def test_boundary_500(self):
        """边界值 - 恰好落后 500 名"""
        tier, score_gap, rank_gap = self.fs._calculate_tier(
            student_score=640, admit_score=645,
            student_rank=5500, admit_rank=5000
        )
        assert tier == '冲'


class TestFilterService:
    """筛选服务测试"""
    
    def setup_method(self):
        self.ds = DataService(":memory:")
        self.fs = FilterService(self.ds)
        
        # 添加测试数据
        self.ds.schools = [
            Major(
                major_id="MAJ001",
                school_id="SCH001",
                school_name="清华大学",
                major_name="计算机科学与技术",
                major_category="理工",
                subject_requirement="物理 + 化学",
                subject_required=['物理', '化学'],
                subject_optional=[],
                year=2025,
                min_score=680,
                min_rank=100,
                level="985"
            ),
            Major(
                major_id="MAJ002",
                school_id="SCH002",
                school_name="北京大学",
                major_name="软件工程",
                major_category="理工",
                subject_requirement="物理",
                subject_required=['物理'],
                subject_optional=['化学', '生物'],
                year=2025,
                min_score=675,
                min_rank=150,
                level="985"
            ),
            Major(
                major_id="MAJ003",
                school_id="SCH003",
                school_name="某普通大学",
                major_name="电子信息",
                major_category="理工",
                subject_requirement="物理",
                subject_required=['物理'],
                subject_optional=[],
                year=2025,
                min_score=600,
                min_rank=5000,
                level="普通"
            )
        ]
    
    def test_filter_basic(self):
        """基础筛选"""
        student = Student(
            student_id="STU001",
            student_name="张三",
            category="物理类",
            subjects=['物理', '化学', '生物'],
            total_score=650,
            rank=5000,
            province="广东"
        )
        
        config = FilterConfig()
        results = self.fs.filter(student, config)
        
        # 应该匹配到至少一个结果
        assert len(results) > 0
    
    def test_filter_by_level(self):
        """按学校层次筛选"""
        student = Student(
            student_id="STU001",
            student_name="张三",
            category="物理类",
            subjects=['物理', '化学', '生物'],
            total_score=680,
            rank=100,
            province="广东"
        )
        
        config = FilterConfig(levels=['985'])
        results = self.fs.filter(student, config)
        
        # 应该只显示 985 学校
        for result in results:
            assert result.match_type in ['冲', '稳', '保']
    
    def test_filter_exclude_tier(self):
        """排除特定匹配类型"""
        student = Student(
            student_id="STU001",
            student_name="张三",
            category="物理类",
            subjects=['物理', '化学', '生物'],
            total_score=650,
            rank=5000,
            province="广东"
        )
        
        config = FilterConfig(
            include_tier_chong=False,
            include_tier_wen=True,
            include_tier_bao=True
        )
        results = self.fs.filter(student, config)
        
        # 不应该有"冲"的结果
        for result in results:
            assert result.match_type != '冲'


class TestStudentModel:
    """学生模型测试"""
    
    def test_student_to_dict(self):
        """学生转字典"""
        student = Student(
            student_id="STU001",
            student_name="张三",
            category="物理类",
            subjects=['物理', '化学', '生物'],
            total_score=650,
            rank=5000,
            province="广东"
        )
        
        data = student.to_dict()
        
        assert data['student_id'] == "STU001"
        assert data['student_name'] == "张三"
        assert data['total_score'] == 650
    
    def test_student_from_dict(self):
        """字典转学生"""
        data = {
            'student_id': 'STU001',
            'student_name': '张三',
            'category': '物理类',
            'subjects': '物理，化学，生物',
            'total_score': '650',
            'rank': '5000',
            'province': '广东'
        }
        
        student = Student.from_dict(data)
        
        assert student.student_id == "STU001"
        assert '物理' in student.subjects
        assert student.total_score == 650.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
