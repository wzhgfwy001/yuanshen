"""
示例节点类 - 世界观、角色、章节生成
"""

import asyncio
from engine import Node, LLMNode, NodeResult


class WorldBuildingNode(LLMNode):
    """世界观生成节点"""

    def __init__(self, node_id: str, api_key: str, model: str):
        super().__init__(node_id, "世界观生成", api_key, model)
        self.add_input("genre", "str", True, "奇幻")
        self.add_input("theme", "str", True, "魔法与冒险")
        self.add_output("world_description", "str")
        self.add_output("magic_system", "str")

    async def execute(self) -> NodeResult:
        """生成世界观"""
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

            # 简单解析响应，提取关键信息
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

    def __init__(self, node_id: str, api_key: str, model: str):
        super().__init__(node_id, "角色生成", api_key, model)
        self.add_input("world_description", "str", True)
        self.add_input("character_type", "str", True, "主角")
        self.add_input("magic_system", "str", False)
        self.add_output("character_profile", "str")
        self.add_output("character_motivation", "str")

    async def execute(self) -> NodeResult:
        """生成角色"""
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

            # 解析角色信息
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

    def __init__(self, node_id: str, api_key: str, model: str):
        super().__init__(node_id, "章节生成", api_key, model)
        self.add_input("world_description", "str", True)
        self.add_input("character_profile", "str", True)
        self.add_input("chapter_number", "int", True, 1)
        self.add_input("chapter_title", "str", False, "第一章")
        self.add_output("chapter_content", "str")
        self.add_output("word_count", "int")

    async def execute(self) -> NodeResult:
        """生成章节内容"""
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

            # 提取标题（如果 LLM 返回了标题）
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


class SimpleNode(Node):
    """简单节点示例（不使用 LLM）"""

    def __init__(self, node_id: str, name: str, process_func):
        super().__init__(node_id, name)
        self.process_func = process_func

    def execute(self) -> NodeResult:
        """执行简单处理函数"""
        try:
            result = self.process_func(self.input_values)
            return NodeResult(success=True, data=result)
        except Exception as e:
            return NodeResult(success=False, error=str(e))
