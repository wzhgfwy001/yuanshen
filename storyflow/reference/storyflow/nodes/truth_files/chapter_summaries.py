"""
ChapterSummariesNode - 各章摘要节点

记录每一章的摘要和关键信息：
- 出场人物
- 关键事件
- 状态变化
- 伏笔动态
"""

from typing import Any, Dict, List
from .base import TruthFileNode


class ChapterSummariesNode(TruthFileNode):
    """各章摘要节点

    维护每一章的详细摘要：
    1. chapter_number - 章节号
    2. title - 章节标题
    3. characters_present - 出场人物
    4. key_events - 关键事件
    5. plot_advancements - 情节进展
    6. character_developments - 角色发展
    7. hook_updates - 伏笔更新
    8. world_changes - 世界变化
    9. emotional_beats - 情节情感节拍
    10. conflicts - 冲突动态
    """

    def __init__(self, node_id: str = "chapter_summaries"):
        super().__init__(node_id, "各章摘要", "chapter_summaries.md")

        # 添加输入
        self.add_input("chapter_number", "int", False, 1)
        self.add_input("chapter_title", "str", False, "")
        self.add_input("character_present", "str", False, "")
        self.add_input("key_event", "str", False, "")
        self.add_input("plot_advancement", "str", False, "")
        self.add_input("character_development", "str", False, "")
        self.add_input("hook_update", "str", False, "")
        self.add_input("world_change", "str", False, "")
        self.add_input("emotional_beat", "str", False, "")
        self.add_input("conflict_update", "str", False, "")
        self.add_input("word_count", "int", False, 0)

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义"""
        return {
            "chapters": [
                {
                    "chapter_number": 1,
                    "title": "",
                    "word_count": 0,
                    "characters_present": [],  # 出场人物列表
                    "locations_visited": [],  # 访问的地点
                    "key_events": [
                        {
                            "event": "",
                            "timestamp": "",  # 章节中的时间点
                            "impact": "",  # short, medium, long
                            "importance": "medium"  # low, medium, high, critical
                        }
                    ],
                    "plot_advancements": [
                        {
                            "aspect": "",  # main_plot, subplot_a, subplot_b, etc.
                            "description": "",
                            "progress_percentage": 0  # 0-100
                        }
                    ],
                    "character_developments": [
                        {
                            "character": "",
                            "type": "",  # growth, revelation, relationship, internal_change
                            "description": "",
                            "impact_on_future": ""
                        }
                    ],
                    "hook_updates": [
                        {
                            "hook_id": "",
                            "action": "",  # introduced, advanced, resolved, hinted
                            "description": ""
                        }
                    ],
                    "world_changes": [
                        {
                            "aspect": "",  # geography, politics, magic, culture, etc.
                            "before": "",
                            "after": "",
                            "impact": ""
                        }
                    ],
                    "emotional_beats": [
                        {
                            "character": "",
                            "emotion": "",
                            "trigger": "",
                            "intensity": 5  # 1-10
                        }
                    ],
                    "conflicts": [
                        {
                            "conflict_id": "",
                            "status_change": "",  # escalated, de_escalated, resolved, introduced
                            "description": ""
                        }
                    ],
                    "notes": "",
                    "created_at": ""
                }
            ],
            "metadata": {}
        }

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """转换输入数据为标准格式"""
        result = {}
        chapter_num = data.get("chapter_number", 1)

        chapter_data = {
            "chapter_number": chapter_num,
            "title": data.get("chapter_title", ""),
            "word_count": data.get("word_count", 0),
            "characters_present": [],
            "locations_visited": [],
            "key_events": [],
            "plot_advancements": [],
            "character_developments": [],
            "hook_updates": [],
            "world_changes": [],
            "emotional_beats": [],
            "conflicts": [],
            "notes": "",
            "created_at": ""
        }

        # 出场人物
        char_present = data.get("character_present", "")
        if char_present:
            chapter_data["characters_present"] = [char_present]

        # 关键事件
        key_event = data.get("key_event", "")
        if key_event:
            chapter_data["key_events"] = [{
                "event": key_event,
                "timestamp": "",
                "impact": "medium",
                "importance": "medium"
            }]

        # 情节进展
        plot_adv = data.get("plot_advancement", "")
        if plot_adv:
            chapter_data["plot_advancements"] = [{
                "aspect": "main_plot",
                "description": plot_adv,
                "progress_percentage": 0
            }]

        # 角色发展
        char_dev = data.get("character_development", "")
        if char_dev:
            chapter_data["character_developments"] = [{
                "character": data.get("character_present", ""),
                "type": "growth",
                "description": char_dev,
                "impact_on_future": ""
            }]

        # 伏笔更新
        hook_upd = data.get("hook_update", "")
        if hook_upd:
            chapter_data["hook_updates"] = [{
                "hook_id": "",
                "action": "advanced",
                "description": hook_upd
            }]

        # 世界变化
        world_chg = data.get("world_change", "")
        if world_chg:
            chapter_data["world_changes"] = [{
                "aspect": "",
                "before": "",
                "after": world_chg,
                "impact": ""
            }]

        # 情感节拍
        emo_beat = data.get("emotional_beat", "")
        if emo_beat:
            chapter_data["emotional_beats"] = [{
                "character": data.get("character_present", ""),
                "emotion": emo_beat,
                "trigger": "",
                "intensity": 5
            }]

        # 冲突更新
        conflict_upd = data.get("conflict_update", "")
        if conflict_upd:
            chapter_data["conflicts"] = [{
                "conflict_id": "",
                "status_change": "escalated",
                "description": conflict_upd
            }]

        result["chapters"] = [chapter_data]

        return result

    def _validate_data(self, data: Dict[str, Any]) -> List[str]:
        """验证数据"""
        errors = []

        # 验证章节列表
        if "chapters" in data:
            valid_importances = ["low", "medium", "high", "critical"]
            valid_impacts = ["short", "medium", "long"]
            valid_actions = ["introduced", "advanced", "resolved", "hinted"]
            valid_status_changes = ["escalated", "de_escalated", "resolved", "introduced"]

            for chapter in data["chapters"]:
                chapter_num = chapter.get("chapter_number", 0)
                if chapter_num < 1:
                    errors.append(f"章节号无效: {chapter_num}")

                # 验证事件重要性
                for event in chapter.get("key_events", []):
                    importance = event.get("importance", "medium")
                    if importance not in valid_importances:
                        errors.append(f"章节 {chapter_num} 事件的重要性无效: {importance}")

                    impact = event.get("impact", "medium")
                    if impact not in valid_impacts:
                        errors.append(f"章节 {chapter_num} 事件的影响范围无效: {impact}")

                # 验证情节进展百分比
                for plot in chapter.get("plot_advancements", []):
                    progress = plot.get("progress_percentage", 0)
                    if not isinstance(progress, int) or progress < 0 or progress > 100:
                        errors.append(f"章节 {chapter_num} 情节进展百分比无效: {progress}")

                # 验证情感强度
                for beat in chapter.get("emotional_beats", []):
                    intensity = beat.get("intensity", 5)
                    if not isinstance(intensity, int) or intensity < 1 or intensity > 10:
                        errors.append(f"章节 {chapter_num} 情感强度无效: {intensity}")

                # 验证伏笔更新动作
                for hook in chapter.get("hook_updates", []):
                    action = hook.get("action", "")
                    if action not in valid_actions:
                        errors.append(f"章节 {chapter_num} 伏笔更新动作无效: {action}")

                # 验证冲突状态变化
                for conflict in chapter.get("conflicts", []):
                    status_change = conflict.get("status_change", "")
                    if status_change not in valid_status_changes:
                        errors.append(f"章节 {chapter_num} 冲突状态变化无效: {status_change}")

        return errors
