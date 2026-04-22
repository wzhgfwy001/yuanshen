"""问题严重程度定义"""

from enum import Enum
from typing import List, Dict, Any


class IssueSeverity(Enum):
    """问题严重程度"""
    CRITICAL = "critical"  # 关键：自动修复，无需人工介入
    MAJOR = "major"        # 重要：自动修复 + 标记建议
    MINOR = "minor"        # 次要：标记给人工审核


class IssueClassifier:
    """问题分类器"""

    # 关键问题类型（必须修复）
    CRITICAL_TYPES = [
        "timeline_error",      # 时间线错误
        "logic_contradiction", # 逻辑矛盾
        "continuity_error",    # 连续性错误
        "fact_error",          # 事实错误
    ]

    # 重要问题类型（自动修复 + 标记）
    MAJOR_TYPES = [
        "narrative_pacing",    # 叙事节奏问题
        "emotion_arc",         # 情感弧线偏离
        "character_behavior",  # 角色行为不符合人设
        "dialogue_issue",      # 对话问题
    ]

    # 次要问题类型（人工审核）
    MINOR_TYPES = [
        "language_polish",     # 语言润色建议
        "description_opt",     # 描写优化
        "rhetoric_improve",    # 比喻和修辞改进
        "word_choice",         # 词汇选择
    ]

    @staticmethod
    def classify(issue: Dict[str, Any]) -> IssueSeverity:
        """
        根据问题类型和严重程度分类

        Args:
            issue: 问题字典，包含 type 和 severity 字段

        Returns:
            IssueSeverity: 问题严重程度
        """
        issue_type = issue.get("type", "")
        severity = issue.get("severity", "")

        # 优先使用明确的严重程度标记
        if severity:
            severity_lower = severity.lower()
            if severity_lower in ["critical", "high", "urgent"]:
                return IssueSeverity.CRITICAL
            elif severity_lower in ["major", "medium", "important"]:
                return IssueSeverity.MAJOR
            elif severity_lower in ["minor", "low", "suggestion"]:
                return IssueSeverity.MINOR

        # 根据问题类型分类
        if issue_type in IssueClassifier.CRITICAL_TYPES:
            return IssueSeverity.CRITICAL
        elif issue_type in IssueClassifier.MAJOR_TYPES:
            return IssueSeverity.MAJOR
        elif issue_type in IssueClassifier.MINOR_TYPES:
            return IssueSeverity.MINOR

        # 默认为次要问题
        return IssueSeverity.MINOR

    @staticmethod
    def classify_issues(issues: List[Dict[str, Any]]) -> Dict[IssueSeverity, List[Dict[str, Any]]]:
        """
        批量分类问题

        Args:
            issues: 问题列表

        Returns:
            按严重程度分组的问题字典
        """
        classified = {
            IssueSeverity.CRITICAL: [],
            IssueSeverity.MAJOR: [],
            IssueSeverity.MINOR: []
        }

        for issue in issues:
            severity = IssueClassifier.classify(issue)
            classified[severity].append(issue)

        return classified

    @staticmethod
    def get_fixable_count(issues: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        获取可修复问题统计

        Args:
            issues: 问题列表

        Returns:
            统计字典
        """
        classified = IssueClassifier.classify_issues(issues)

        return {
            "critical": len(classified[IssueSeverity.CRITICAL]),
            "major": len(classified[IssueSeverity.MAJOR]),
            "minor": len(classified[IssueSeverity.MINOR]),
            "total": len(issues),
            "auto_fixable": len(classified[IssueSeverity.CRITICAL]) + len(classified[IssueSeverity.MAJOR])
        }
