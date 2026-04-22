"""
ParticleLedgerNode - 资源账本节点

跟踪故事中的所有资源和物品：
- 物品
- 金钱
- 物资数量及衰减追踪
"""

from typing import Any, Dict, List
from .base import TruthFileNode


class ParticleLedgerNode(TruthFileNode):
    """资源账本节点

    维护故事中所有资源的追踪：
    1. items - 物品列表
    2. currency - 货币/金钱
    3. supplies - 消耗性物资
    4. decay_tracking - 衰减追踪
    """

    def __init__(self, node_id: str = "particle_ledger"):
        super().__init__(node_id, "资源账本", "particle_ledger.md")

        # 添加输入
        self.add_input("item_name", "str", False, "")
        self.add_input("item_owner", "str", False, "")
        self.add_input("item_type", "str", False, "")
        self.add_input("item_quantity", "int", False, 1)
        self.add_input("item_location", "str", False, "")
        self.add_input("item_status", "str", False, "active")
        self.add_input("currency_name", "str", False, "")
        self.add_input("currency_owner", "str", False, "")
        self.add_input("currency_amount", "int", False, 0)
        self.add_input("supply_name", "str", False, "")
        self.add_input("supply_quantity", "int", False, 0)
        self.add_input("supply_max_quantity", "int", False, 100)
        self.add_input("decay_item", "str", False, "")
        self.add_input("decay_rate", "float", False, 0.0)
        self.add_input("decay_start_chapter", "int", False, 1)
        self.add_input("decay_duration_chapters", "int", False, 0)

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义"""
        return {
            "items": [
                {
                    "name": "",
                    "owner": "",
                    "type": "",  # weapon, tool, artifact, key_item, consumable
                    "quantity": 1,
                    "location": "",
                    "status": "active",  # active, lost, destroyed, used
                    "description": "",
                    "acquired_chapter": 1,
                    "last_updated_chapter": 1
                }
            ],
            "currency": [
                {
                    "name": "",  # gold, silver, credits, etc.
                    "owner": "",
                    "amount": 0,
                    "last_updated_chapter": 1
                }
            ],
            "supplies": [
                {
                    "name": "",  # food, water, medicine, fuel, etc.
                    "quantity": 0,
                    "max_quantity": 100,
                    "unit": "",
                    "decay_rate": 0.0,  # 每章衰减量
                    "last_replenished_chapter": 1,
                    "last_updated_chapter": 1
                }
            ],
            "decay_tracking": [
                {
                    "item": "",
                    "decay_rate": 0.0,  # 每章衰减百分比
                    "start_chapter": 1,
                    "duration_chapters": 0,  # 0 表示不衰减
                    "current_quality": 100.0,
                    "last_updated_chapter": 1
                }
            ],
            "metadata": {}
        }

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """转换输入数据为标准格式"""
        result = {}
        chapter_ref = data.get("chapter_ref", "")
        current_chapter = self._extract_chapter_number(chapter_ref) if chapter_ref else 1

        # 物品信息
        item_name = data.get("item_name", "")
        if item_name:
            result["items"] = [{
                "name": item_name,
                "owner": data.get("item_owner", ""),
                "type": data.get("item_type", ""),
                "quantity": data.get("item_quantity", 1),
                "location": data.get("item_location", ""),
                "status": data.get("item_status", "active"),
                "description": "",
                "acquired_chapter": current_chapter,
                "last_updated_chapter": current_chapter
            }]

        # 货币信息
        currency_name = data.get("currency_name", "")
        currency_owner = data.get("currency_owner", "")
        if currency_name and currency_owner:
            result["currency"] = [{
                "name": currency_name,
                "owner": currency_owner,
                "amount": data.get("currency_amount", 0),
                "last_updated_chapter": current_chapter
            }]

        # 物资信息
        supply_name = data.get("supply_name", "")
        if supply_name:
            result["supplies"] = [{
                "name": supply_name,
                "quantity": data.get("supply_quantity", 0),
                "max_quantity": data.get("supply_max_quantity", 100),
                "unit": "",
                "decay_rate": 0.0,
                "last_replenished_chapter": current_chapter,
                "last_updated_chapter": current_chapter
            }]

        # 衰减追踪
        decay_item = data.get("decay_item", "")
        if decay_item:
            result["decay_tracking"] = [{
                "item": decay_item,
                "decay_rate": data.get("decay_rate", 0.0),
                "start_chapter": data.get("decay_start_chapter", current_chapter),
                "duration_chapters": data.get("decay_duration_chapters", 0),
                "current_quality": 100.0,
                "last_updated_chapter": current_chapter
            }]

        return result

    def _extract_chapter_number(self, chapter_ref: str) -> int:
        """从章节引用中提取章节号"""
        try:
            # 尝试从字符串中提取数字
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

        # 验证物品数量
        if "items" in data:
            for item in data["items"]:
                quantity = item.get("quantity", 1)
                if not isinstance(quantity, int) or quantity < 0:
                    errors.append(f"物品 {item.get('name', '')} 的数量无效: {quantity}")

                if item.get("status") not in ["active", "lost", "destroyed", "used"]:
                    errors.append(f"物品 {item.get('name', '')} 的状态无效: {item.get('status')}")

        # 验证货币金额
        if "currency" in data:
            for curr in data["currency"]:
                amount = curr.get("amount", 0)
                if not isinstance(amount, (int, float)) or amount < 0:
                    errors.append(f"货币 {curr.get('name', '')} 的金额无效: {amount}")

        # 验证物资数量
        if "supplies" in data:
            for supply in data["supplies"]:
                quantity = supply.get("quantity", 0)
                max_quantity = supply.get("max_quantity", 100)

                if not isinstance(quantity, int) or quantity < 0:
                    errors.append(f"物资 {supply.get('name', '')} 的数量无效: {quantity}")

                if not isinstance(max_quantity, int) or max_quantity < 0:
                    errors.append(f"物资 {supply.get('name', '')} 的最大数量无效: {max_quantity}")

                if quantity > max_quantity:
                    errors.append(f"物资 {supply.get('name', '')} 的数量 ({quantity}) 超过最大值 ({max_quantity})")

        # 验证衰减追踪
        if "decay_tracking" in data:
            for decay in data["decay_tracking"]:
                decay_rate = decay.get("decay_rate", 0.0)
                if not isinstance(decay_rate, (int, float)) or decay_rate < 0 or decay_rate > 100:
                    errors.append(f"物品 {decay.get('item', '')} 的衰减率无效: {decay_rate}")

                duration = decay.get("duration_chapters", 0)
                if not isinstance(duration, int) or duration < 0:
                    errors.append(f"物品 {decay.get('item', '')} 的衰减时长无效: {duration}")

        return errors
