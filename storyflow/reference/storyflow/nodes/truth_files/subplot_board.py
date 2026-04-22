"""
SubplotBoardNode - 支线进度板节点

跟踪所有支线的进度和状态：
- A/B/C 线状态
- 停滞检测
- 支线融合/分叉
"""

from typing import Any, Dict, List
from .base import TruthFileNode


class SubplotBoardNode(TruthFileNode):
    """支线进度板节点

    维护所有支线的进度追踪：
    1. subplots - 支线列表
    2. plot_connections - 支线间连接
    3. convergence_points - 融合点
    4. divergence_points - 分叉点
    5. stagnation_warnings - 停滞警告
    """

    def __init__(self, node_id: str = "subplot_board"):
        super().__init__(node_id, "支线进度板", "subplot_board.md")

        # 添加输入
        self.add_input("subplot_id", "str", False, "")
        self.add_input("subplot_name", "str", False, "")
        self.add_input("subplot_type", "str", False, "")
        self.add_input("subplot_status", "str", False, "active")
        self.add_input("subplot_progress", "int", False, 0)
        self.add_input("subplot_priority", "str", False, "medium")
        self.add_input("subplot_characters", "str", False, "")
        self.add_input("last_updated_chapter", "int", False, 1)
        self.add_input("connection_from", "str", False, "")
        self.add_input("connection_to", "str", False, "")
        self.add_input("connection_type", "str", False, "")
        self.add_input("convergence_chapter", "int", False, 0)
        self.add_input("divergence_chapter", "int", False, 0)

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义"""
        return {
            "subplots": [
                {
                    "id": "",
                    "name": "",
                    "type": "",  # main, supporting, background, arc
                    "status": "active",  # active, paused, completed, dropped, merged
                    "progress_percentage": 0,  # 0-100
                    "priority": "medium",  # low, medium, high, critical
                    "characters_involved": [],
                    "key_moments": [
                        {
                            "chapter": 1,
                            "event": "",
                            "significance": "medium"
                        }
                    ],
                    "goals": [],
                    "obstacles": [],
                    "introduced_chapter": 1,
                    "target_resolution_chapter": 0,
                    "actual_resolution_chapter": 0,
                    "last_updated_chapter": 1,
                    "chapters_since_update": 0,
                    "is_stagnant": False,
                    "notes": ""
                }
            ],
            "plot_connections": [
                {
                    "from_subplot": "",
                    "to_subplot": "",
                    "connection_type": "",  # parallel, intersecting, causal, thematic
                    "strength": 5,  # 1-10
                    "description": "",
                    "established_chapter": 1
                }
            ],
            "convergence_points": [
                {
                    "chapter": 0,
                    "subplots_involved": [],
                    "nature": "",  # major, minor, thematic
                    "outcome": ""
                }
            ],
            "divergence_points": [
                {
                    "chapter": 0,
                    "subplots_involved": [],
                    "nature": "",  # permanent, temporary, conditional
                    "trigger": ""
                }
            ],
            "stagnation_warnings": [
                {
                    "subplot_id": "",
                    "last_updated_chapter": 1,
                    "current_chapter": 1,
                    "chapters_inactive": 0,
                    "severity": "",  # low, medium, high, critical
                    "suggestion": ""
                }
            ],
            "metadata": {}
        }

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """转换输入数据为标准格式"""
        result = {}
        chapter_ref = data.get("chapter_ref", "")
        current_chapter = self._extract_chapter_number(chapter_ref) if chapter_ref else 1

        # 支线信息
        subplot_id = data.get("subplot_id", "")
        subplot_name = data.get("subplot_name", "")
        if subplot_id and subplot_name:
            characters = data.get("subplot_characters", "")
            char_list = [characters] if characters else []

            result["subplots"] = [{
                "id": subplot_id,
                "name": subplot_name,
                "type": data.get("subplot_type", ""),
                "status": data.get("subplot_status", "active"),
                "progress_percentage": data.get("subplot_progress", 0),
                "priority": data.get("subplot_priority", "medium"),
                "characters_involved": char_list,
                "key_moments": [],
                "goals": [],
                "obstacles": [],
                "introduced_chapter": current_chapter,
                "target_resolution_chapter": 0,
                "actual_resolution_chapter": 0,
                "last_updated_chapter": data.get("last_updated_chapter", current_chapter),
                "chapters_since_update": 0,
                "is_stagnant": False,
                "notes": ""
            }]

        # 支线连接
        conn_from = data.get("connection_from", "")
        conn_to = data.get("connection_to", "")
        if conn_from and conn_to:
            result["plot_connections"] = [{
                "from_subplot": conn_from,
                "to_subplot": conn_to,
                "connection_type": data.get("connection_type", ""),
                "strength": 5,
                "description": "",
                "established_chapter": current_chapter
            }]

        # 融合点
        conv_chapter = data.get("convergence_chapter", 0)
        if conv_chapter > 0:
            result["convergence_points"] = [{
                "chapter": conv_chapter,
                "subplots_involved": [],
                "nature": "major",
                "outcome": ""
            }]

        # 分叉点
        div_chapter = data.get("divergence_chapter", 0)
        if div_chapter > 0:
            result["divergence_points"] = [{
                "chapter": div_chapter,
                "subplots_involved": [],
                "nature": "permanent",
                "trigger": ""
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

        # 验证支线
        if "subplots" in data:
            valid_types = ["main", "supporting", "background", "arc"]
            valid_statuses = ["active", "paused", "completed", "dropped", "merged"]
            valid_priorities = ["low", "medium", "high", "critical"]

            for subplot in data["subplots"]:
                if subplot.get("type") and subplot.get("type") not in valid_types:
                    errors.append(f"支线 {subplot.get('id', '')} 的类型无效: {subplot.get('type')}")

                if subplot.get("status") not in valid_statuses:
                    errors.append(f"支线 {subplot.get('id', '')} 的状态无效: {subplot.get('status')}")

                if subplot.get("priority") not in valid_priorities:
                    errors.append(f"支线 {subplot.get('id', '')} 的优先级无效: {subplot.get('priority')}")

                progress = subplot.get("progress_percentage", 0)
                if not isinstance(progress, int) or progress < 0 or progress > 100:
                    errors.append(f"支线 {subplot.get('id', '')} 的进度百分比无效: {progress}")

                intro_chap = subplot.get("introduced_chapter", 1)
                target_chap = subplot.get("target_resolution_chapter", 0)
                actual_chap = subplot.get("actual_resolution_chapter", 0)

                if target_chap > 0 and target_chap < intro_chap:
                    errors.append(f"支线 {subplot.get('id', '')} 的目标解决章节 ({target_chap}) 早于引入章节 ({intro_chap})")

                if actual_chap > 0 and actual_chap < intro_chap:
                    errors.append(f"支线 {subplot.get('id', '')} 的实际解决章节 ({actual_chap}) 早于引入章节 ({intro_chap})")

        # 验证支线连接
        if "plot_connections" in data:
            valid_types = ["parallel", "intersecting", "causal", "thematic"]

            for conn in data["plot_connections"]:
                if conn.get("connection_type") and conn.get("connection_type") not in valid_types:
                    errors.append(f"连接 {conn.get('from_subplot', '')} -> {conn.get('to_subplot', '')} 的类型无效: {conn.get('connection_type')}")

                strength = conn.get("strength", 5)
                if not isinstance(strength, int) or strength < 1 or strength > 10:
                    errors.append(f"连接 {conn.get('from_subplot', '')} -> {conn.get('to_subplot', '')} 的强度无效: {strength}")

        # 验证融合点
        if "convergence_points" in data:
            for point in data["convergence_points"]:
                chapter = point.get("chapter", 0)
                if chapter < 1:
                    errors.append(f"融合点的章节号无效: {chapter}")

        # 验证分叉点
        if "divergence_points" in data:
            for point in data["divergence_points"]:
                chapter = point.get("chapter", 0)
                if chapter < 1:
                    errors.append(f"分叉点的章节号无效: {chapter}")

        return errors
