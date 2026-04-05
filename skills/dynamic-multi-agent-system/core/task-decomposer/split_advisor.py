"""
任务拆分建议器
分析任务复杂度，提供拆分建议
"""
import re
from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum


class TaskType(Enum):
    """任务类型"""
    SIMPLE = "simple"
    STANDARD = "standard"
    HYBRID = "hybrid"
    INNOVATIVE = "innovative"


@dataclass
class ComplexityAnalysis:
    """复杂度分析结果"""
    dimensions: List[str]
    complexity_score: int
    recommended_subagents: int
    exceeds_limit: bool
    should_split: bool


class TaskComplexityAnalyzer:
    """任务复杂度分析器"""
    
    # 维度关键词
    DIMENSION_KEYWORDS = {
        "创意写作": ["写", "创作", "小说", "文章", "剧本", "诗歌", "散文"],
        "数据分析": ["分析", "数据", "报告", "统计", "图表", "趋势"],
        "代码开发": ["开发", "代码", "程序", "应用", "系统", "软件", "网站"],
        "研究整理": ["研究", "整理", "收集", "信息", "资料", "调研"],
        "方案设计": ["设计", "方案", "规划", "计划", "体系", "架构"],
        "翻译": ["翻译", "译成", "译为"],
        "总结": ["总结", "概括", "摘要", "提炼"]
    }
    
    # 复杂度权重
    COMPLEXITY_WEIGHTS = {
        "简单": 1,
        "中等": 2,
        "复杂": 3,
        "非常复杂": 4
    }
    
    def analyze(self, task_description: str) -> ComplexityAnalysis:
        """分析任务复杂度"""
        # 识别维度
        dimensions = self._identify_dimensions(task_description)
        
        # 计算复杂度
        complexity_score = self._calculate_complexity(task_description, dimensions)
        
        # 推荐子 Agent 数量
        recommended_subagents = self._recommend_subagents(complexity_score)
        
        # 判断是否超限
        exceeds_limit = recommended_subagents > 6  # 单任务上限 6 个
        
        # 判断是否需要拆分
        should_split = exceeds_limit or len(dimensions) > 3
        
        return ComplexityAnalysis(
            dimensions=dimensions,
            complexity_score=complexity_score,
            recommended_subagents=recommended_subagents,
            exceeds_limit=exceeds_limit,
            should_split=should_split
        )
    
    def _identify_dimensions(self, description: str) -> List[str]:
        """识别任务维度"""
        dimensions = []
        
        for dimension, keywords in self.DIMENSION_KEYWORDS.items():
            if any(keyword in description for keyword in keywords):
                dimensions.append(dimension)
        
        return dimensions if dimensions else ["通用任务"]
    
    def _calculate_complexity(self, description: str, dimensions: List[str]) -> int:
        """计算复杂度评分"""
        score = 0
        
        # 基础分：维度数量
        score += len(dimensions) * 2
        
        # 复杂度关键词
        complex_keywords = ["完整", "详细", "复杂", "全面", "深入", "专业", "高质量"]
        for keyword in complex_keywords:
            if keyword in description:
                score += 1
        
        # 字数要求
        word_match = re.search(r'(\d+)\s*[字个]', description)
        if word_match:
            word_count = int(word_match.group(1))
            if word_count > 1000:
                score += 1
            if word_count > 3000:
                score += 2
            if word_count > 10000:
                score += 3
        
        # 多重要求
        requirement_count = description.count("要求") + description.count("需要")
        score += min(requirement_count, 3)
        
        return min(score, 15)  # 最高 15 分
    
    def _recommend_subagents(self, complexity_score: int) -> int:
        """推荐子 Agent 数量"""
        if complexity_score <= 2:
            return 1
        elif complexity_score <= 4:
            return 2
        elif complexity_score <= 6:
            return 3
        elif complexity_score <= 8:
            return 4
        elif complexity_score <= 10:
            return 5
        else:
            return 6  # 不超过上限


