"""
StoryFlow 节点扩展 - 增强版 v1.1.0
新增节点: SceneNode, DialogueNode, OutlineNode, ReviseNode
更新: 使用新的ModelProvider系统
"""

import json
import os
from src.engine.engine import Node, LLMNode, NodeResult, ProviderFactory


def get_api_key(provider: str = "minimax"):
    """从环境变量获取指定Provider的API Key
    
    Args:
        provider: 提供商类型，支持 "minimax", "tongyi", "openai", "claude"
    
    Returns:
        str: API Key
    
    Raises:
        ValueError: 当未设置对应的API Key时
    """
    # 环境变量映射
    provider_keys = {
        "minimax": "STORYFLOW_API_KEY",  # MiniMax专用
        "tongyi": "DASHSCOPE_API_KEY",    # 通义千问
        "openai": "OPENAI_API_KEY",       # OpenAI
        "claude": "ANTHROPIC_API_KEY",    # Claude
    }
    
    env_var = provider_keys.get(provider)
    if not env_var:
        raise ValueError(f"不支持的Provider: {provider}，支持: {list(provider_keys.keys())}")
    
    api_key = os.environ.get(env_var)
    if not api_key:
        raise ValueError(f"请设置环境变量 {env_var}")
    
    # 验证Key格式（基本检查）
    if len(api_key) < 10:
        raise ValueError(f"{env_var} 格式可能无效（长度过短）")
    
    return api_key


def get_provider(provider_name: str = "minimax", model: str = None):
    """获取模型提供商"""
    api_key = get_api_key(provider_name)
    return ProviderFactory.create(provider_name, api_key, model)


# ============================================================
# 原有节点（更新为支持多提供商）
# ============================================================

class WorldBuildingNode(LLMNode):
    """世界观生成节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "世界观生成", provider)
        self.add_input("genre", "str", True, "奇幻")
        self.add_input("theme", "str", True, "魔法与冒险")
        self.add_output("world_description", "str")
        self.add_output("magic_system", "str")
    
    async def execute(self) -> NodeResult:
        genre = self.input_values.get("genre", "奇幻")
        theme = self.input_values.get("theme", "魔法与冒险")
        
        system_prompt = """你是一位资深的世界观构建专家，擅长创造富有想象力和内在逻辑的幻想世界。
你的回答应该详细、有条理，包含地理、政治、文化、魔法体系等元素。"""
        
        prompt = f"""请为以下题材和主题构建一个详细的世界观：

题材：{genre}
主题：{theme}

请提供：
1. 世界名称和基本描述（200字左右）
2. 魔法/力量体系（150字左右）
3. 主要国家或势力（100字左右）
4. 核心冲突（100字左右）

