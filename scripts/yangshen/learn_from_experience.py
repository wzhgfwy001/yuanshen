#!/usr/bin/env python3
"""
经验学习引擎 (Experience Learning Engine)

从任务执行中学习，自动提取成功模式和失败教训
"""

import json
import hashlib
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum


class TaskStatus(Enum):
    """任务状态枚举"""
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


class AgentName(Enum):
    """Agent名称枚举"""
    LUZHOU = "鹿丸"           # 战术分析·统筹规划
    YAMAJI = "山寺三郎"       # 写作·创意·对话
    KUROSAKI = "朽木白哉"     # 代码·架构·技术实现
    ACE = "波特卡斯·D·艾斯"   # 数据分析·研究调查
    KENPACHI = "更木剑八"     # 战斗·体育咨询
    BANGU = "邦古"            # 锻炼·健身·健康


@dataclass
class TaskExecution:
    """任务执行记录"""
    task_id: str
    task_description: str
    agent: str
    status: TaskStatus
    start_time: datetime
    end_time: datetime
    steps: List[Dict[str, Any]]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    user_feedback: Optional[str] = None


@dataclass
class Pattern:
    """成功模式"""
    id: str
    name: str
    agent: str
    type: str
    description: str
    trigger_conditions: List[str]
    execution_steps: List[str]
    success_cases: List[str]
    key_points: List[str]
    created_at: datetime
    trigger_count: int = 0
    success_rate: float = 1.0


@dataclass
class Lesson:
    """失败教训"""
    id: str
    name: str
    agent: str
    type: str
    severity: str
    description: str
    root_cause: str
    solution: str
    prevention: List[str]
    warnings: List[str]
    created_at: datetime
    occurrence_count: int = 1
    resolved: bool = False