class TaskSplitAdvisor:
    """任务拆分建议器"""
    
    def generate_split_plan(self, analysis: ComplexityAnalysis, task_description: str) -> Dict[str, Any]:
        """生成拆分计划"""
        if not analysis.should_split:
            return {
                "should_split": False,
                "message": "✅ 任务复杂度适中，无需拆分"
            }
        
        # 生成子任务
        subtasks = []
        for i, dimension in enumerate(analysis.dimensions):
            subtask = {
                "id": i + 1,
                "name": f"{dimension}子任务",
                "description": f"负责{dimension}部分",
                "estimated_subagents": max(1, min(6, analysis.recommended_subagents // len(analysis.dimensions))),
                "dependencies": [] if i == 0 else [i],
                "estimated_duration_minutes": self._estimate_duration(dimension)
            }
            subtasks.append(subtask)
        
        # 生成执行策略
        execution_strategy = self._generate_execution_strategy(subtasks)
        
        return {
            "should_split": True,
            "reason": f"任务复杂度较高（{analysis.complexity_score}分），建议拆分为 {len(analysis.dimensions)} 个子任务",
            "complexity_score": analysis.complexity_score,
            "recommended_subagents": analysis.recommended_subagents,
            "subtasks": subtasks,
            "execution_strategy": execution_strategy,
            "estimated_total_duration": sum(t["estimated_duration_minutes"] for t in subtasks)
        }
    
    def _estimate_duration(self, dimension: str) -> int:
        """估算子任务耗时（分钟）"""
        duration_map = {
            "创意写作": 60,
            "数据分析": 45,
            "代码开发": 90,
            "研究整理": 40,
            "方案设计": 50,
            "翻译": 20,
            "总结": 15,
            "通用任务": 30
        }
        return duration_map.get(dimension, 30)
    
    def _generate_execution_strategy(self, subtasks: List[Dict]) -> str:
        """生成执行策略"""
        num_subtasks = len(subtasks)
        
        if num_subtasks <= 2:
            return "建议串行执行：先完成任务 1，再完成任务 2"
        elif num_subtasks <= 4:
            return "建议分组并行执行：任务 1-2 并行，任务 3-4 并行"
        else:
            return "建议分批执行：第一批任务 1-3 并行，第二批任务 4-6 并行"


def analyze_task(task_description: str) -> Dict[str, Any]:
    """分析任务并提供建议（主接口）"""
    analyzer = TaskComplexityAnalyzer()
    advisor = TaskSplitAdvisor()
    
    # 分析复杂度
    analysis = analyzer.analyze(task_description)
    
    # 生成拆分建议
    split_plan = advisor.generate_split_plan(analysis, task_description)
    
    # 生成用户提示
    user_message = _generate_user_message(analysis, split_plan)
    
    return {
        "analysis": {
            "dimensions": analysis.dimensions,
            "complexity_score": analysis.complexity_score,
            "recommended_subagents": analysis.recommended_subagents,
            "exceeds_limit": analysis.exceeds_limit
        },
        "split_plan": split_plan,
        "user_message": user_message
    }


def _generate_user_message(analysis: ComplexityAnalysis, split_plan: Dict) -> str:
    """生成用户提示信息"""
    if not analysis.should_split:
        return f"""✅ 任务复杂度适中，无需拆分

📊 分析结果：
   - 任务维度：{', '.join(analysis.dimensions)}
   - 复杂度评分：{analysis.complexity_score}
   - 推荐子 Agent 数：{analysis.recommended_subagents}

可以直接执行！"""
    
    msg = f"""⚠️ 任务复杂度较高，建议拆分

📊 分析结果：
   - 任务维度：{', '.join(analysis.dimensions)}
   - 复杂度评分：{analysis.complexity_score}
   - 推荐子 Agent 数：{analysis.recommended_subagents}（上限：6）

💡 拆分建议：
   建议拆分为 {len(split_plan['subtasks'])} 个子任务：
"""
    
    for subtask in split_plan["subtasks"]:
        msg += f"\n   {subtask['id']}. {subtask['name']} - 需要{subtask['estimated_subagents']}个子 Agent，预计{subtask['estimated_duration_minutes']}分钟"
    
    msg += f"\n\n📋 执行策略：\n   {split_plan['execution_strategy']}"
    msg += f"\n\n⏱️ 预计总耗时：{split_plan['estimated_total_duration']}分钟"
    
    return msg


# 测试示例
if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    # 示例 1：简单任务
    task1 = "翻译这段文字为英文"
    result1 = analyze_task(task1)
    print("Example 1: Simple Task")
    print(result1["user_message"].encode('utf-8').decode('utf-8'))
    print("\n" + "="*50 + "\n")
    
    # 示例 2：复杂任务
    task2 = "为一家 50 人的科技公司设计完整的管理体系，包括组织架构、决策流程、激励机制、远程办公政策、弹性工作制、实施路线图、风险评估"
    result2 = analyze_task(task2)
    print("Example 2: Complex Task")
    print(result2["user_message"].encode('utf-8').decode('utf-8'))
    print("\n" + "="*50 + "\n")
    
    # 示例 3：超限任务
    task3 = "开发一个完整的电商平台，包括前端 UI 设计、后端 API 开发、数据库设计、支付系统集成、物流系统集成、用户认证系统、订单管理系统、库存管理系统、数据分析系统、客服系统"
    result3 = analyze_task(task3)
    print("Example 3: Exceeded Task")
    print(result3["user_message"].encode('utf-8').decode('utf-8'))
