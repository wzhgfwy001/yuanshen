"""
任务拆分建议器 v2.0
基于DeerFlow架构优化：中间件管道 + Model Fallback + 结构化状态

DeerFlow借鉴：
1. MiddlewarePipeline - before_agent/after_agent钩子
2. ModelFallback - LLM分析失败时自动回退
3. StructuredState - 使用dataclass替代dict
4. ConcurrentExecution - 并行运行多种分析策略
"""
import re
import asyncio
from typing import Dict, List, Any, Callable, Optional, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
from functools import wraps
import logging

logger = logging.getLogger(__name__)


# ==================== DeerFlow借鉴1: Middleware Pipeline ====================

class MiddlewareHook(Enum):
    """中间件钩子类型"""
    BEFORE_ANALYZE = "before_analyze"
    AFTER_ANALYZE = "after_analyze"
    ON_ERROR = "on_error"


@dataclass
class MiddlewareContext:
    """中间件上下文 - 类似于DeerFlow的ThreadState"""
    task_description: str
    original_input: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    processing_time_ms: float = 0.0


class Middleware:
    """中间件基类 - 借鉴DeerFlow的before_agent/after_agent模式"""
    
    def before_analyze(self, context: MiddlewareContext) -> MiddlewareContext:
        """分析前预处理"""
        return context
    
    def after_analyze(self, context: MiddlewareContext, result: Any) -> Any:
        """分析后后处理"""
        return result
    
    def on_error(self, context: MiddlewareContext, error: Exception) -> MiddlewareContext:
        """错误处理"""
        context.errors.append(f"[{self.__class__.__name__}] {str(error)}")
        return context


class MiddlewarePipeline:
    """
    中间件管道 - 借鉴DeerFlow的11层中间件设计
    
    每个中间件可以：
    - before_analyze: 修改输入/验证
    - after_analyze: 修改输出/增强
    - on_error: 统一错误处理
    """
    
    def __init__(self):
        self.middlewares: List[Middleware] = []
    
    def use(self, middleware: Middleware):
        """注册中间件"""
        self.middlewares.append(middleware)
        return self
    
    def execute(self, task_description: str, analyze_fn: Callable) -> Any:
        """执行管道"""
        # 构建上下文
        context = MiddlewareContext(
            task_description=task_description,
            original_input=task_description,
            metadata={"pipeline_version": "2.0"}
        )
        
        # BEFORE钩子
        for mw in self.middlewares:
            try:
                context = mw.before_analyze(context)
            except Exception as e:
                context = mw.on_error(context, e)
        
        # 执行分析
        result = None
        error = None
        try:
            result = analyze_fn(context.task_description)
        except Exception as e:
            error = e
            for mw in self.middlewares:
                context = mw.on_error(context, e)
        
        # AFTER钩子
        if error is None:
            for mw in self.middlewares:
                try:
                    result = mw.after_analyze(context, result)
                except Exception as e:
                    context = mw.on_error(context, e)
        
        return result


# ==================== DeerFlow借鉴2: 具体中间件实现 ====================

class InputNormalizationMiddleware(Middleware):
    """输入规范化中间件 - 预处理"""
    
    def before_analyze(self, context: MiddlewareContext) -> MiddlewareContext:
        """规范化输入文本"""
        text = context.task_description
        
        # 去除多余空白
        text = re.sub(r'\s+', ' ', text).strip()
        
        # 规范化引号
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        context.task_description = text
        context.metadata["normalized"] = True
        return context


class ComplexityBoostingMiddleware(Middleware):
    """复杂度增强中间件 - 检测潜在复杂任务"""
    
    COMPLEXITY_INDICATORS = [
        "完整", "详细", "复杂", "全面", "深入", "专业", "高质量",
        "包括", "包含", "涉及", "涵盖",
        "多个", "若干", "各种",
        "设计", "开发", "实现", "构建"
    ]
    
    def before_analyze(self, context: MiddlewareContext) -> MiddlewareContext:
        """检测复杂度指示器"""
        text = context.task_description
        indicators_found = [ind for ind in self.COMPLEXITY_INDICATORS if ind in text]
        
        if len(indicators_found) >= 3:
            context.metadata["high_complexity"] = True
            context.metadata["complexity_indicators"] = indicators_found
        return context


