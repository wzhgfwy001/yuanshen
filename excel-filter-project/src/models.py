"""
数据模型定义
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime


@dataclass
class Student:
    """学生信息模型"""
    student_id: str
    student_name: str
    category: str  # 物理类/历史类
    subjects: List[str]  # 选科列表
    total_score: float  # 总分
    rank: int  # 排名
    province: str  # 考生省份
    
    # 偏好设置（可选）
    preference_province: List[str] = field(default_factory=list)
    preference_level: List[str] = field(default_factory=list)
    preference_major: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'student_id': self.student_id,
            'student_name': self.student_name,
            'category': self.category,
            'subjects': ','.join(self.subjects),
            'total_score': self.total_score,
            'rank': self.rank,
            'province': self.province,
            'preference_province': ','.join(self.preference_province),
            'preference_level': ','.join(self.preference_level),
            'preference_major': ','.join(self.preference_major)
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Student':
        """从字典创建"""
        return cls(
            student_id=data.get('student_id', ''),
            student_name=data.get('student_name', ''),
            category=data.get('category', '物理类'),
            subjects=data.get('subjects', '').split(',') if isinstance(data.get('subjects'), str) else data.get('subjects', []),
            total_score=float(data.get('total_score', 0)),
            rank=int(data.get('rank', 0)),
            province=data.get('province', ''),
            preference_province=data.get('preference_province', '').split(',') if isinstance(data.get('preference_province'), str) else data.get('preference_province', []),
            preference_level=data.get('preference_level', '').split(',') if isinstance(data.get('preference_level'), str) else data.get('preference_level', []),
            preference_major=data.get('preference_major', '').split(',') if isinstance(data.get('preference_major'), str) else data.get('preference_major', [])
        )


@dataclass
class School:
    """学校信息模型"""
    school_id: str
    school_name: str
    province: str
    city: str
    level: str  # 985/211/双一流/普通
    type: str  # 理工/综合/师范/...
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'school_id': self.school_id,
            'school_name': self.school_name,
            'province': self.province,
            'city': self.city,
            'level': self.level,
            'type': self.type
        }


@dataclass
class Major:
    """专业信息模型"""
    major_id: str
    school_id: str
    school_name: str  # 冗余字段，方便显示
    major_name: str
    major_category: str  # 理工/文史/医学/...
    subject_requirement: str  # 原始要求文本
    subject_required: List[str] = field(default_factory=list)  # 必选科目
    subject_optional: List[str] = field(default_factory=list)  # 可选科目
    year: int = 2025
    min_score: float = 0.0
    min_rank: int = 0
    avg_score: float = 0.0
    enrollment_count: int = 0
    tuition: float = 0.0
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'major_id': self.major_id,
            'school_id': self.school_id,
            'school_name': self.school_name,
            'major_name': self.major_name,
            'major_category': self.major_category,
            'subject_requirement': self.subject_requirement,
            'subject_required': ','.join(self.subject_required),
            'subject_optional': ','.join(self.subject_optional),
            'year': self.year,
            'min_score': self.min_score,
            'min_rank': self.min_rank,
            'avg_score': self.avg_score,
            'enrollment_count': self.enrollment_count,
            'tuition': self.tuition
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Major':
        """从字典创建"""
        return cls(
            major_id=data.get('major_id', ''),
            school_id=data.get('school_id', ''),
            school_name=data.get('school_name', ''),
            major_name=data.get('major_name', ''),
            major_category=data.get('major_category', ''),
            subject_requirement=data.get('subject_requirement', ''),
            subject_required=data.get('subject_required', '').split(',') if isinstance(data.get('subject_required'), str) else data.get('subject_required', []),
            subject_optional=data.get('subject_optional', '').split(',') if isinstance(data.get('subject_optional'), str) else data.get('subject_optional', []),
            year=int(data.get('year', 2025)),
            min_score=float(data.get('min_score', 0)),
            min_rank=int(data.get('min_rank', 0)),
            avg_score=float(data.get('avg_score', 0)),
            enrollment_count=int(data.get('enrollment_count', 0)),
            tuition=float(data.get('tuition', 0))
        )


@dataclass
class MatchResult:
    """匹配结果模型"""
    student_id: str
    student_name: str
    school_id: str
    school_name: str
    major_id: str
    major_name: str
    match_type: str  # 冲/稳/保
    score_gap: float  # 分数差距
    rank_gap: int  # 排名差距
    min_score: float  # 往年最低分
    min_rank: int  # 往年最低排名
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'student_id': self.student_id,
            'student_name': self.student_name,
            'school_name': self.school_name,
            'major_name': self.major_name,
            'match_type': self.match_type,
            'score_gap': self.score_gap,
            'rank_gap': self.rank_gap,
            'min_score': self.min_score,
            'min_rank': self.min_rank
        }


@dataclass
class FilterConfig:
    """筛选配置模型"""
    provinces: List[str] = field(default_factory=list)  # 地域筛选
    levels: List[str] = field(default_factory=list)  # 学校层次
    categories: List[str] = field(default_factory=list)  # 专业类别
    score_min: float = 0.0  # 最低分要求
    score_max: float = 1000.0  # 最高分要求
    include_tier_chong: bool = True  # 包含"冲"
    include_tier_wen: bool = True  # 包含"稳"
    include_tier_bao: bool = True  # 包含"保"
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'provinces': self.provinces,
            'levels': self.levels,
            'categories': self.categories,
            'score_min': self.score_min,
            'score_max': self.score_max,
            'include_tier_chong': self.include_tier_chong,
            'include_tier_wen': self.include_tier_wen,
            'include_tier_bao': self.include_tier_bao
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'FilterConfig':
        """从字典创建"""
        return cls(
            provinces=data.get('provinces', []),
            levels=data.get('levels', []),
            categories=data.get('categories', []),
            score_min=float(data.get('score_min', 0)),
            score_max=float(data.get('score_max', 1000)),
            include_tier_chong=data.get('include_tier_chong', True),
            include_tier_wen=data.get('include_tier_wen', True),
            include_tier_bao=data.get('include_tier_bao', True)
        )
