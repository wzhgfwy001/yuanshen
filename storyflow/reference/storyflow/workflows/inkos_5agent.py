"""
INKOS 5-Agent 工作流实现
完整小说创作管线：雷达 → 建筑师 → 真相文件 → 写手 → 审计 → 修订
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import Node, NodeResult, LLMNode, Workflow, Engine


# ============================================================================
# RadarNode - 市场趋势雷达节点
# ============================================================================

class RadarNode(LLMNode):
    """
    雷达节点：扫描平台趋势和读者偏好
    - 输入：题材、平台、趋势关键词
    - 输出：市场分析报告
    """

    def __init__(self, node_id: str, api_key: str, model: str, config: Dict[str, Any]):
        super().__init__(node_id, "市场趋势雷达", api_key, model)
        self.config = config

        # 定义输入输出端口
        self.add_input("genre", "str", required=False, default=config.get("genre", "玄幻"))
        self.add_input("platform", "str", required=False, default=config.get("platform", "起点"))
        self.add_input("trend_keywords", "list", required=False,
                      default=config.get("trend_keywords", []))

        self.add_output("market_report", "dict")
        self.add_output("reader_preferences", "dict")
        self.add_output("story_direction", "str")

    async def execute(self) -> NodeResult:
        """执行市场趋势分析"""
        genre = self.input_values.get("genre", self.config.get("genre", "玄幻"))
        platform = self.input_values.get("platform", self.config.get("platform", "起点"))
        keywords = self.input_values.get("trend_keywords", self.config.get("trend_keywords", []))

        # 构建提示词
        prompt = f"""
作为一个专业的网络小说市场分析师，请分析以下市场情况：

**题材类型**: {genre}
**目标平台**: {platform}
**当前热门关键词**: {', '.join(keywords) if keywords else '无'}

请输出市场分析报告，包括：
1. 当前市场趋势分析
2. 读者偏好画像
3. 推荐的故事方向
4. 竞品分析
5. 创新机会点

请以 JSON 格式输出，包含以下字段：
- market_trends: 市场趋势列表
- reader_preferences: 读者偏好（年龄、性别、阅读习惯等）
- story_direction: 故事方向建议
- competitors: 竞品分析
- innovation_points: 创新机会点
"""

        try:
            response = await self.call_llm(prompt)

            # 尝试解析 JSON
            try:
                market_data = json.loads(response)
            except json.JSONDecodeError:
                # 如果无法解析，构建默认结构
                market_data = {
                    "market_trends": [response],
                    "reader_preferences": {"age_group": "18-35", "gender": "male"},
                    "story_direction": response,
                    "competitors": [],
                    "innovation_points": []
                }

            return NodeResult(
                success=True,
                data={
                    "market_report": market_data,
                    "reader_preferences": market_data.get("reader_preferences", {}),
                    "story_direction": market_data.get("story_direction", "")
                }
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))


# ============================================================================
# ArchitectNode - 章节结构建筑师节点
# ============================================================================

class ArchitectNode(LLMNode):
    """
    建筑师节点：规划章节结构、大纲设计、场景节拍、节奏控制
    - 输入：市场上下文、章节数、目标字数
    - 输出：章节大纲
    """

    def __init__(self, node_id: str, api_key: str, model: str, config: Dict[str, Any]):
        super().__init__(node_id, "章节结构建筑师", api_key, model)
        self.config = config

        # 定义输入输出端口
        self.add_input("market_context", "dict", required=False, default={})
        self.add_input("chapter_number", "int", required=False, default=config.get("chapter_number", 1))
        self.add_input("target_words", "int", required=False, default=config.get("target_words", 3000))
        self.add_input("previous_outline", "str", required=False, default="")

        self.add_output("chapter_outline", "dict")
        self.add_output("scene_breakdown", "list")
        self.add_output("pacing_plan", "dict")

    async def execute(self) -> NodeResult:
        """执行章节结构规划"""
        market_context = self.input_values.get("market_context", {})
        chapter_number = self.input_values.get("chapter_number", self.config.get("chapter_number", 1))
        target_words = self.input_values.get("target_words", self.config.get("target_words", 3000))
        previous_outline = self.input_values.get("previous_outline", "")

        # 构建提示词
        prompt = f"""
作为一个专业的小说架构师，请为第 {chapter_number} 章设计详细的章节大纲。

