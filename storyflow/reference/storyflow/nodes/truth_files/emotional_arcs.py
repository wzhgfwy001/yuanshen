"""
EmotionalArcsNode - 情感弧线节点

追踪角色的情感变化和成长轨迹：
- 按角色追踪情绪变化
- 成长轨迹
- 情感里程碑
"""

from typing import Any, Dict, List
from .base import TruthFileNode


class EmotionalArcsNode(TruthFileNode):
    """情感弧线节点

    维护每个角色的情感发展轨迹：
    1. characters - 角色情感档案
    2. emotional_milestones - 情感里程碑
    3. relationship_emotions - 关系情感动态
    4. growth_trajectories - 成长轨迹
    """

    def __init__(self, node_id: str = "emotional_arcs"):
        super().__init__(node_id, "情感弧线", "emotional_arcs.md")

        # 添加输入
        self.add_input("character_name", "str", False, "")
        self.add_input("current_emotion", "str", False, "")
        self.add_input("emotion_cause", "str", False, "")
        self.add_input("emotion_intensity", "int", False, 5)
        self.add_input("emotion_duration", "str", False, "")
        self.add_input("emotion_type", "str", False, "reaction")
        self.add_input("milestone_type", "str", False, "")
        self.add_input("milestone_description", "str", False, "")
        self.add_input("growth_aspect", "str", False, "")
        self.add_input("growth_before", "str", False, "")
        self.add_input("growth_after", "str", False, "")
        self.add_input("relation_character", "str", False, "")
        self.add_input("relation_emotion", "str", False, "")
        self.add_input("relation_change", "str", False, "")

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义"""
        return {
            "characters": [
                {
                    "name": "",
                    "personality_traits": [],  # 基础性格特征
                    "core_motivations": [],  # 核心动机
                    "emotional_state": {
                        "current_emotion": "",
                        "intensity": 5,  # 1-10
                        "duration": "",
                        "stability": "stable"  # stable, fluctuating, unstable
                    },
                    "emotional_history": [
                        {
                            "emotion": "",
                            "cause": "",
                            "chapter": 1,
                            "intensity": 5,
                            "duration": "",
                            "type": "",  # reaction, internal_change, external_trigger
                            "impact": ""  # 对后续情节的影响
                        }
                    ],
                    "fears": [],
                    "desires": [],
                    "emotional_blockers": [],  # 情感障碍
                    "last_updated_chapter": 1
                }
            ],
            "emotional_milestones": [
                {
                    "character": "",
                    "type": "",  # breakthrough, breakdown, realization, acceptance, transformation
                    "description": "",
                    "chapter": 1,
                    "scene": "",
                    "emotional_before": "",
                    "emotional_after": "",
                    "impact_on_arc": "medium",  # low, medium, high, critical
                    "connection_to_plot": ""
                }
            ],
            "relationship_emotions": [
                {
                    "character": "",
                    "target_character": "",
                    "emotional_state": {
                        "current_emotion": "",
                        "intensity": 5,
                        "change_direction": "",  # improving, worsening, stable
                        "stability": "stable"
                    },
                    "emotional_history": [
                        {
                            "emotion": "",
                            "cause": "",
                            "chapter": 1,
                            "change": ""  # strengthened, weakened, shifted, conflicted
                        }
                    ],
                    "last_updated_chapter": 1
                }
            ],
            "growth_trajectories": [
                {
                    "character": "",
                    "aspect": "",  # confidence, trust, identity, purpose, morality
                    "starting_point": 0,  # -10 to +10
                    "current_point": 0,
                    "target_point": 0,
                    "key_transitions": [
                        {
                            "chapter": 1,
                            "before": 0,
                            "after": 0,
                            "trigger": "",
                            "significance": "medium"
                        }
                    ],
                    "is_on_track": True,
                    "deviations": []
                }
            ],
            "metadata": {}
        }

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """转换输入数据为标准格式"""
        result = {}
        chapter_ref = data.get("chapter_ref", "")
        current_chapter = self._extract_chapter_number(chapter_ref) if chapter_ref else 1

        char_name = data.get("character_name", "")

        # 角色情感历史
        if char_name:
            emotion = data.get("current_emotion", "")
            cause = data.get("emotion_cause", "")

            if emotion or cause:
                result["characters"] = [{
                    "name": char_name,
                    "personality_traits": [],
                    "core_motivations": [],
                    "emotional_state": {
                        "current_emotion": emotion,
                        "intensity": data.get("emotion_intensity", 5),
                        "duration": data.get("emotion_duration", ""),
                        "stability": "stable"
                    },
                    "emotional_history": [
                        {
                            "emotion": emotion,
                            "cause": cause,
                            "chapter": current_chapter,
                            "intensity": data.get("emotion_intensity", 5),
                            "duration": data.get("emotion_duration", ""),
                            "type": data.get("emotion_type", "reaction"),
                            "impact": ""
                        }
                    ],
                    "fears": [],
                    "desires": [],
                    "emotional_blockers": [],
                    "last_updated_chapter": current_chapter
                }]

        # 情感里程碑
        milestone_type = data.get("milestone_type", "")
        milestone_desc = data.get("milestone_description", "")
        if milestone_type and milestone_desc and char_name:
            result["emotional_milestones"] = [{
                "character": char_name,
                "type": milestone_type,
                "description": milestone_desc,
                "chapter": current_chapter,
                "scene": chapter_ref,
                "emotional_before": "",
                "emotional_after": "",
                "impact_on_arc": "medium",
                "connection_to_plot": ""
            }]

        # 成长轨迹
        growth_aspect = data.get("growth_aspect", "")
        growth_before = data.get("growth_before", "")
        growth_after = data.get("growth_after", "")
        if growth_aspect and char_name:
            result["growth_trajectories"] = [{
                "character": char_name,
                "aspect": growth_aspect,
                "starting_point": 0,
                "current_point": self._parse_growth_value(growth_after) if growth_after else 0,
                "target_point": 0,
                "key_transitions": [],
                "is_on_track": True,
                "deviations": []
            }]

        # 关系情感
        rel_char = data.get("relation_character", "")
        rel_emotion = data.get("relation_emotion", "")
        if rel_char and char_name and rel_emotion:
            result["relationship_emotions"] = [{
                "character": char_name,
                "target_character": rel_char,
                "emotional_state": {
                    "current_emotion": rel_emotion,
                    "intensity": 5,
                    "change_direction": data.get("relation_change", "stable"),
                    "stability": "stable"
                },
                "emotional_history": [
                    {
                        "emotion": rel_emotion,
                        "cause": "",
                        "chapter": current_chapter,
                        "change": data.get("relation_change", "")
                    }
                ],
                "last_updated_chapter": current_chapter
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

    def _parse_growth_value(self, value_str: str) -> int:
        """解析成长值"""
        try:
            if value_str in ["positive", "improved", "increased"]:
                return 5
            elif value_str in ["negative", "declined", "decreased"]:
                return -5
            else:
                return int(value_str)
        except:
            return 0

    def _validate_data(self, data: Dict[str, Any]) -> List[str]:
        """验证数据"""
        errors = []

        # 验证角色情感
        if "characters" in data:
            valid_stabilities = ["stable", "fluctuating", "unstable"]
            valid_types = ["reaction", "internal_change", "external_trigger"]

            for char in data["characters"]:
                name = char.get("name", "")
                if not name:
                    errors.append("角色情感记录缺少角色名称")

                emotional_state = char.get("emotional_state", {})
                intensity = emotional_state.get("intensity", 5)
                if not isinstance(intensity, int) or intensity < 1 or intensity > 10:
                    errors.append(f"角色 {name} 的情感强度无效: {intensity}")

                stability = emotional_state.get("stability", "stable")
                if stability not in valid_stabilities:
                    errors.append(f"角色 {name} 的情感稳定性无效: {stability}")

                for emotion_entry in char.get("emotional_history", []):
                    intensity = emotion_entry.get("intensity", 5)
                    if not isinstance(intensity, int) or intensity < 1 or intensity > 10:
                        errors.append(f"角色 {name} 的历史情感强度无效: {intensity}")

                    emotion_type = emotion_entry.get("type", "reaction")
                    if emotion_type not in valid_types:
                        errors.append(f"角色 {name} 的情感类型无效: {emotion_type}")

        # 验证情感里程碑
        if "emotional_milestones" in data:
            valid_types = ["breakthrough", "breakdown", "realization", "acceptance", "transformation"]
            valid_impacts = ["low", "medium", "high", "critical"]

            for milestone in data["emotional_milestones"]:
                char_name = milestone.get("character", "")
                if not char_name:
                    errors.append("情感里程碑缺少角色名称")

                m_type = milestone.get("type", "")
                if m_type not in valid_types:
                    errors.append(f"角色 {char_name} 的里程碑类型无效: {m_type}")

                impact = milestone.get("impact_on_arc", "medium")
                if impact not in valid_impacts:
                    errors.append(f"角色 {char_name} 的里程碑影响无效: {impact}")

        # 验证关系情感
        if "relationship_emotions" in data:
            valid_directions = ["improving", "worsening", "stable"]
            valid_changes = ["strengthened", "weakened", "shifted", "conflicted"]

            for rel in data["relationship_emotions"]:
                char = rel.get("character", "")
                target = rel.get("target_character", "")
                if not char or not target:
                    errors.append("关系情感记录缺少角色名称")

                emotional_state = rel.get("emotional_state", {})
                direction = emotional_state.get("change_direction", "stable")
                if direction not in valid_directions:
                    errors.append(f"关系 {char} -> {target} 的情感变化方向无效: {direction}")

                for history in rel.get("emotional_history", []):
                    change = history.get("change", "")
                    if change and change not in valid_changes:
                        errors.append(f"关系 {char} -> {target} 的情感变化类型无效: {change}")

        # 验证成长轨迹
        if "growth_trajectories" in data:
            valid_aspects = ["confidence", "trust", "identity", "purpose", "morality"]

            for growth in data["growth_trajectories"]:
                char = growth.get("character", "")
                aspect = growth.get("aspect", "")

                if not char:
                    errors.append("成长轨迹缺少角色名称")

                if aspect and aspect not in valid_aspects:
                    errors.append(f"角色 {char} 的成长方面无效: {aspect}")

                for point in [growth.get("starting_point", 0), growth.get("current_point", 0), growth.get("target_point", 0)]:
                    if not isinstance(point, int) or point < -10 or point > 10:
                        errors.append(f"角色 {char} 的成长值无效: {point}")

        return errors