class ExperienceLearningEngine:
    """经验学习引擎主类"""

    def __init__(self, workspace_path: str):
        self.workspace = Path(workspace_path)
        self.brain_path = self.workspace / "brain"
        self.patterns_path = self.brain_path / "patterns"
        self.lessons_path = self.brain_path / "lessons"
        self.preferences_path = self.brain_path / "user_preferences"
        self.knowledge_path = self.brain_path / "common_knowledge"

        # 确保目录存在
        self._ensure_directories()

    def _ensure_directories(self):
        """确保所有必需的目录存在"""
        for path in [self.patterns_path, self.lessons_path, self.preferences_path, self.knowledge_path]:
            path.mkdir(parents=True, exist_ok=True)

    def _generate_id(self, prefix: str) -> str:
        """生成唯一ID"""
        hash_input = f"{prefix}-{datetime.now().isoformat()}"
        return hashlib.md5(hash_input.encode()).hexdigest()[:16]

    def record_task_execution(self, execution: TaskExecution):
        """记录任务执行"""
        # 保存到记忆
        self._save_to_memory(execution)

        # 根据结果学习
        if execution.status == TaskStatus.SUCCESS:
            self._extract_pattern(execution)
        else:
            self._extract_lesson(execution)

    def _save_to_memory(self, execution: TaskExecution):
        """保存任务执行记录到记忆"""
        memory_dir = self.workspace / "memory"
        today = datetime.now().strftime("%Y-%m-%d")
        memory_file = memory_dir / f"{today}.md"

        memory_dir.mkdir(parents=True, exist_ok=True)

        # 追加到今天的记忆文件
        with open(memory_file, "a", encoding="utf-8") as f:
            f.write(f"\n## 任务执行记录\n")
            f.write(f"- **任务ID**: {execution.task_id}\n")
            f.write(f"- **描述**: {execution.task_description}\n")
            f.write(f"- **Agent**: {execution.agent}\n")
            f.write(f"- **状态**: {execution.status.value}\n")
            f.write(f"- **开始时间**: {execution.start_time}\n")
            f.write(f"- **结束时间**: {execution.end_time}\n")
            if execution.error:
                f.write(f"- **错误**: {execution.error}\n")
            if execution.user_feedback:
                f.write(f"- **用户反馈**: {execution.user_feedback}\n")

    def _extract_pattern(self, execution: TaskExecution):
        """从成功任务中提取模式"""
        # 分析任务特征
        task_features = self._analyze_task_features(execution)

        # 检查是否已有相似模式
        existing_pattern = self._find_similar_pattern(task_features)

        if existing_pattern:
            # 更新现有模式
            existing_pattern.trigger_count += 1
            self._save_pattern(existing_pattern)
            print(f"✓ 更新现有模式: {existing_pattern.name}")
        else:
            # 创建新模式
            pattern = self._create_pattern_from_execution(execution, task_features)
            if pattern:
                self._save_pattern(pattern)
                print(f"✓ 创建新模式: {pattern.name}")

    def _extract_lesson(self, execution: TaskExecution):
        """从失败任务中提取教训"""
        # 分析失败原因
        failure_analysis = self._analyze_failure(execution)

        # 检查是否已有相似教训
        existing_lesson = self._find_similar_lesson(failure_analysis)

        if existing_lesson:
            # 更新现有教训
            existing_lesson.occurrence_count += 1
            self._save_lesson(existing_lesson)
            print(f"✓ 更新现有教训: {existing_lesson.name}")
        else:
            # 创建新教训
            lesson = self._create_lesson_from_execution(execution, failure_analysis)
            if lesson:
                self._save_lesson(lesson)
                print(f"✓ 创建新教训: {lesson.name}")

    def _analyze_task_features(self, execution: TaskExecution) -> Dict[str, Any]:
        """分析任务特征"""
        return {
            "agent": execution.agent,
            "task_type": self._classify_task_type(execution.task_description),
            "complexity": len(execution.steps),
            "duration": (execution.end_time - execution.start_time).total_seconds(),
            "has_dependencies": any("depend" in step.get("description", "").lower() for step in execution.steps),
        }

    def _classify_task_type(self, description: str) -> str:
        """分类任务类型"""
        desc_lower = description.lower()
        if "分解" in desc_lower or "规划" in desc_lower:
            return "task_decomposition"
        elif "分析" in desc_lower:
            return "analysis"
        elif "实现" in desc_lower or "编写" in desc_lower:
            return "implementation"
        elif "修复" in desc_lower:
            return "bugfix"
        else:
            return "general"

    def _find_similar_pattern(self, features: Dict[str, Any]) -> Optional[Pattern]:
        """查找相似模式"""
        # 这里应该实现更智能的匹配算法
        # 简化版：按agent和任务类型查找
        pattern_files = list(self.patterns_path.glob("*.md"))

        for pattern_file in pattern_files:
            with open(pattern_file, "r", encoding="utf-8") as f:
                content = f.read()
                # 简单匹配：检查是否包含相同agent和类型
                if features["agent"] in content and features["task_type"] in content:
                    return self._parse_pattern_from_file(pattern_file)

        return None

    def _find_similar_lesson(self, analysis: Dict[str, Any]) -> Optional[Lesson]:
        """查找相似教训"""
        lesson_files = list(self.lessons_path.glob("*.md"))

        for lesson_file in lesson_files:
            with open(lesson_file, "r", encoding="utf-8") as f:
                content = f.read()
                # 简单匹配：检查是否包含相同错误类型（不检查agent）
                if analysis["error_type"] in content:
                    return self._parse_lesson_from_file(lesson_file)

        return None

    def _create_pattern_from_execution(self, execution: TaskExecution, features: Dict[str, Any]) -> Optional[Pattern]:
        """从执行记录创建模式"""
        pattern_id = self._generate_id("pattern")
        timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        filename = f"{timestamp}-{execution.agent}-{features['task_type']}.md"

        pattern = Pattern(
            id=pattern_id,
            name=f"{execution.agent}的{features['task_type']}模式",
            agent=execution.agent,
            type=features["task_type"],
            description=f"从任务执行中提取的{features['task_type']}模式",
            trigger_conditions=[f"任务类型为{features['task_type']}"],
            execution_steps=[step.get("description", "") for step in execution.steps],
            success_cases=[execution.task_description],
            key_points=[],
            created_at=datetime.now(),
            trigger_count=1,
            success_rate=1.0
        )

        return pattern

    def _create_lesson_from_execution(self, execution: TaskExecution, analysis: Dict[str, Any]) -> Optional[Lesson]:
        """从执行记录创建教训"""
        lesson_id = self._generate_id("lesson")
        timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        filename = f"{timestamp}-{execution.agent}-{analysis['error_type']}.md"

        lesson = Lesson(
            id=lesson_id,
            name=f"{execution.agent}的{analysis['error_type']}教训",
            agent=execution.agent,
            type=analysis["error_type"],
            severity=analysis.get("severity", "medium"),
            description=execution.error or "任务失败",
            root_cause=analysis.get("root_cause", "待分析"),
            solution=analysis.get("solution", "待制定"),
            prevention=analysis.get("prevention", []),
            warnings=analysis.get("warnings", []),
            created_at=datetime.now(),
            occurrence_count=1,
            resolved=False
        )

        return lesson

    def _analyze_failure(self, execution: TaskExecution) -> Dict[str, Any]:
        """分析失败原因"""
        if not execution.error:
            return {
                "error_type": "unknown",
                "root_cause": "失败原因未知",
                "severity": "low"
            }

        error_lower = execution.error.lower()

        # 分类错误类型
        if "timeout" in error_lower or "超时" in error_lower:
            return {
                "error_type": "timeout",
                "root_cause": "操作超时",
                "severity": "high",
                "solution": "增加超时时间或优化性能",
                "prevention": ["设置合理的超时参数", "实现重试机制"],
                "warnings": ["⚠️ 所有外部调用都应设置超时"]
            }
        elif "api" in error_lower or "请求" in error_lower:
            return {
                "error_type": "api_error",
                "root_cause": "API调用失败",
                "severity": "medium",
                "solution": "检查API配置和参数",
                "prevention": ["验证API可用性", "添加错误处理"],
                "warnings": ["⚠️ 不要假设API总是可用"]
            }
        elif "data" in error_lower or "数据" in error_lower:
            return {
                "error_type": "data_error",
                "root_cause": "数据问题",
                "severity": "medium",
                "solution": "验证数据格式和完整性",
                "prevention": ["添加数据验证", "处理边界情况"],
                "warnings": ["⚠️ 不要假设数据格式正确"]
            }
        else:
            return {
                "error_type": "general",
                "root_cause": execution.error,
                "severity": "low",
                "solution": "需要进一步分析",
                "prevention": [],
                "warnings": []
            }

    def _parse_pattern_from_file(self, filepath: Path) -> Pattern:
        """从文件解析模式"""
        # 简化实现，实际应该解析完整的Markdown
        return Pattern(
            id="parsed-id",
            name="已存在模式",
            agent="鹿丸",
            type="workflow",
            description="从文件加载",
            trigger_conditions=[],
            execution_steps=[],
            success_cases=[],
            key_points=[],
            created_at=datetime.now()
        )

    def _parse_lesson_from_file(self, filepath: Path) -> Lesson:
        """从文件解析教训"""
        # 简化实现
        return Lesson(
            id="parsed-id",
            name="已存在教训",
            agent="白哉",
            type="error-handling",
            severity="medium",
            description="从文件加载",
            root_cause="待分析",
            solution="待制定",
            prevention=[],
            warnings=[],
            created_at=datetime.now()
        )

    def _save_pattern(self, pattern: Pattern):
        """保存模式到文件"""
        timestamp = pattern.created_at.strftime("%Y-%m-%dT%H:%M:%S")
        filename = f"{timestamp}-{pattern.agent}-{pattern.type}.md"
        filepath = self.patterns_path / filename

        content = f"""---
id: {pattern.id}
created_at: {pattern.created_at.isoformat()}
agent: {pattern.agent}
type: {pattern.type}
tags: [{pattern.type}]
trigger_count: {pattern.trigger_count}
success_rate: {pattern.success_rate}
---

# {pattern.name}

## 适用场景
{pattern.description}

## 触发条件
""" + "\n".join([f"- {cond}" for cond in pattern.trigger_conditions]) + f"""

## 执行步骤
""" + "\n".join([f"{i+1}. {step}" for i, step in enumerate(pattern.execution_steps)]) + f"""

## 成功案例
""" + "\n".join([f"- {case}" for case in pattern.success_cases]) + f"""

## 关键要点
""" + "\n".join([f"- {point}" for point in pattern.key_points]) if pattern.key_points else "待提炼" + f"""

## 相关模式
待补充

## 改进建议
待补充
"""

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

    def _save_lesson(self, lesson: Lesson):
        """保存教训到文件"""
        timestamp = lesson.created_at.strftime("%Y-%m-%dT%H:%M:%S")
        filename = f"{timestamp}-{lesson.agent}-{lesson.type}.md"
        filepath = self.lessons_path / filename

        content = f"""---
id: {lesson.id}
created_at: {lesson.created_at.isoformat()}
agent: {lesson.agent}
type: {lesson.type}
severity: {lesson.severity}
tags: [{lesson.type}]
occurrence_count: {lesson.occurrence_count}
resolved: {lesson.resolved}
---

# {lesson.name}

## 问题描述
{lesson.description}

## 根本原因
{lesson.root_cause}

## 影响范围
待评估

## 解决方案
{lesson.solution}

## 预防措施
""" + "\n".join([f"- {measure}" for measure in lesson.prevention]) if lesson.prevention else "待制定" + f"""

## 关键警示
""" + "\n".join([f"⚠️ **{warning}**" for warning in lesson.warnings]) if lesson.warnings else "无" + f"""

## 相关教训
待补充

## 改进建议
待补充
"""

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)


