#!/usr/bin/env python3
"""
历史任务学习器

从历史任务记录中提取模式和教训
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# 添加scripts路径
scripts_path = Path(__file__).parent.parent / "scripts"
import sys
sys.path.insert(0, str(scripts_path))

from learn_from_experience import (
    ExperienceLearningEngine,
    create_execution,
    TaskStatus
)


class HistoricalTaskLearner:
    """历史任务学习器"""

    def __init__(self, workspace_path: str):
        self.workspace = Path(workspace_path)
        self.engine = ExperienceLearningEngine(workspace_path)

    def learn_from_memory_files(self) -> Dict[str, Any]:
        """从memory文件中学习"""
        memory_dir = self.workspace / "memory"

        if not memory_dir.exists():
            return {"status": "skip", "reason": "memory目录不存在"}

        memory_files = list(memory_dir.glob("*.md"))

        if not memory_files:
            return {"status": "skip", "reason": "没有memory文件"}

        stats = {
            "files_processed": 0,
            "patterns_extracted": 0,
            "lessons_extracted": 0,
            "tasks_analyzed": 0
        }

        for memory_file in memory_files:
            if memory_file.name == "MEMORY.md":
                continue

            stats["files_processed"] += 1
            result = self._analyze_memory_file(memory_file)
            stats["patterns_extracted"] += result["patterns"]
            stats["lessons_extracted"] += result["lessons"]
            stats["tasks_analyzed"] += result["tasks"]

        return stats

    def _analyze_memory_file(self, filepath: Path) -> Dict[str, int]:
        """分析单个memory文件"""
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        stats = {
            "tasks": 0,
            "patterns": 0,
            "lessons": 0
        }

        # 提取任务记录
        task_pattern = r"## 任务执行记录|任务完成|任务失败"
        task_matches = re.findall(task_pattern, content)
        stats["tasks"] = len(task_matches)

        # 分析成功任务
        success_keywords = ["成功", "完成", "✅", "done", "success"]
        for keyword in success_keywords:
            if keyword in content.lower():
                stats["patterns"] += 1
                break

        # 分析失败任务
        error_keywords = ["失败", "错误", "❌", "error", "timeout", "exception"]
        for keyword in error_keywords:
            if keyword in content.lower():
                stats["lessons"] += 1
                break

        return stats

    def generate_sample_patterns(self) -> List[Dict]:
        """生成示例模式（基于常见任务类型）"""
        common_patterns = [
            {
                "agent": "鹿丸",
                "type": "task_decomposition",
                "name": "复杂任务分解模式",
                "description": "将复杂任务分解为可执行的子任务",
                "steps": [
                    "分析任务目标和约束",
                    "识别关键里程碑",
                    "分解为可管理的子任务",
                    "评估子任务依赖关系",
                    "分配子任务给合适的Agent"
                ]
            },
            {
                "agent": "白哉",
                "type": "implementation",
                "name": "代码实现最佳实践模式",
                "description": "编写高质量、可维护的代码",
                "steps": [
                    "分析需求和技术约束",
                    "设计代码结构",
                    "编写清晰的注释",
                    "实现核心逻辑",
                    "添加错误处理",
                    "编写测试用例"
                ]
            },
            {
                "agent": "艾斯",
                "type": "data_analysis",
                "name": "数据分析模式",
                "description": "收集、清洗和分析数据",
                "steps": [
                    "定义分析目标",
                    "收集数据",
                    "清洗和验证数据",
                    "探索性分析",
                    "生成分析报告"
                ]
            },
            {
                "agent": "山寺三郎",
                "type": "writing",
                "name": "内容创作模式",
                "description": "创作高质量的内容",
                "steps": [
                    "明确受众和目的",
                    "收集素材和灵感",
                    "构建内容框架",
                    "撰写内容",
                    "审核和修改"
                ]
            }
        ]

        return common_patterns

    def generate_sample_lessons(self) -> List[Dict]:
        """生成示例教训（基于常见错误）"""
        common_lessons = [
            {
                "agent": "白哉",
                "type": "api_timeout",
                "name": "API调用超时教训",
                "severity": "high",
                "description": "外部API调用未设置超时导致长时间阻塞",
                "root_cause": "没有为API调用设置超时参数",
                "solution": "设置合理的超时时间（10-30秒）",
                "prevention": [
                    "所有外部API调用必须设置超时",
                    "实现重试机制",
                    "提供降级方案"
                ],
                "warnings": [
                    "⚠️ 不要假设API总是可用",
                    "⚠️ 超时设置要合理，不宜过长"
                ]
            },
            {
                "agent": "白哉",
                "type": "data_validation",
                "name": "数据验证缺失教训",
                "severity": "medium",
                "description": "处理数据时未验证格式导致错误",
                "root_cause": "假设数据格式正确",
                "solution": "添加数据验证逻辑",
                "prevention": [
                    "验证数据格式",
                    "处理边界情况",
                    "提供默认值"
                ],
                "warnings": [
                    "⚠️ 不要假设数据格式正确",
                    "⚠️ 输入验证是必要的"
                ]
            },
            {
                "agent": "鹿丸",
                "type": "task_clarity",
                "name": "需求不明确教训",
                "severity": "medium",
                "description": "任务需求不明确导致返工",
                "root_cause": "没有充分确认用户需求",
                "solution": "任务开始前明确验收标准",
                "prevention": [
                    "需求不明确时立即提问",
                    "提供多个方案供用户选择",
                    "明确交付标准"
                ],
                "warnings": [
                    "⚠️ 不要猜测用户意图",
                    "⚠️ 主动沟通避免返工"
                ]
            },
            {
                "agent": "艾斯",
                "type": "data_source",
                "name": "数据源不可靠教训",
                "severity": "high",
                "description": "数据源不稳定导致分析失败",
                "root_cause": "没有验证数据源的可靠性",
                "solution": "评估数据源质量和稳定性",
                "prevention": [
                    "测试数据源可用性",
                    "设计数据备份方案",
                    "提供备用数据源"
                ],
                "warnings": [
                    "⚠️ 不要完全依赖单一数据源",
                    "⚠️ 数据质量决定分析质量"
                ]
            }
        ]

        return common_lessons

    def import_sample_patterns(self) -> int:
        """导入示例模式"""
        patterns = self.generate_sample_patterns()
        imported = 0

        for pattern_data in patterns:
            # 检查是否已存在
            existing = self._find_pattern_by_type(pattern_data["agent"], pattern_data["type"])
            if existing:
                continue

            # 创建新模式文件
            timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            filename = f"{timestamp}-{pattern_data['agent']}-{pattern_data['type']}.md"
            filepath = self.engine.patterns_path / filename

            content = f"""---
