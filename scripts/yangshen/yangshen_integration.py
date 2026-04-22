#!/usr/bin/env python3
"""
阳神系统 - 经验学习集成层

将学习引擎集成到主系统，实现自动学习
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# 添加scripts路径到sys.path
scripts_path = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(scripts_path))

from learn_from_experience import (
    ExperienceLearningEngine,
    create_execution,
    TaskStatus,
    AgentName
)


class YangshenSystem:
    """阳神系统集成学习引擎"""

    def __init__(self, workspace_path: str):
        self.workspace = Path(workspace_path)
        self.learning_engine = ExperienceLearningEngine(workspace_path)
        self.session_history = []

        print(f"✓ 阳神系统已初始化")
        print(f"✓ 工作目录: {self.workspace}")
        print(f"✓ 学习引擎已加载")

    def execute_task(
        self,
        task_id: str,
        description: str,
        agent: str,
        executor: callable
    ) -> Dict[str, Any]:
        """
        执行任务并自动学习

        Args:
            task_id: 任务ID
            description: 任务描述
            agent: 负责的Agent
            executor: 任务执行函数

        Returns:
            执行结果
        """
        print(f"\n{'='*60}")
        print(f"📋 任务开始: {description}")
        print(f"🤖 执行Agent: {agent}")
        print(f"🆔 任务ID: {task_id}")
        print(f"{'='*60}")

        start_time = datetime.now()
        steps = []

        try:
            # 执行任务
            steps.append({"description": f"Agent {agent} 开始执行任务"})
            result = executor()
            steps.append({"description": f"Agent {agent} 完成任务"})

            # 创建成功执行记录
            execution = create_execution(
                task_id=task_id,
                description=description,
                agent=agent,
                status="success",
                steps=steps
            )

            # 记录到学习引擎
            self.learning_engine.record_task_execution(execution)

            print(f"\n✅ 任务成功完成")
            print(f"⏱️  耗时: {(datetime.now() - start_time).total_seconds():.2f}秒")
            print(f"🧠 已提取成功模式")

            return {
                "status": "success",
                "result": result,
                "execution_time": (datetime.now() - start_time).total_seconds()
            }

        except Exception as e:
            # 记录失败步骤
            steps.append({"description": f"任务失败: {str(e)}"})

            # 创建失败执行记录
            execution = create_execution(
                task_id=task_id,
                description=description,
                agent=agent,
                status="failure",
                steps=steps,
                error=str(e)
            )

            # 记录到学习引擎
            self.learning_engine.record_task_execution(execution)

            print(f"\n❌ 任务失败")
            print(f"🔴 错误: {str(e)}")
            print(f"🧠 已记录失败教训")

            return {
                "status": "failure",
                "error": str(e),
                "execution_time": (datetime.now() - start_time).total_seconds()
            }

    def query_patterns(self, agent: str = None, pattern_type: str = None) -> List[Dict]:
        """查询成功模式"""
        patterns_path = self.learning_engine.patterns_path

        patterns = []
        for pattern_file in patterns_path.glob("*.md"):
            if pattern_file.name == "README.md":
                continue

            with open(pattern_file, "r", encoding="utf-8") as f:
                content = f.read()

                # 解析基本信息
                pattern_info = {
                    "file": pattern_file.name,
                    "content": content
                }

                # 过滤
                if agent and agent not in content:
                    continue
                if pattern_type and pattern_type not in content:
                    continue

                patterns.append(pattern_info)

        return patterns

    def query_lessons(self, agent: str = None, severity: str = None) -> List[Dict]:
        """查询失败教训"""
        lessons_path = self.learning_engine.lessons_path

        lessons = []
        for lesson_file in lessons_path.glob("*.md"):
            if lesson_file.name == "README.md":
                continue

            with open(lesson_file, "r", encoding="utf-8") as f:
                content = f.read()

                lesson_info = {
                    "file": lesson_file.name,
                    "content": content
                }

                # 过滤
                if agent and agent not in content:
                    continue
                if severity and severity not in content:
                    continue

                lessons.append(lesson_info)

        return lessons

    def get_statistics(self) -> Dict[str, Any]:
        """获取学习统计信息"""
        patterns = list(self.learning_engine.patterns_path.glob("*.md"))
        lessons = list(self.learning_engine.lessons_path.glob("*.md"))

        return {
            "patterns_count": len([p for p in patterns if p.name != "README.md"]),
            "lessons_count": len([l for l in lessons if l.name != "README.md"]),
            "patterns_path": str(self.learning_engine.patterns_path),
            "lessons_path": str(self.learning_engine.lessons_path)
        }

    def print_guidelines(self):
        """打印阳神行为准则"""
        guidelines_file = self.workspace / "YANGSHEN-GUIDELINES.md"

        if guidelines_file.exists():
            with open(guidelines_file, "r", encoding="utf-8") as f:
                content = f.read()

            # 打印核心原则部分
            lines = content.split("\n")
            print_section = False
            for i, line in enumerate(lines):
                if line.startswith("## 📜 核心原则"):
                    print_section = True
                elif line.startswith("## 🎭 Agent 职责边界"):
                    print_section = False

                if print_section:
                    print(line)
        else:
            print("⚠️  行为准则文件不存在")


# 便捷函数
def create_yangshen_system(workspace_path: str = None) -> YangshenSystem:
    """创建阳神系统实例"""
    if workspace_path is None:
        # 默认使用当前工作目录的父目录
        workspace_path = Path(__file__).parent.parent

    return YangshenSystem(workspace_path)


# 示例任务执行器
def example_task_executor():
    """示例任务执行器"""
    # 这里应该是实际的任务逻辑
    # 简化为模拟成功
    print("  执行任务逻辑...")
    print("  分析GitHub数据...")
    print("  生成报告...")
    return {"report": "任务完成"}


def example_task_with_error():
    """示例失败任务执行器"""
    print("  执行任务逻辑...")
    print("  尝试调用API...")
    raise Exception("API调用超时：连接超时30秒")


# 使用示例
if __name__ == "__main__":
    # 创建系统实例
    system = create_yangshen_system()

    # 打印行为准则（核心原则）
    print("\n" + "="*60)
    print("📜 阳神行为准则 - 核心原则")
    print("="*60)
    system.print_guidelines()

    # 执行成功任务
    print("\n\n" + "="*60)
    print("🧪 测试1: 执行成功任务")
    print("="*60)
    result1 = system.execute_task(
        task_id="test-task-001",
        description="分析GitHub热门项目",
        agent="鹿丸",
        executor=example_task_executor
    )

    # 执行失败任务
    print("\n\n" + "="*60)
    print("🧪 测试2: 执行失败任务")
    print("="*60)
    result2 = system.execute_task(
        task_id="test-task-002",
        description="调用外部API",
        agent="白哉",
        executor=example_task_with_error
    )

    # 查询学习统计
    print("\n\n" + "="*60)
    print("📊 学习统计")
    print("="*60)
    stats = system.get_statistics()
    print(f"✓ 成功模式数量: {stats['patterns_count']}")
    print(f"✓ 失败教训数量: {stats['lessons_count']}")

    # 查询模式
    print("\n\n" + "="*60)
    print("📚 成功模式")
    print("="*60)
    patterns = system.query_patterns()
    for pattern in patterns:
        print(f"  - {pattern['file']}")

    # 查询教训
    print("\n\n" + "="*60)
    print("⚠️  失败教训")
    print("="*60)
    lessons = system.query_lessons()
    for lesson in lessons:
        print(f"  - {lesson['file']}")

    print("\n\n" + "="*60)
    print("✅ 阳神系统测试完成")
    print("="*60)
