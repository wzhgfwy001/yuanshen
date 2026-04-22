"""
CurrentStateNode - 世界状态节点

维护故事当前世界的快照：
- 角色位置
- 关系网络
- 已知信息
- 情感弧线
"""

from typing import Any, Dict, List
from .base import TruthFileNode


class CurrentStateNode(TruthFileNode):
    """世界状态节点

    跟踪故事当前世界的实时状态，包括：
    1. characters - 角色列表及其位置、状态
    2. relationships - 角色间关系网络
    3. known_info - 已知信息（秘密、真相等）
    4. world_state - 世界环境状态
    5. time_info - 时间信息
    """

    def __init__(self, node_id: str = "current_state"):
        super().__init__(node_id, "世界状态", "current_state.md")

        # 添加输入
        self.add_input("character_name", "str", False, "")
        self.add_input("character_location", "str", False, "")
        self.add_input("character_status", "str", False, "alive")
        self.add_input("relationship_from", "str", False, "")
        self.add_input("relationship_to", "str", False, "")
        self.add_input("relationship_type", "str", False, "")
        self.add_input("relationship_status", "str", False, "neutral")
        self.add_input("known_info", "str", False, "")
        self.add_input("info_knower", "str", False, "")
        self.add_input("info_source", "str", False, "")
        self.add_input("world_location", "str", False, "")
        self.add_input("world_condition", "str", False, "normal")
        self.add_input("current_chapter", "int", False, 1)
        self.add_input("current_scene", "str", False, "")
        self.add_input("time_of_day", "str", False, "")

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义"""
        return {
            "current_chapter": 1,
            "current_scene": "",
            "time_of_day": "",
            "characters": [
                {
                    "name": "",
                    "location": "",
                    "status": "alive",  # alive, dead, missing, injured
                    "last_seen_chapter": 1,
                    "last_seen_scene": ""
                }
            ],
            "relationships": [
                {
                    "from": "",
                    "to": "",
                    "type": "",  # friend, enemy, family, mentor, ally, rival
                    "status": "neutral",  # positive, neutral, negative
                    "intensity": 5,  # 1-10
                    "notes": "",
                    "last_updated_chapter": 1
                }
            ],
            "known_info": [
                {
                    "info": "",
                    "knower": "",  # 知道的人
                    "source": "",
                    "chapter_revealed": 1,
                    "is_secret": False
                }
            ],
            "world_state": [
                {
                    "location": "",
                    "condition": "normal",  # normal, danger, destroyed, mysterious
                    "notes": "",
                    "last_updated_chapter": 1
                }
            ],
            "metadata": {}
        }

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """转换输入数据为标准格式"""
        result = {}

        # 角色信息
        char_name = data.get("character_name", "")
        if char_name:
            result["characters"] = [{
                "name": char_name,
                "location": data.get("character_location", ""),
                "status": data.get("character_status", "alive"),
                "last_seen_chapter": data.get("current_chapter", 1),
                "last_seen_scene": data.get("current_scene", "")
            }]

        # 关系信息
        rel_from = data.get("relationship_from", "")
        rel_to = data.get("relationship_to", "")
        if rel_from and rel_to:
            result["relationships"] = [{
                "from": rel_from,
                "to": rel_to,
                "type": data.get("relationship_type", ""),
                "status": data.get("relationship_status", "neutral"),
                "intensity": 5,
                "notes": "",
                "last_updated_chapter": data.get("current_chapter", 1)
            }]

        # 已知信息
        known_info = data.get("known_info", "")
        if known_info:
            result["known_info"] = [{
                "info": known_info,
                "knower": data.get("info_knower", ""),
                "source": data.get("info_source", ""),
                "chapter_revealed": data.get("current_chapter", 1),
                "is_secret": False
            }]

        # 世界状态
        world_loc = data.get("world_location", "")
        if world_loc:
            result["world_state"] = [{
                "location": world_loc,
                "condition": data.get("world_condition", "normal"),
                "notes": "",
                "last_updated_chapter": data.get("current_chapter", 1)
            }]

        # 全局时间信息
        if data.get("current_chapter"):
            result["current_chapter"] = data["current_chapter"]
        if data.get("current_scene"):
            result["current_scene"] = data["current_scene"]
        if data.get("time_of_day"):
            result["time_of_day"] = data["time_of_day"]

        return result

    def _validate_data(self, data: Dict[str, Any]) -> List[str]:
        """验证数据"""
        errors = []

        # 验证角色状态
        if "characters" in data:
            for char in data["characters"]:
                if char.get("status") not in ["alive", "dead", "missing", "injured"]:
                    errors.append(f"角色 {char.get('name', '')} 的状态无效: {char.get('status')}")

        # 验证关系状态
        if "relationships" in data:
            for rel in data["relationships"]:
                intensity = rel.get("intensity", 5)
                if not isinstance(intensity, int) or intensity < 1 or intensity > 10:
                    errors.append(f"关系 {rel.get('from', '')} -> {rel.get('to', '')} 的强度无效: {intensity}")

                if rel.get("status") not in ["positive", "neutral", "negative"]:
                    errors.append(f"关系 {rel.get('from', '')} -> {rel.get('to', '')} 的状态无效: {rel.get('status')}")

        return errors