**章节信息**:
- 章节数: {chapter_number}
- 目标字数: {target_words}
- 市场趋势: {json.dumps(market_context, ensure_ascii=False)}
- 上一章大纲: {previous_outline or '无'}

请输出章节大纲，包括：
1. 章节标题
2. 章节目标（这一章要达成什么）
3. 场景分解（3-5个场景）
4. 每个场景的节拍（起承转合）
5. 节奏规划（快/慢/平衡）
6. 情感曲线
7. 关键冲突点

请以 JSON 格式输出，包含以下字段：
- chapter_title: 章节标题
- chapter_goal: 章节目标
- scene_breakdown: 场景列表（每个场景包含：场景名、地点、时间、参与角色、核心事件、情感基调）
- pacing_plan: 节奏规划（快慢分布）
- emotional_curve: 情感曲线
- key_conflicts: 关键冲突点
"""

        try:
            response = await self.call_llm(prompt)

            # 尝试解析 JSON
            try:
                outline_data = json.loads(response)
            except json.JSONDecodeError:
                # 如果无法解析，构建默认结构
                outline_data = {
                    "chapter_title": f"第{chapter_number}章",
                    "chapter_goal": response[:200],
                    "scene_breakdown": [],
                    "pacing_plan": {},
                    "emotional_curve": [],
                    "key_conflicts": []
                }

            return NodeResult(
                success=True,
                data={
                    "chapter_outline": outline_data,
                    "scene_breakdown": outline_data.get("scene_breakdown", []),
                    "pacing_plan": outline_data.get("pacing_plan", {})
                }
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))


# ============================================================================
# WriterNode - 章节写手节点
# ============================================================================

class WriterNode(LLMNode):
    """
    写手节点：根据大纲生成正文，两阶段：创意写作 → 状态结算
    - 输入：章节大纲、真相上下文
    - 输出：章节草稿 + 状态更新
    """

    def __init__(self, node_id: str, api_key: str, model: str, config: Dict[str, Any]):
        super().__init__(node_id, "章节写手", api_key, model)
        self.config = config

        # 定义输入输出端口
        self.add_input("chapter_outline", "dict", required=True)
        self.add_input("truth_context", "dict", required=False, default={})
        self.add_input("style", "str", required=False, default=config.get("style", "immersive"))
        self.add_input("pacing", "str", required=False, default=config.get("pacing", "balanced"))

        self.add_output("chapter_draft", "str")
        self.add_output("state_update", "dict")
        self.add_output("word_count", "int")

    async def execute(self) -> NodeResult:
        """执行章节创作（两阶段）"""
        chapter_outline = self.input_values.get("chapter_outline", {})
        truth_context = self.input_values.get("truth_context", {})
        style = self.input_values.get("style", self.config.get("style", "immersive"))
        pacing = self.input_values.get("pacing", self.config.get("pacing", "balanced"))

        # 阶段1: 创意写作
        draft = await self._phase1_creative_writing(chapter_outline, truth_context, style, pacing)

        # 阶段2: 状态结算
        state_update = await self._phase2_state_settlement(draft, truth_context)

        return NodeResult(
            success=True,
            data={
                "chapter_draft": draft,
                "state_update": state_update,
                "word_count": len(draft)
            }
        )

    async def _phase1_creative_writing(self, outline: Dict, truth: Dict, style: str, pacing: str) -> str:
        """阶段1: 创意写作"""
        prompt = f"""
作为一个专业的小说作家，请根据以下大纲创作章节正文。

**章节大纲**:
{json.dumps(outline, ensure_ascii=False, indent=2)}

**真相文件上下文**:
{json.dumps(truth, ensure_ascii=False, indent=2)}

**写作风格**: {style}
**节奏**: {pacing}

创作要求：
1. 严格按照大纲的场景节拍创作
2. 保持角色行为与真相文件一致
3. 注意节奏控制，{pacing} 节奏
4. 语言生动，画面感强
5. 避免 AI 味（陈词滥调、重复句式）
6. 字数符合目标要求

请直接输出正文内容，不要包含解释或说明。
"""

        response = await self.call_llm(prompt)
        return response

    async def _phase2_state_settlement(self, draft: str, truth: Dict) -> Dict:
        """阶段2: 状态结算"""
        prompt = f"""
根据以下章节正文，提取状态更新信息：

**章节正文**:
{draft[:5000]}

**当前真相文件**:
{json.dumps(truth, ensure_ascii=False, indent=2)}

