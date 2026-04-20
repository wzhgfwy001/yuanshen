"""
真相文件节点基类 - TruthFileNode

所有真相文件节点的基类，提供通用功能：
- YAML 格式化输出
- 增量更新（追加/修改）
- 数据验证
- 文件持久化
"""

import os
import yaml
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from engine import Node, NodeResult


@dataclass
class TruthFileResult(NodeResult):
    """真相文件节点执行结果"""
    yaml_output: str = ""
    file_path: str = ""
    is_incremental: bool = False
    validation_errors: List[str] = field(default_factory=list)


class TruthFileNode(Node):
    """真相文件节点基类

    特性：
    1. 自动 YAML 序列化输出
    2. 支持增量更新（append/merge 模式）
    3. 内置数据验证
    4. 文件持久化
    """

    def __init__(
        self,
        node_id: str,
        name: str,
        truth_file_name: str,
        base_dir: str = "/workspace/projects/workspace/storyflow/truth_files"
    ):
        super().__init__(node_id, name)
        self.truth_file_name = truth_file_name
        self.base_dir = base_dir

        # 创建目录
        os.makedirs(base_dir, exist_ok=True)

        # 添加通用输入
        self.add_input("update_mode", "str", False, "append")  # overwrite, append, merge
        self.add_input("chapter_ref", "str", False, "")  # 关联章节

        # 添加通用输出
        self.add_output("yaml_output", "str")
        self.add_output("file_path", "str")
        self.add_output("record_count", "int")

    @property
    def file_path(self) -> str:
        """动态计算文件路径"""
        return os.path.join(self.base_dir, self.truth_file_name)

        # 更新模式：'overwrite' | 'append' | 'merge'
        self.update_mode = "append"

        # 添加通用输入
        self.add_input("update_mode", "str", False, "append")  # overwrite, append, merge
        self.add_input("chapter_ref", "str", False, "")  # 关联章节

        # 添加通用输出
        self.add_output("yaml_output", "str")
        self.add_output("file_path", "str")
        self.add_output("record_count", "int")

    def _get_schema(self) -> Dict[str, Any]:
        """获取数据结构定义（子类实现）"""
        raise NotImplementedError("子类必须实现 _get_schema 方法")

    def _validate_data(self, data: Dict[str, Any]) -> List[str]:
        """验证数据（子类实现）"""
        return []

    def _transform_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """数据转换（子类可选实现）"""
        return data

    def _load_existing_data(self) -> Optional[Dict[str, Any]]:
        """加载现有数据"""
        if not os.path.exists(self.file_path):
            return None

        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f) or {}
        except Exception as e:
            print(f"警告：加载现有数据失败: {e}")
            return None

    def _save_to_file(self, data: Dict[str, Any]) -> str:
        """保存数据到文件"""
        # 转换为 YAML
        yaml_output = yaml.dump(
            data,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            indent=2
        )

        # 写入文件
        with open(self.file_path, 'w', encoding='utf-8') as f:
            f.write(yaml_output)

        return yaml_output

    def _append_data(self, existing: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
        """追加数据模式"""
        # 处理现有键中的列表字段
        for key in existing.keys():
            if isinstance(existing[key], list) and key in new_data:
                if isinstance(new_data[key], list):
                    existing[key].extend(new_data[key])
                else:
                    existing[key].append(new_data[key])

        # 添加新键（如果新数据中有但现有数据中没有）
        for key in new_data.keys():
            if key not in existing:
                existing[key] = new_data[key]

        # 合并元数据
        if "metadata" in existing and "metadata" in new_data:
            existing["metadata"].update(new_data["metadata"])

        return existing

    def _merge_data(self, existing: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
        """合并数据模式（深度合并）"""
        result = existing.copy()

        for key, value in new_data.items():
            if key in result:
                if isinstance(result[key], dict) and isinstance(value, dict):
                    # 递归合并字典
                    result[key] = self._merge_data(result[key], value)
                elif isinstance(result[key], list) and isinstance(value, list):
                    # 对于列表，合并并去重
                    combined = result[key] + value
                    # 简单去重（基于字典的字符串表示）
                    seen = set()
                    unique_combined = []
                    for item in combined:
                        item_str = str(item)
                        if item_str not in seen:
                            seen.add(item_str)
                            unique_combined.append(item)
                    result[key] = unique_combined
                else:
                    # 直接替换非字典/列表类型的值
                    result[key] = value
            else:
                # 新增字段
                result[key] = value

        return result

    def _generate_metadata(self) -> Dict[str, Any]:
        """生成元数据"""
        return {
            "updated_at": datetime.now().isoformat(),
            "node_id": self.node_id,
            "chapter_ref": self.input_values.get("chapter_ref", "")
        }

    def _count_records(self, data: Dict[str, Any]) -> int:
        """统计记录数"""
        count = 0
        for value in data.values():
            if isinstance(value, list):
                count += len(value)
            elif isinstance(value, dict):
                count += self._count_records(value)
        return count

    def execute(self) -> NodeResult:
        """执行真相文件节点"""
        try:
            # 获取更新模式
            self.update_mode = self.input_values.get("update_mode", "append")

            # 构建新数据
            schema = self._get_schema()
            new_data = self._transform_data(self.input_values)

            # 验证数据
            validation_errors = self._validate_data(new_data)

            # 添加元数据
            if "metadata" not in new_data:
                new_data["metadata"] = self._generate_metadata()
            else:
                new_data["metadata"].update(self._generate_metadata())

            # 加载现有数据
            existing_data = self._load_existing_data()

            # 根据模式处理数据
            if self.update_mode == "overwrite" or existing_data is None:
                # 覆盖模式或首次创建
                final_data = new_data
                is_incremental = False
            elif self.update_mode == "append":
                # 追加模式
                final_data = self._append_data(existing_data, new_data)
                is_incremental = True
            elif self.update_mode == "merge":
                # 合并模式
                final_data = self._merge_data(existing_data, new_data)
                is_incremental = True
            else:
                raise ValueError(f"不支持的更新模式: {self.update_mode}")

            # 保存到文件
            yaml_output = self._save_to_file(final_data)

            # 统计记录数
            record_count = self._count_records(final_data)

            # 构建结果
            result = TruthFileResult(
                success=len(validation_errors) == 0,
                data=new_data,
                yaml_output=yaml_output,
                file_path=self.file_path,
                is_incremental=is_incremental,
                validation_errors=validation_errors
            )

            # 设置输出值
            self.output_values = {
                "yaml_output": yaml_output,
                "file_path": self.file_path,
                "record_count": record_count
            }

            return result

        except Exception as e:
            return TruthFileResult(
                success=False,
                error=str(e),
                validation_errors=[f"执行错误: {str(e)}"]
            )