id: pattern-{pattern_data['type']}
created_at: {datetime.now().isoformat()}
agent: {pattern_data['agent']}
type: {pattern_data['type']}
tags: [{pattern_data['type']}]
trigger_count: 0
success_rate: 1.0
---

# {pattern_data['name']}

## 适用场景
{pattern_data['description']}

## 触发条件
- 需要{pattern_data['type']}的场景
- Agent为{pattern_data['agent']}的任务

## 执行步骤
""" + "\n".join([f"{i+1}. {step}" for i, step in enumerate(pattern_data['steps'])]) + f"""

## 成功案例
待补充实际案例

## 关键要点
- 每步要有明确目标
- 注意依赖关系
- 及时验证结果

## 相关模式
待补充

## 改进建议
待补充
"""

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)

            imported += 1

        return imported

    def import_sample_lessons(self) -> int:
        """导入示例教训"""
        lessons = self.generate_sample_lessons()
        imported = 0

        for lesson_data in lessons:
            # 检查是否已存在
            existing = self._find_lesson_by_type(lesson_data["agent"], lesson_data["type"])
            if existing:
                continue

            # 创建新教训文件
            timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
            filename = f"{timestamp}-{lesson_data['agent']}-{lesson_data['type']}.md"
            filepath = self.engine.lessons_path / filename

            content = f"""---
id: lesson-{lesson_data['type']}
created_at: {datetime.now().isoformat()}
agent: {lesson_data['agent']}
type: {lesson_data['type']}
severity: {lesson_data['severity']}
tags: [{lesson_data['type']}]
occurrence_count: 1
resolved: false
---

# {lesson_data['name']}

## 问题描述
{lesson_data['description']}

## 根本原因
{lesson_data['root_cause']}

## 影响范围
待评估

## 解决方案
{lesson_data['solution']}

## 预防措施
""" + "\n".join([f"- {measure}" for measure in lesson_data['prevention']]) + f"""

## 关键警示
""" + "\n".join([f"⚠️ **{warning}**" for warning in lesson_data['warnings']]) + f"""

## 相关教训
待补充

## 改进建议
待补充
"""

            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)

            imported += 1

        return imported

    def _find_pattern_by_type(self, agent: str, pattern_type: str) -> bool:
        """查找是否已存在相同类型的模式"""
        for pattern_file in self.engine.patterns_path.glob("*.md"):
            if pattern_file.name == "README.md":
                continue
            with open(pattern_file, "r", encoding="utf-8") as f:
                content = f.read()
                if agent in content and pattern_type in content:
                    return True
        return False

    def _find_lesson_by_type(self, agent: str, lesson_type: str) -> bool:
        """查找是否已存在相同类型的教训"""
        for lesson_file in self.engine.lessons_path.glob("*.md"):
            if lesson_file.name == "README.md":
                continue
            with open(lesson_file, "r", encoding="utf-8") as f:
                content = f.read()
                if agent in content and lesson_type in content:
                    return True
        return False


# 使用示例
if __name__ == "__main__":
    print("="*60)
    print("📚 历史任务学习器")
    print("="*60)

    learner = HistoricalTaskLearner("/workspace/projects/workspace")

    # 从memory文件学习
    print("\n🔍 分析历史memory文件...")
    stats = learner.learn_from_memory_files()
    print(f"  处理文件数: {stats['files_processed']}")
    print(f"  分析任务数: {stats['tasks_analyzed']}")
    print(f"  提取模式数: {stats['patterns_extracted']}")
    print(f"  提取教训数: {stats['lessons_extracted']}")

    # 导入示例模式
    print("\n📥 导入示例成功模式...")
    patterns_imported = learner.import_sample_patterns()
    print(f"  ✓ 导入模式数: {patterns_imported}")

    # 导入示例教训
    print("\n📥 导入示例失败教训...")
    lessons_imported = learner.import_sample_lessons()
    print(f"  ✓ 导入教训数: {lessons_imported}")

    # 统计
    patterns_count = len([f for f in learner.engine.patterns_path.glob("*.md") if f.name != "README.md"])
    lessons_count = len([f for f in learner.engine.lessons_path.glob("*.md") if f.name != "README.md"])

    print("\n" + "="*60)
    print("📊 学习统计")
    print("="*60)
    print(f"✓ 成功模式总数: {patterns_count}")
    print(f"✓ 失败教训总数: {lessons_count}")
    print(f"✓ 知识库已建立")
    print("="*60)