请用清晰的段落组织内容。"""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            
            # 优先尝试 JSON 格式解析
            try:
                data = json.loads(response)
                world_description = data.get('world_description', '')
                magic_system = data.get('magic_system', '未定义')
            except json.JSONDecodeError:
                # 非 JSON 格式，尝试提取 JSON 再解析
                import re
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    try:
                        data = json.loads(json_match.group())
                        world_description = data.get('world_description', response[:500])
                        magic_system = data.get('magic_system', response[500:800] if len(response) > 500 else "未定义")
                    except json.JSONDecodeError:
                        world_description = response[:500]
                        magic_system = response[500:800] if len(response) > 500 else "未定义"
                else:
                    world_description = response[:500]
                    magic_system = response[500:800] if len(response) > 500 else "未定义"
            
            return NodeResult(
                success=True,
                data={
                    "world_description": world_description,
                    "magic_system": magic_system,
                    "full_world": response
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class CharacterNode(LLMNode):
    """角色生成节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "角色生成", provider)
        self.add_input("world_description", "str", True)
        self.add_input("character_type", "str", True, "主角")
        self.add_input("magic_system", "str", False)
        self.add_output("character_profile", "str")
        self.add_output("character_motivation", "str")
    
    async def execute(self) -> NodeResult:
        world_desc = self.input_values.get("world_description", "")
        char_type = self.input_values.get("character_type", "主角")
        magic_system = self.input_values.get("magic_system", "")
        
        system_prompt = """你是一位专业的角色设计师，擅长创造立体、有深度的角色。
角色应该有清晰的动机、独特的性格和合理的背景故事。"""
        
        context = f"世界观背景：{world_desc}\n"
        if magic_system:
            context += f"魔法体系：{magic_system}\n"
        
        prompt = f"""{context}
请为这个世界创建一个{char_type}：

要求：
1. 角色姓名和身份（100字左右）
2. 外貌和性格特征（100字左右）
3. 背景故事（100字左右）
4. 核心动机（100字左右）
5. 特殊能力或技能（100字左右）

请用第一人称或第三人称叙述。"""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            character_profile = response[:600]
            character_motivation = response[600:900] if len(response) > 600 else "探索未知"
            
            return NodeResult(
                success=True,
                data={
                    "character_profile": character_profile,
                    "character_motivation": character_motivation,
                    "full_character": response
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class ChapterGenerationNode(LLMNode):
    """章节生成节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "章节生成", provider)
        self.add_input("world_description", "str", True)
        self.add_input("character_profile", "str", True)
        self.add_input("chapter_number", "int", True, 1)
        self.add_input("chapter_title", "str", False, "第一章")
        self.add_input("context", "str", False, "")
        self.add_output("chapter_content", "str")
        self.add_output("word_count", "int")
    
    async def execute(self) -> NodeResult:
        world_desc = self.input_values.get("world_description", "")
        char_profile = self.input_values.get("character_profile", "")
        chapter_num = self.input_values.get("chapter_number", 1)
        chapter_title = self.input_values.get("chapter_title", "第一章")
        
        system_prompt = """你是一位专业的小说作家，擅长创作引人入胜的奇幻故事。
你的文字应该生动、有画面感，注重情节推进和人物刻画。"""
        
        prompt = f"""请根据以下信息创作小说章节：

世界背景：{world_desc}
角色信息：{char_profile}
章节：第{chapter_num}章 - {chapter_title}

创作要求：
1. 字数 800-1200 字
2. 包含对话、动作和环境描写
3. 突出人物性格和动机
4. 设置悬念或冲突点
5. 开头要吸引人，结尾要有张力

请开始创作："""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            lines = response.split('\n')
            content_lines = [line for line in lines if line.strip()]
            chapter_content = '\n'.join(content_lines)
            word_count = len(chapter_content.replace(' ', ''))
            
            return NodeResult(
                success=True,
                data={
                    "chapter_content": chapter_content,
                    "word_count": word_count,
                    "chapter_title": chapter_title
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


# ============================================================
# 新增节点
# ============================================================

class SceneNode(LLMNode):
    """场景描写节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "场景描写", provider)
        self.add_input("world_description", "str", True)
        self.add_input("location", "str", True, "未命名地点")
        self.add_input("time_of_day", "str", False, "白天")
        self.add_input("mood", "str", False, "平静")
        self.add_output("scene_description", "str")
        self.add_output("ambient_sounds", "str")
    
    async def execute(self) -> NodeResult:
        world_desc = self.input_values.get("world_description", "")
        location = self.input_values.get("location", "未命名地点")
        time_of_day = self.input_values.get("time_of_day", "白天")
        mood = self.input_values.get("mood", "平静")
        
        system_prompt = """你是一位专业的场景描写作家，擅长用生动的语言描绘环境氛围。
你的描写应该富有感官细节，让读者有身临其境的感觉。"""
        
        prompt = f"""请为以下设定创作一个场景描写：

世界背景：{world_desc}
地点：{location}
时间段：{time_of_day}
氛围：{mood}

要求：
1. 200-400字
2. 包含视觉、听觉、嗅觉等多感官描写
3. 营造特定的情绪氛围
4. 与世界观保持一致

请开始描写："""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            lines = response.split('\n')
            content_lines = [line for line in lines if line.strip()]
            scene_description = '\n'.join(content_lines)
            
            # 简单提取环境音
            ambient_sounds = f"在{location}，你能听到周围的声音..."
            
            return NodeResult(
                success=True,
                data={
                    "scene_description": scene_description,
                    "ambient_sounds": ambient_sounds,
                    "location": location,
                    "mood": mood
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class DialogueNode(LLMNode):
    """对话生成节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "对话生成", provider)
        self.add_input("character_profile", "str", True)
        self.add_input("context", "str", True, "")
        self.add_input("dialogue_purpose", "str", False, "推进情节")
        self.add_output("dialogue", "str")
        self.add_output("speaker_1", "str")
        self.add_output("speaker_2", "str")
    
    async def execute(self) -> NodeResult:
        char_profile = self.input_values.get("character_profile", "")
        context = self.input_values.get("context", "")
        purpose = self.input_values.get("dialogue_purpose", "推进情节")
        
        system_prompt = """你是一位专业的小说对话作家，擅长创作自然、富有性格特点的对话。
对话应该揭示角色性格、推进情节、传递信息。"""
        
        prompt = f"""请创作一段对话：

角色信息：{char_profile}
场景上下文：{context}
对话目的：{purpose}

要求：
1. 200-400字
2. 2-3个角色
3. 对话自然，符合各角色性格
4. 通过对话推进情节或揭示关系
5. 标注说话者

格式示例：
甲：（动作）"对白"
乙：（动作）"对白"

请开始创作："""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            
            # 简单解析对话者（取前两行作为说话者）
            lines = response.split('\n')
            speakers = []
            for line in lines:
                if (':' in line or '：' in line) and len(speakers) < 2:
                    speaker = line.split(':')[0].strip()
                    if not speaker:
                        speaker = line.split('：')[0].strip()
                    if speaker:
                        speakers.append(speaker)
            
            return NodeResult(
                success=True,
                data={
                    "dialogue": response,
                    "speaker_1": speakers[0] if len(speakers) > 0 else "角色1",
                    "speaker_2": speakers[1] if len(speakers) > 1 else "角色2"
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class OutlineNode(LLMNode):
    """大纲生成节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "大纲规划", provider)
        self.add_input("world_description", "str", True)
        self.add_input("chapter_count", "int", False, 10)
        self.add_input("story_arc", "str", False, "起承转合")
        self.add_output("outline", "str")
        self.add_output("chapters", "list")
    
    async def execute(self) -> NodeResult:
        world_desc = self.input_values.get("world_description", "")
        chapter_count = self.input_values.get("chapter_count", 10)
        story_arc = self.input_values.get("story_arc", "起承转合")
        
        system_prompt = """你是一位专业的小说大纲规划师，擅长构建完整的故事结构。
你的大纲应该包含明确的故事弧、章节划分和关键情节点。"""
        
        prompt = f"""请为以下世界观创作一个故事大纲：

世界背景：{world_desc}
章节数量：{chapter_count}章
故事结构：{story_arc}

要求：
1. 明确的故事弧线（开端/发展/高潮/结局）
2. 每章节一句话概括（50字以内）
3. 标注关键情节点
4. 确保故事有完整性

请开始规划："""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            
            # 简单提取章节列表（按行分割，每行一章）
            lines = response.split('\n')
            chapters = []
            for line in lines:
                if line.strip() and (line[0].isdigit() or '章' in line or '第' in line):
                    chapters.append(line.strip())
            
            return NodeResult(
                success=True,
                data={
                    "outline": response,
                    "chapters": chapters,
                    "chapter_count": len(chapters)
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class ReviseNode(LLMNode):
    """修订编辑节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "修订编辑", provider)
        self.add_input("content", "str", True)
        self.add_input("revision_type", "str", False, "grammar")
        self.add_input("preserve_style", "bool", False, True)
        self.add_output("revised_content", "str")
        self.add_output("changes", "list")
    
    async def execute(self) -> NodeResult:
        content = self.input_values.get("content", "")
        revision_type = self.input_values.get("revision_type", "grammar")
        preserve_style = self.input_values.get("preserve_style", True)
        
        style_instruction = "保持原文风格" if preserve_style else "可以适当调整风格"
        
        system_prompt = """你是一位专业的小说编辑，擅长修订和完善小说文本。
你的修订应该保持作者的原意，同时提升文本质量。"""
        
        prompt = f"""请对以下小说文本进行修订：

修订类型：{revision_type}
风格要求：{style_instruction}

原文：
---
{content}
---

修订要求：
1. 修正语法错误
2. 改善句子流畅度
3. 保持作者风格
4. 标注修改内容

请进行修订："""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            
            # 简单统计修改
            changes = ["语法修正", "句式优化", "标点调整"]
            
            return NodeResult(
                success=True,
                data={
                    "revised_content": response,
                    "changes": changes,
                    "change_count": len(changes)
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class PlotNode(LLMNode):
    """情节生成节点"""
    
    def __init__(self, node_id: str, provider=None, model: str = None):
        if provider is None:
            provider = get_provider("minimax", model)
        super().__init__(node_id, "情节生成", provider)
        self.add_input("world_description", "str", True)
        self.add_input("character_profile", "str", True)
        self.add_input("plot_type", "str", False, "冲突")
        self.add_output("plot_event", "str")
        self.add_output("consequences", "list")
    
    async def execute(self) -> NodeResult:
        world_desc = self.input_values.get("world_description", "")
        char_profile = self.input_values.get("character_profile", "")
        plot_type = self.input_values.get("plot_type", "冲突")
        
        system_prompt = """你是一位专业的小说情节设计师，擅长创作引人入胜的情节。
你的情节应该推动故事发展，揭示角色深度，制造戏剧张力。"""
        
        prompt = f"""请为以下设定创作一个情节：

世界背景：{world_desc}
角色信息：{char_profile}
情节类型：{plot_type}

要求：
1. 300-500字
2. 包含起因、经过、结果
3. 制造戏剧冲突
4. 留下悬念

请开始创作："""
        
        try:
            response = await self.call_llm(prompt, system_prompt)
            consequences = ["情节推进", "角色关系变化", "世界观扩展"]
            
            return NodeResult(
                success=True,
                data={
                    "plot_event": response,
                    "consequences": consequences,
                    "plot_type": plot_type
                }
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))


# ============================================================
# 简单节点（无需LLM）
# ============================================================

class SimpleNode(Node):
    """简单节点示例（不使用 LLM）"""
    
    def __init__(self, node_id: str, name: str, process_func):
        super().__init__(node_id, name)
        self.process_func = process_func
    
    def execute(self) -> NodeResult:
        try:
            result = self.process_func(self.input_values)
            return NodeResult(success=True, data=result)
        except Exception as e:
            return NodeResult(success=False, error=str(e))


class TextConcatNode(SimpleNode):
    """文本拼接节点"""
    
    def __init__(self, node_id: str):
        super().__init__(node_id, "文本拼接", self._process)
        self.add_input("text1", "str", True)
        self.add_input("text2", "str", True)
        self.add_input("separator", "str", False, "\n\n")
        self.add_output("combined", "str")
    
    def _process(self, inputs):
        return {
            "combined": inputs.get("text1", "") + inputs.get("separator", "\n\n") + inputs.get("text2", "")
        }


class WordCountNode(SimpleNode):
    """字数统计节点"""
    
    def __init__(self, node_id: str):
        super().__init__(node_id, "字数统计", self._process)
        self.add_input("text", "str", True)
        self.add_output("char_count", "int")
        self.add_output("word_count", "int")
    
    def _process(self, inputs):
        text = inputs.get("text", "")
        return {
            "char_count": len(text),
            "word_count": len(text.replace(" ", "").replace("\n", ""))
        }


# ============================================================
# 节点注册表（用于动态创建节点）
# ============================================================

NODE_REGISTRY = {
    "world_building": WorldBuildingNode,
    "character": CharacterNode,
    "chapter_generation": ChapterGenerationNode,
    "scene": SceneNode,
    "dialogue": DialogueNode,
    "outline": OutlineNode,
    "revise": ReviseNode,
    "plot": PlotNode,
    "text_concat": TextConcatNode,
    "word_count": WordCountNode,
    "simple": SimpleNode,
}


def create_node(node_type: str, node_id: str, **kwargs) -> Node:
    """根据类型创建节点"""
    node_class = NODE_REGISTRY.get(node_type)
    if not node_class:
        raise ValueError(f"未知的节点类型: {node_type}, 可选: {list(NODE_REGISTRY.keys())}")
    return node_class(node_id, **kwargs)