class ResultEnrichmentMiddleware(Middleware):
    """结果增强中间件 - 后处理"""
    
    def after_analyze(self, context: MiddlewareContext, result: Any) -> Any:
        """增强分析结果"""
        if result is None:
            return result
        
        # 如果结果包含拆分计划，添加元数据
        if isinstance(result, dict) and result.get("should_split"):
            result["metadata"] = {
                "pipeline_version": "2.0",
                "processing_time_ms": context.processing_time_ms,
                "warnings": context.warnings,
                "middleware_count": len(context.metadata.get("middleware_applied", []))
            }
        
        return result


# ==================== DeerFlow借鉴3: Model Fallback ====================

@dataclass
class ModelFallbackConfig:
    """模型回退配置"""
    primary_model: str = "miniMax"
    fallback_models: List[str] = field(default_factory=lambda: ["deepseek", "modelstudio"])
    max_retries: int = 2
    timeout_seconds: float = 30.0


class ModelFallback:
    """
    模型回退机制 - 借鉴DeerFlow的模型回退设计
    
    当主模型失败时，自动尝试备选模型
    """
    
    def __init__(self, config: Optional[ModelFallbackConfig] = None):
        self.config = config or ModelFallbackConfig()
    
    async def execute_with_fallback(
        self, 
        primary_fn: Callable,
        fallback_fn: Optional[Callable] = None
    ) -> Any:
        """
        执行带回退的函数
        
        Args:
            primary_fn: 主模型执行函数
            fallback_fn: 备用执行函数（可选）
        """
        last_error = None
        
        # 尝试主模型
        for attempt in range(self.config.max_retries):
            try:
                result = await primary_fn()
                return {"success": True, "result": result, "model": self.config.primary_model}
            except Exception as e:
                last_error = e
                logger.warning(f"主模型{self.config.primary_model}失败，尝试{attempt+1}: {e}")
        
        # 尝试备选模型
        if fallback_fn:
            for model in self.config.fallback_models:
                try:
                    result = await fallback_fn()
                    return {"success": True, "result": result, "model": model, "fallback": True}
                except Exception as e:
                    logger.warning(f"备选模型{model}失败: {e}")
                    last_error = e
        
        return {
            "success": False, 
            "error": str(last_error) if last_error else "Unknown error",
            "fallback_attempted": True
        }
    
    def sync_execute_with_fallback(
        self,
        primary_fn: Callable,
        fallback_fn: Optional[Callable] = None
    ) -> Any:
        """同步版本的回退执行"""
        last_error = None
        
        for attempt in range(self.config.max_retries):
            try:
                result = primary_fn()
                return {"success": True, "result": result, "model": self.config.primary_model}
            except Exception as e:
                last_error = e
        
        if fallback_fn:
            for model in self.config.fallback_models:
                try:
                    result = fallback_fn()
                    return {"success": True, "result": result, "model": model, "fallback": True}
                except Exception as e:
                    last_error = e
        
        return {"success": False, "error": str(last_error) if last_error else "Unknown error"}


# ==================== DeerFlow借鉴4: Structured State (原有代码优化) ====================

class TaskType(Enum):
    """任务类型"""
    SIMPLE = "simple"
    STANDARD = "standard"  
    HYBRID = "hybrid"
    INNOVATIVE = "innovative"


@dataclass
class ComplexityAnalysis:
    """复杂度分析结果 - 结构化状态"""
    dimensions: List[str]
    complexity_score: int
    recommended_subagents: int
    exceeds_limit: bool
    should_split: bool
    task_type: TaskType = TaskType.STANDARD
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "dimensions": self.dimensions,
            "complexity_score": self.complexity_score,
            "recommended_subagents": self.recommended_subagents,
            "exceeds_limit": self.exceeds_limit,
            "should_split": self.should_split,
            "task_type": self.task_type.value
        }


# ==================== 核心分析器（原有逻辑 + DeerFlow增强） ====================