# 便捷函数
def create_execution(
    task_id: str,
    description: str,
    agent: str,
    status: str,
    steps: List[Dict[str, Any]],
    error: str = None,
    user_feedback: str = None
) -> TaskExecution:
    """创建任务执行记录"""
    return TaskExecution(
        task_id=task_id,
        task_description=description,
        agent=agent,
        status=TaskStatus(status),
        start_time=datetime.now(),
        end_time=datetime.now(),
        steps=steps,
        error=error,
        user_feedback=user_feedback
    )


# 使用示例
if __name__ == "__main__":
    # 初始化学习引擎
    engine = ExperienceLearningEngine("/workspace/projects/workspace")

    # 记录一个成功的任务
    success_execution = create_execution(
        task_id="task-001",
        description="分析GitHub热门项目",
        agent="鹿丸",
        status="success",
        steps=[
            {"description": "收集GitHub Trending数据"},
            {"description": "分析项目特征"},
            {"description": "生成分析报告"}
        ]
    )
    engine.record_task_execution(success_execution)

    # 记录一个失败的任务
    failure_execution = create_execution(
        task_id="task-002",
        description="调用外部API获取数据",
        agent="白哉",
        status="failure",
        steps=[
            {"description": "构建API请求"},
            {"description": "发送请求（超时）"}
        ],
        error="API调用超时，等待时间超过30秒"
    )
    engine.record_task_execution(failure_execution)

    print("\n✓ 经验学习演示完成")
    print(f"✓ 模式目录: {engine.patterns_path}")
    print(f"✓ 教训目录: {engine.lessons_path}")
