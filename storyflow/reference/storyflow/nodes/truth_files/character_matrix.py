"""
CharacterMatrixNode - 角色交互矩阵节点

记录角色间的所有交互和信息流动：
- 相遇记录
- 信息边界
- 交互历史
"""

from typing import Any, Dict, List
from .base import TruthFileNode


class CharacterMatrixNode(TruthFileNode):
    """角色交互矩阵节点

    维护角色间所有交互的记录：
    1. interactions - 交互记录
    2. information_boundaries - 信息边界
    3. encounter_history - 相遇历史
    4. character_groups - 角色分组
    """

    def __init__(self, node_id: str = "character_matrix"):
        super().__init__(node_id, "角色交互矩阵", "character_matrix.md")

        # 添加输入
        self.add_input("character_a", "str", False, "")
        self.add_input("character_b", "str", False, "")
        self.add_input("interaction_type", "str", False, "")
        self.add_input("interaction_context", "str", False, "")
        self.add_input("interaction_significance", "str", False, "medium")
        self.add_input("info_known_by", "str", False, "")
        self.add_input("info_content", "str", False, "")
        self.add_input("info_source", "str", False, "")
        self.add_input("info_secret", "bool", False, False)
        self.add_input("encounter_chapter", "int", False, 1)
        self.add_input("encounter_location", "str", False, "")
        self.add_input("encounter_context", "str", False, "")
        self.add_input("group_name", "str", False, "")
        self.add_input("group_members", "str", False, "")
        self.add_input("group_type", "str", False, "")

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义"""
        return {
            "interactions": [
                {
                    "character_a": "",
                    "character_b": "",
                    "interaction_type": "",  # dialogue, conflict, collaboration, revelation, battle
                    "context": "",
                    "chapter": 1,
                    "scene": "",
                    "significance": "medium",  # low, medium, high, critical
                    "emotional_tone": "",  # positive, negative, neutral, mixed
                    "outcome": "",  # resolved, escalated, uncertain, changed
                    "impact_on_relationship": "",
                    "quotes": [],  # 重要对话记录
                    "notes": ""
                }
            ],
            "information_boundaries": [
                {
                    "information": "",
                    "known_by": [],  # 知道的人列表
                    "unknown_by": [],  # 不知道的人列表
                    "source": "",
                    "is_secret": False,
                    "chapter_revealed": 1,
                    "full_reveal_chapter": 0,
                    "partial_reveals": [
                        {
                            "chapter": 1,
                            "revealed_to": "",
                            "partial_info": ""
                        }
                    ]
                }
            ],
            "encounter_history": [
                {
                    "chapter": 1,
                    "location": "",
                    "context": "",
                    "characters_involved": [],
                    "interaction_type": "",  # first_meeting, reunion, planned, accidental
                    "significance": "medium",
                    "outcomes": []
                }
            ],
            "character_groups": [
                {
                    "group_name": "",
                    "type": "",  # party, faction, family, team, alliance
                    "members": [],
                    "leader": "",
                    "formation_chapter": 1,
                    "disband_chapter": 0,
                    "common_goal": "",
                    "internal_dynamics": "",  # cohesive, conflicted, forming, storming, norming, performing
                    "notes": ""
                }
            ],
            "interaction_matrix": {
                # 稀疏矩阵，只记录有交互的角色对
                # 格式: "charA_charB": { interaction_count, last_chapter, relationship_strength }
            },
            "metadata": {}
        }

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """转换输入数据为标准格式"""
        result = {}
        chapter_ref = data.get("chapter_ref", "")
        current_chapter = self._extract_chapter_number(chapter_ref) if chapter_ref else 1

        char_a = data.get("character_a", "")
        char_b = data.get("character_b", "")

        # 交互记录
        if char_a and char_b:
            interaction_type = data.get("interaction_type", "")
            context = data.get("interaction_context", "")

            if interaction_type or context:
                result["interactions"] = [{
                    "character_a": char_a,
                    "character_b": char_b,
                    "interaction_type": interaction_type,
                    "context": context,
                    "chapter": current_chapter,
                    "scene": chapter_ref,
                    "significance": data.get("interaction_significance", "medium"),
                    "emotional_tone": "",
                    "outcome": "",
                    "impact_on_relationship": "",
                    "quotes": [],
                    "notes": ""
                }]

        # 信息边界
        known_by = data.get("info_known_by", "")
        info_content = data.get("info_content", "")
        if known_by and info_content:
            result["information_boundaries"] = [{
                "information": info_content,
                "known_by": [known_by],
                "unknown_by": [],
                "source": data.get("info_source", ""),
                "is_secret": data.get("info_secret", False),
                "chapter_revealed": current_chapter,
                "full_reveal_chapter": 0,
                "partial_reveals": []
            }]

        # 相遇历史
        encounter_loc = data.get("encounter_location", "")
        encounter_ctx = data.get("encounter_context", "")
        if encounter_loc or encounter_ctx:
            chars_involved = [char_a, char_b] if char_a and char_b else []
            result["encounter_history"] = [{
                "chapter": data.get("encounter_chapter", current_chapter),
                "location": encounter_loc,
                "context": encounter_ctx,
                "characters_involved": chars_involved,
                "interaction_type": "accidental",
                "significance": "medium",
                "outcomes": []
            }]

        # 角色分组
        group_name = data.get("group_name", "")
        group_members = data.get("group_members", "")
        if group_name:
            members = [group_members] if group_members else []
            result["character_groups"] = [{
                "group_name": group_name,
                "type": data.get("group_type", ""),
                "members": members,
                "leader": "",
                "formation_chapter": current_chapter,
                "disband_chapter": 0,
                "common_goal": "",
                "internal_dynamics": "forming",
                "notes": ""
            }]

        return result

    def _extract_chapter_number(self, chapter_ref: str) -> int:
        """从章节引用中提取章节号"""
        try:
            import re
            match = re.search(r'(\d+)', chapter_ref)
            if match:
                return int(match.group(1))
        except:
            pass
        return 1

    def _validate_data(self, data: Dict[str, Any]) -> List[str]:
        """验证数据"""
        errors = []

        # 验证交互记录
        if "interactions" in data:
            valid_types = ["dialogue", "conflict", "collaboration", "revelation", "battle"]
            valid_significances = ["low", "medium", "high", "critical"]
            valid_tones = ["positive", "negative", "neutral", "mixed"]
            valid_outcomes = ["resolved", "escalated", "uncertain", "changed"]

            for interaction in data["interactions"]:
                char_a = interaction.get("character_a", "")
                char_b = interaction.get("character_b", "")

                if not char_a or not char_b:
                    errors.append("交互记录缺少角色名称")

                if char_a == char_b:
                    errors.append(f"交互记录中角色 A 和 B 相同: {char_a}")

                i_type = interaction.get("interaction_type", "")
                if i_type and i_type not in valid_types:
                    errors.append(f"交互 {char_a} -> {char_b} 的类型无效: {i_type}")

                significance = interaction.get("significance", "medium")
                if significance not in valid_significances:
                    errors.append(f"交互 {char_a} -> {char_b} 的重要性无效: {significance}")

                tone = interaction.get("emotional_tone", "")
                if tone and tone not in valid_tones:
                    errors.append(f"交互 {char_a} -> {char_b} 的情感基调无效: {tone}")

                outcome = interaction.get("outcome", "")
                if outcome and outcome not in valid_outcomes:
                    errors.append(f"交互 {char_a} -> {char_b} 的结果无效: {outcome}")

        # 验证信息边界
        if "information_boundaries" in data:
            for info in data["information_boundaries"]:
                known_by = info.get("known_by", [])
                if not isinstance(known_by, list) or len(known_by) == 0:
                    errors.append(f"信息边界 '{info.get('information', '')}' 缺少已知者")

                unknown_by = info.get("unknown_by", [])
                if not isinstance(unknown_by, list):
                    errors.append(f"信息边界 '{info.get('information', '')}' 的未知者应为列表")

                # 检查是否有人既在已知列表又在未知列表
                overlap = set(known_by) & set(unknown_by)
                if overlap:
                    errors.append(f"信息边界 '{info.get('information', '')}' 中有人既在已知列表又在未知列表: {overlap}")

        # 验证相遇历史
        if "encounter_history" in data:
            valid_types = ["first_meeting", "reunion", "planned", "accidental"]

            for encounter in data["encounter_history"]:
                chapter = encounter.get("chapter", 0)
                if chapter < 1:
                    errors.append("相遇历史的章节号无效")

                chars_involved = encounter.get("characters_involved", [])
                if not isinstance(chars_involved, list) or len(chars_involved) == 0:
                    errors.append(f"相遇历史（第 {chapter} 章）缺少参与角色")

                e_type = encounter.get("interaction_type", "")
                if e_type and e_type not in valid_types:
                    errors.append(f"相遇历史（第 {chapter} 章）的类型无效: {e_type}")

        # 验证角色分组
        if "character_groups" in data:
            valid_types = ["party", "faction", "family", "team", "alliance"]
            valid_dynamics = ["cohesive", "conflicted", "forming", "storming", "norming", "performing"]

            for group in data["character_groups"]:
                group_name = group.get("group_name", "")
                if not group_name:
                    errors.append("角色分组缺少名称")

                members = group.get("members", [])
                if not isinstance(members, list) or len(members) == 0:
                    errors.append(f"分组 '{group_name}' 缺少成员")

                g_type = group.get("type", "")
                if g_type and g_type not in valid_types:
                    errors.append(f"分组 '{group_name}' 的类型无效: {g_type}")

                dynamics = group.get("internal_dynamics", "")
                if dynamics and dynamics not in valid_dynamics:
                    errors.append(f"分组 '{group_name}' 的内部动态无效: {dynamics}")

                formation_chap = group.get("formation_chapter", 1)
                disband_chap = group.get("disband_chapter", 0)
                if disband_chap > 0 and disband_chap < formation_chap:
                    errors.append(f"分组 '{group_name}' 的解散章节 ({disband_chap}) 早于组建章节 ({formation_chap})")

        return errors