请提取以下状态更新，以 JSON 格式输出：
- character_updates: 角色状态更新（位置、情绪、关系变化等）
- plot_progress: 剧情进度推进
- world_changes: 世界观元素变化
- new_hooks: 新埋下的伏笔
- resolved_hooks: 已解决的伏笔
"""

        try:
            response = await self.call_llm(prompt)
            try:
                state_update = json.loads(response)
            except json.JSONDecodeError:
                state_update = {
                    "character_updates": {},
                    "plot_progress": [],
                    "world_changes": [],
                    "new_hooks": [],
                    "resolved_hooks": []
                }
            return state_update
        except Exception as e:
            return {
                "character_updates": {},
                "plot_progress": [],
                "world_changes": [],
                "new_hooks": [],
                "resolved_hooks": []
            }


# ============================================================================
# AuditNode - 33维度审计节点
# ============================================================================

class AuditNode(LLMNode):
    """
    审计节点：33维度审计，对照真相文件检查
    - 输入：章节内容、当前状态
    - 输出：审计结果
    """

    def __init__(self, node_id: str, api_key: str, model: str, config: Dict[str, Any]):
        super().__init__(node_id, "33维度审计员", api_key, model)
        self.config = config

        # 定义输入输出端口
        self.add_input("chapter_content", "str", required=True)
        self.add_input("current_state", "dict", required=False, default={})
        self.add_input("strict_mode", "bool", required=False, default=config.get("strict_mode", True))

        self.add_output("audit_report", "dict")
        self.add_output("issues", "list")
        self.add_output("critical_issues_count", "int")
        self.add_output("passed", "bool")

    async def execute(self) -> NodeResult:
        """执行33维度审计"""
        chapter_content = self.input_values.get("chapter_content", "")
        current_state = self.input_values.get("current_state", {})
        strict_mode = self.input_values.get("strict_mode", self.config.get("strict_mode", True))

        # 33个审计维度
        dimensions = [
            "逻辑一致性", "角色行为", "剧情连贯", "对话自然", "细节描写",
            "节奏把控", "情感深度", "冲突设计", "伏笔埋设", "角色成长",
            "世界观一致", "场景转换", "时间线一致", "道具使用", "技能设定",
            "信息量控制", "阅读体验", "代入感", "悬念设置", "高潮设计",
            "结尾力度", "人物关系", "语言风格", "用词精准", "句式变化",
            "段落结构", "标点规范", "错别字", "格式规范", "原创性",
            "市场匹配", "目标受众", "完成度"
        ]

        # 构建审计提示词
        prompt = f"""
作为一个专业的文学审稿人，请从33个维度审计以下章节内容。

**章节内容**:
{chapter_content[:8000]}

**当前状态**:
{json.dumps(current_state, ensure_ascii=False, indent=2)}

**审计维度**:
{', '.join(dimensions)}

请进行严格审计，输出 JSON 格式的审计报告，包含：
- overall_score: 总体评分（0-100）
- dimension_scores: 各维度评分
- issues: 问题列表（每个问题包含：维度、问题描述、严重程度、位置）
- critical_issues: 关键问题列表（严重程度为 high 的问题）
- passed: 是否通过（总体评分 >= 80 且关键问题数 == 0）
- suggestions: 改进建议
"""

        try:
            response = await self.call_llm(prompt)

            # 尝试解析 JSON
            try:
                audit_data = json.loads(response)
            except json.JSONDecodeError:
                # 如果无法解析，构建默认结构
                audit_data = {
                    "overall_score": 70,
                    "dimension_scores": {},
                    "issues": [],
                    "critical_issues": [],
                    "passed": False,
                    "suggestions": ["请重新生成内容"]
                }

            # 计算 critical_issues_count
            critical_issues = audit_data.get("critical_issues", [])
            critical_issues_count = len(critical_issues)

            # 判断是否通过
            passed = audit_data.get("passed", False)
            if strict_mode:
                passed = passed and critical_issues_count == 0

            return NodeResult(
                success=True,
                data={
                    "audit_report": audit_data,
                    "issues": audit_data.get("issues", []),
                    "critical_issues_count": critical_issues_count,
                    "passed": passed
                }
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))


# ============================================================================
# ReviserNode - 智能修订节点
# ============================================================================

class ReviserNode(LLMNode):
    """
    修订节点：修复审计问题、去 AI 味处理
    - 输入：审计问题、原始内容
    - 输出：修订后章节
    """

    def __init__(self, node_id: str, api_key: str, model: str, config: Dict[str, Any]):
        super().__init__(node_id, "智能修订者", api_key, model)
        self.config = config

        # 定义输入输出端口
        self.add_input("audit_issues", "dict", required=True)
        self.add_input("original_content", "str", required=True)
        self.add_input("remove_ai_traces", "bool", required=False,
                      default=config.get("remove_ai_traces", True))
        self.add_input("enhance_readability", "bool", required=False,
                      default=config.get("enhance_readability", True))

        self.add_output("final_chapter", "str")
        self.add_output("revision_log", "list")
        self.add_output("word_count", "int")

    async def execute(self) -> NodeResult:
        """执行智能修订"""
        audit_issues = self.input_values.get("audit_issues", {})
        original_content = self.input_values.get("original_content", "")
        remove_ai_traces = self.input_values.get("remove_ai_traces", True)
        enhance_readability = self.input_values.get("enhance_readability", True)

        # 构建修订提示词
        prompt = f"""
