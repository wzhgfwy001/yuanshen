"""
PendingHooksNode - 未闭合伏笔节点

跟踪故事中所有未闭合的伏笔和悬念：
- 铺垫
- 对读者的承诺
- 未解决冲突
"""

from typing import Any, Dict, List
from .base import TruthFileNode


class PendingHooksNode(TruthFileNode):
    """未闭合伏笔节点

    维护所有未闭合的伏笔和悬念：
    1. hooks - 伏笔列表
    2. promises - 对读者的承诺
    3. conflicts - 未解决冲突
    4. mysteries - 未解之谜
    """

    def __init__(self, node_id: str = "pending_hooks"):
        super().__init__(node_id, "未闭合伏笔", "pending_hooks.md")

        # 添加输入
        self.add_input("hook_id", "str", False, "")
        self.add_input("hook_description", "str", False, "")
        self.add_input("hook_type", "str", False, "")
        self.add_input("hook_priority", "str", False, "medium")
        self.add_input("hook_estimated_resolution", "str", False, "")
        self.add_input("promise_id", "str", False, "")
        self.add_input("promise_description", "str", False, "")
        self.add_input("promise_to_who", "str", False, "")
        self.add_input("conflict_id", "str", False, "")
        self.add_input("conflict_parties", "str", False, "")
        self.add_input("conflict_type", "str", False, "")
        self.add_input("mystery_id", "str", False, "")
        self.add_input("mystery_question", "str", False, "")
        self.add_input("mystery_clues", "str", False, "")

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义"""
        return {
            "hooks": [
                {
                    "id": "",
                    "description": "",
                    "type": "",  # setup, foreshadowing, mystery, character_secret, world_building
                    "priority": "medium",  # low, medium, high, critical
                    "status": "open",  # open, in_progress, resolved, abandoned
                    "introduced_chapter": 1,
                    "introduced_scene": "",
                    "estimated_resolution": "",  # 章节号或描述
                    "actual_resolution": "",
                    "resolution_chapter": 0,
                    "notes": "",
                    "related_hooks": []
                }
            ],
            "promises": [
                {
                    "id": "",
                    "description": "",
                    "to_who": "",  # reader, character, audience
                    "type": "",  # emotional, plot, thematic, payoff
                    "status": "pending",  # pending, fulfilled, broken, delayed
                    "introduced_chapter": 1,
                    "estimated_fulfillment": "",
                    "actual_fulfillment": "",
                    "fulfillment_chapter": 0,
                    "impact": ""  # payoff 描述
                }
            ],
            "conflicts": [
                {
                    "id": "",
                    "parties": "",  # 涉及方
                    "type": "",  # internal, interpersonal, societal, environmental, supernatural
                    "nature": "",  # man_vs_man, man_vs_self, man_vs_society, man_vs_nature, man_vs_fate
                    "status": "active",  # active, escalating, de_escalating, resolved
                    "introduced_chapter": 1,
                    "resolution_chapter": 0,
                    "resolution_type": "",  # victory, defeat, compromise, tragedy
                    "notes": ""
                }
            ],
            "mysteries": [
                {
                    "id": "",
                    "question": "",
                    "clues": "",  # 线索列表
                    "suspects": [],  # 嫌疑人/可能答案
                    "status": "unsolved",  # unsolved, partially_solved, solved
                    "introduced_chapter": 1,
                    "solution_chapter": 0,
                    "solution": "",
                    "red_herrings": []
                }
            ],
            "metadata": {}
        }

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """转换输入数据为标准格式"""
        result = {}
        chapter_ref = data.get("chapter_ref", "")
        current_chapter = self._extract_chapter_number(chapter_ref) if chapter_ref else 1

        # 伏笔信息
        hook_id = data.get("hook_id", "")
        hook_desc = data.get("hook_description", "")
        if hook_id and hook_desc:
            result["hooks"] = [{
                "id": hook_id,
                "description": hook_desc,
                "type": data.get("hook_type", ""),
                "priority": data.get("hook_priority", "medium"),
                "status": "open",
                "introduced_chapter": current_chapter,
                "introduced_scene": data.get("chapter_ref", ""),
                "estimated_resolution": data.get("hook_estimated_resolution", ""),
                "actual_resolution": "",
                "resolution_chapter": 0,
                "notes": "",
                "related_hooks": []
            }]

        # 承诺信息
        promise_id = data.get("promise_id", "")
        promise_desc = data.get("promise_description", "")
        if promise_id and promise_desc:
            result["promises"] = [{
                "id": promise_id,
                "description": promise_desc,
                "to_who": data.get("promise_to_who", ""),
                "type": "",
                "status": "pending",
                "introduced_chapter": current_chapter,
                "estimated_fulfillment": "",
                "actual_fulfillment": "",
                "fulfillment_chapter": 0,
                "impact": ""
            }]

        # 冲突信息
        conflict_id = data.get("conflict_id", "")
        conflict_parties = data.get("conflict_parties", "")
        if conflict_id and conflict_parties:
            result["conflicts"] = [{
                "id": conflict_id,
                "parties": conflict_parties,
                "type": data.get("conflict_type", ""),
                "nature": "",
                "status": "active",
                "introduced_chapter": current_chapter,
                "resolution_chapter": 0,
                "resolution_type": "",
                "notes": ""
            }]

        # 谜团信息
        mystery_id = data.get("mystery_id", "")
        mystery_question = data.get("mystery_question", "")
        if mystery_id and mystery_question:
            result["mysteries"] = [{
                "id": mystery_id,
                "question": mystery_question,
                "clues": data.get("mystery_clues", ""),
                "suspects": [],
                "status": "unsolved",
                "introduced_chapter": current_chapter,
                "solution_chapter": 0,
                "solution": "",
                "red_herrings": []
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

        # 验证伏笔
        if "hooks" in data:
            valid_types = ["setup", "foreshadowing", "mystery", "character_secret", "world_building"]
            valid_priorities = ["low", "medium", "high", "critical"]
            valid_statuses = ["open", "in_progress", "resolved", "abandoned"]

            for hook in data["hooks"]:
                if hook.get("type") and hook.get("type") not in valid_types:
                    errors.append(f"伏笔 {hook.get('id', '')} 的类型无效: {hook.get('type')}")

                if hook.get("priority") not in valid_priorities:
                    errors.append(f"伏笔 {hook.get('id', '')} 的优先级无效: {hook.get('priority')}")

                if hook.get("status") not in valid_statuses:
                    errors.append(f"伏笔 {hook.get('id', '')} 的状态无效: {hook.get('status')}")

                intro_chap = hook.get("introduced_chapter", 1)
                res_chap = hook.get("resolution_chapter", 0)
                if res_chap > 0 and res_chap < intro_chap:
                    errors.append(f"伏笔 {hook.get('id', '')} 的解决章节 ({res_chap}) 早于引入章节 ({intro_chap})")

        # 验证承诺
        if "promises" in data:
            valid_statuses = ["pending", "fulfilled", "broken", "delayed"]

            for promise in data["promises"]:
                if promise.get("status") not in valid_statuses:
                    errors.append(f"承诺 {promise.get('id', '')} 的状态无效: {promise.get('status')}")

        # 验证冲突
        if "conflicts" in data:
            valid_types = ["internal", "interpersonal", "societal", "environmental", "supernatural"]
            valid_statuses = ["active", "escalating", "de_escalating", "resolved"]

            for conflict in data["conflicts"]:
                if conflict.get("type") and conflict.get("type") not in valid_types:
                    errors.append(f"冲突 {conflict.get('id', '')} 的类型无效: {conflict.get('type')}")

                if conflict.get("status") not in valid_statuses:
                    errors.append(f"冲突 {conflict.get('id', '')} 的状态无效: {conflict.get('status')}")

        # 验证谜团
        if "mysteries" in data:
            valid_statuses = ["unsolved", "partially_solved", "solved"]

            for mystery in data["mysteries"]:
                if mystery.get("status") not in valid_statuses:
                    errors.append(f"谜团 {mystery.get('id', '')} 的状态无效: {mystery.get('status')}")

                intro_chap = mystery.get("introduced_chapter", 1)
                sol_chap = mystery.get("solution_chapter", 0)
                if sol_chap > 0 and sol_chap < intro_chap:
                    errors.append(f"谜团 {mystery.get('id', '')} 的解决章节 ({sol_chap}) 早于引入章节 ({intro_chap})")

        return errors