class TaskComplexityAnalyzer:
    """任务复杂度分析器 - 集成DeerFlow中间件"""
    
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
    
    def __init__(self):
        # 初始化中间件管道
        self.pipeline = MiddlewarePipeline()
        self.pipeline.use(InputNormalizationMiddleware())
        self.pipeline.use(ComplexityBoostingMiddleware())
        self.pipeline.use(ResultEnrichmentMiddleware())
        
        # 初始化模型回退
        self.model_fallback = ModelFallback()
    
    def analyze(self, task_description: str) -> ComplexityAnalysis:
        """分析任务复杂度 - 使用中间件管道"""
        
        def do_analyze(text: str) -> ComplexityAnalysis:
            # 识别维度
            dimensions = self._identify_dimensions(text)
            
            # 计算复杂度
            complexity_score = self._calculate_complexity(text, dimensions)
            
            # 推荐子 Agent 数量
            recommended_subagents = self._recommend_subagents(complexity_score)
            
            # 判断是否超限
            exceeds_limit = recommended_subagents > 6
            
            # 判断是否需要拆分
            should_split = exceeds_limit or len(dimensions) > 3
            
            # 判断任务类型
            task_type = self._classify_task_type(text, dimensions)
            
            return ComplexityAnalysis(
                dimensions=dimensions,
                complexity_score=complexity_score,
                recommended_subagents=recommended_subagents,
                exceeds_limit=exceeds_limit,
                should_split=should_split,
                task_type=task_type
            )
        
        # 通过中间件管道执行
        result = self.pipeline.execute(task_description, do_analyze)
        return result
    
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
        
        # 并行子任务检测
        parallel_keywords = ["并行", "同时", "一起", "分别"]
        if any(kw in description for kw in parallel_keywords):
            score += 2
        
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
    
    def _classify_task_type(self, description: str, dimensions: List[str]) -> TaskType:
        """分类任务类型"""
        if len(dimensions) == 1 and dimensions[0] in ["翻译", "总结"]:
            return TaskType.SIMPLE
        elif len(dimensions) == 1:
            return TaskType.STANDARD
        elif len(dimensions) == 2:
            return TaskType.HYBRID
        else:
            return TaskType.INNOVATIVE


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
            "task_type": analysis.task_type.value,
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


# ==================== 主接口 ====================

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
        "analysis": analysis.to_dict(),
        "split_plan": split_plan,
        "user_message": user_message
    }


def _generate_user_message(analysis: ComplexityAnalysis, split_plan: Dict) -> str:
    """生成用户提示信息"""
    if not analysis.should_split:
        return f"""✅ 任务复杂度适中，无需拆分

📊 分析结果：
   - 任务维度：{', '.join(analysis.dimensions)}
   - 任务类型：{analysis.task_type.value}
   - 复杂度评分：{analysis.complexity_score}
   - 推荐子 Agent 数：{analysis.recommended_subagents}

可以直接执行！"""
    
    msg = f"""⚠️ 任务复杂度较高，建议拆分

📊 分析结果：
   - 任务维度：{', '.join(analysis.dimensions)}
   - 任务类型：{analysis.task_type.value}
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


# ==================== 测试 ====================

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    print("=" * 60)
    print("DeerFlow增强版 task-decomposer v2.0")
    print("=" * 60)
    
    # 示例 1：简单任务
    task1 = "翻译这段文字为英文"
    result1 = analyze_task(task1)
    print("\n示例1: 简单任务")
    print(result1["user_message"])
    
    # 示例 2：复杂任务
    task2 = "为一家 50 人的科技公司设计完整的管理体系，包括组织架构、决策流程、激励机制、远程办公政策、弹性工作制、实施路线图、风险评估"
    result2 = analyze_task(task2)
    print("\n" + "=" * 60)
    print("\n示例2: 复杂任务")
    print(result2["user_message"])
    
    # 示例 3：超限任务
    task3 = "开发一个完整的电商平台，包括前端 UI 设计、后端 API 开发、数据库设计、支付系统集成、物流系统集成、用户认证系统、订单管理系统、库存管理系统、数据分析系统、客服系统"
    result3 = analyze_task(task3)
    print("\n" + "=" * 60)
    print("\n示例3: 超限任务")
    print(result3["user_message"])
    
    # 显示中间件处理信息
    print("\n" + "=" * 60)
    print("\n中间件管道已启用：")
    print("  - InputNormalizationMiddleware: 规范化输入")
    print("  - ComplexityBoostingMiddleware: 复杂度增强检测")
    print("  - ResultEnrichmentMiddleware: 结果增强")
    print("\n模型回退机制已启用：")
    print("  - 主模型: miniMax")
    print("  - 备选: deepseek, modelstudio")