作为一个专业的文学编辑，请修订以下章节内容。

**原始内容**:
{original_content}

**审计问题**:
{json.dumps(audit_issues, ensure_ascii=False, indent=2)}

**修订要求**:
1. 修复所有审计问题
2. {'去除 AI 味（陈词滥调、重复句式、机械表达）' if remove_ai_traces else ''}
3. {'增强可读性和代入感' if enhance_readability else ''}
4. 保持原有故事情节和角色设定不变
5. 语言更加自然流畅
6. 增加细节描写，丰富画面感

请输出修订后的内容和修订日志，以 JSON 格式：
- final_content: 修订后的完整内容
- revision_log: 修订日志（列出主要修改点）
- changes_count: 修改数量
"""

        try:
            response = await self.call_llm(prompt)

            # 尝试解析 JSON
            try:
                revision_data = json.loads(response)
            except json.JSONDecodeError:
                # 如果无法解析，使用原始内容
                revision_data = {
                    "final_content": original_content,
                    "revision_log": ["解析失败，保持原内容"],
                    "changes_count": 0
                }

            final_content = revision_data.get("final_content", original_content)

            return NodeResult(
                success=True,
                data={
                    "final_chapter": final_content,
                    "revision_log": revision_data.get("revision_log", []),
                    "word_count": len(final_content)
                }
            )

        except Exception as e:
            return NodeResult(success=False, error=str(e))


# ============================================================================
# LoopEngine - 支持循环的工作流执行引擎
# ============================================================================

@dataclass
class LoopConfig:
    """循环配置"""
    enabled: bool = False
    loop_nodes: List[str] = field(default_factory=list)
    max_iterations: int = 3
    exit_condition: str = ""


class LoopEngine(Engine):
    """支持循环的工作流执行引擎"""

    def __init__(self, workflow: Workflow, loop_config: LoopConfig):
        super().__init__(workflow)
        self.loop_config = loop_config
        self.iteration_count = 0

    async def execute(self) -> Dict[str, Any]:
        """执行工作流（支持循环）"""

        # 第一次执行完整工作流
        result = await super().execute()

        # 如果启用循环且存在循环节点
        if self.loop_config.enabled and self.loop_config.loop_nodes:
            await self._execute_loop(result)

        return result

    async def _execute_loop(self, initial_result: Dict[str, Any]):
        """执行循环逻辑"""
        self.iteration_count = 0

        while self.iteration_count < self.loop_config.max_iterations:
            self.iteration_count += 1

            # 检查退出条件
            if self._check_exit_condition(initial_result):
                print(f"✅ 循环退出条件满足，结束循环（第 {self.iteration_count} 次迭代）")
                break

            # 执行循环节点
            loop_result = await self._execute_loop_nodes()
            initial_result["results"].update(loop_result)

            print(f"🔄 循环迭代 {self.iteration_count}/{self.loop_config.max_iterations} 完成")

        if self.iteration_count >= self.loop_config.max_iterations:
            print(f"⚠️  达到最大迭代次数 {self.loop_config.max_iterations}，强制退出循环")

    def _check_exit_condition(self, result: Dict[str, Any]) -> bool:
        """检查退出条件"""
        condition = self.loop_config.exit_condition

        # 简单条件解析（例如：critical_issues_count == 0）
        if "critical_issues_count == 0" in condition:
            # 查找审计节点结果
            for node_id, node_result in result["results"].items():
                if "critical_issues_count" in node_result:
                    return node_result["critical_issues_count"] == 0

        return False

    async def _execute_loop_nodes(self) -> Dict[str, Any]:
        """执行循环节点"""
        results = {}

        for node_id in self.loop_config.loop_nodes:
            if node_id not in self.workflow.nodes:
                continue

            node = self.workflow.nodes[node_id]

            # 传播数据到当前节点
            self.workflow.propagate_to_node(node_id)

            # 验证输入
            if not node.validate_inputs():
                print(f"⚠️  节点 {node.name} ({node_id}) 输入不完整，跳过")
                continue

            # 执行节点
            try:
                result = node.execute()
                # 如果 execute 返回的是协程，await 它
                if asyncio.iscoroutine(result):
                    result = await result

                node.output_values = result.data
                results[node_id] = result.data

                self.execution_log.append({
                    "node_id": node_id,
                    "status": "success" if result.success else "failed",
                    "error": result.error,
                    "outputs": result.data,
                    "iteration": self.iteration_count
                })

            except Exception as e:
                print(f"❌ 节点 {node.name} 执行失败: {str(e)}")
                self.execution_log.append({
                    "node_id": node_id,
                    "status": "error",
                    "error": str(e),
                    "iteration": self.iteration_count
                })

        return results


# ============================================================================
# INKOS5AgentWorkflow - 完整的 5-Agent 工作流
# ============================================================================

class INKOS5AgentWorkflow:
    """INKOS 5-Agent 接力工作流"""

    def __init__(self, config_path: str, api_key: str, model: str = "modelstudio/qwen3.5-plus"):
        self.config_path = config_path
        self.api_key = api_key
        self.model = model
        self.config = self._load_config()
        self.workflow = self._build_workflow()
        self.engine = None

    def _load_config(self) -> Dict[str, Any]:
        """加载工作流配置"""
        with open(self.config_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _build_workflow(self) -> Workflow:
        """构建工作流"""
        workflow = Workflow(
            workflow_id=self.config["workflow_id"],
            name=self.config["name"]
        )

        # 创建节点
        node_map = {
            "RadarNode": RadarNode,
            "ArchitectNode": ArchitectNode,
            "WriterNode": WriterNode,
            "AuditNode": AuditNode,
            "ReviserNode": ReviserNode
        }

        for node_config in self.config["nodes"]:
            node_id = node_config["id"]
            node_type = node_config["type"]
            node_config_data = node_config.get("config", {})

            # TruthFilesNode 使用现有实现
            if node_type == "TruthFilesNode":
                # 这里可以集成现有的 TruthFilesNode
                # 暂时使用一个简单的模拟节点
                from engine import Node, NodeResult

                class SimpleTruthFilesNode(Node):
                    def __init__(self, node_id: str, name: str):
                        super().__init__(node_id, name)
                        self.add_input("chapter_outline", "dict", required=False, default={})
                        self.add_output("truth_files", "dict")

                    def execute(self) -> NodeResult:
                        return NodeResult(
                            success=True,
                            data={
                                "truth_files": {
                                    "current_state": {},
                                    "characters": {},
                                    "world_state": {}
                                }
                            }
                        )

                node = SimpleTruthFilesNode(node_id, "真相文件初始化")
            elif node_type in node_map:
                node_class = node_map[node_type]
                node = node_class(node_id, self.api_key, self.model, node_config_data)
            else:
                raise ValueError(f"未知的节点类型: {node_type}")

            workflow.add_node(node)

        # 添加连接
        for conn in self.config["connections"]:
            workflow.add_connection(
                source_node=conn["source"],
                source_output=conn["output"],
                target_node=conn["target"],
                target_input=conn["input"]
            )

        return workflow

    def get_engine(self) -> LoopEngine:
        """获取执行引擎"""
        loop_config_data = self.config.get("loop_config", {})
        loop_config = LoopConfig(
            enabled=loop_config_data.get("enabled", False),
            loop_nodes=loop_config_data.get("loop_nodes", []),
            max_iterations=loop_config_data.get("max_iterations", 3),
            exit_condition=loop_config_data.get("exit_condition", "")
        )

        self.engine = LoopEngine(self.workflow, loop_config)
        return self.engine

    async def execute(self) -> Dict[str, Any]:
        """执行工作流"""
        if not self.engine:
            self.get_engine()

        return await self.engine.execute()

    def get_execution_log(self) -> List[Dict[str, Any]]:
        """获取执行日志"""
        if self.engine:
            return self.engine.get_execution_log()
        return []
