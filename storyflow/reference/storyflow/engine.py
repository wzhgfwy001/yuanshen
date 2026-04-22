"""
StoryFlow - 轻量级节点工作流引擎
"""

import asyncio
import json
import httpx
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class NodeInput:
    """节点输入定义"""
    name: str
    type: str = "str"
    required: bool = True
    default: Any = None


@dataclass
class NodeOutput:
    """节点输出定义"""
    name: str
    type: str = "str"


@dataclass
class NodeResult:
    """节点执行结果"""
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class Node:
    """节点基类"""

    def __init__(self, node_id: str, name: str):
        self.node_id = node_id
        self.name = name
        self.inputs: Dict[str, NodeInput] = {}
        self.outputs: Dict[str, NodeOutput] = {}
        self.input_values: Dict[str, Any] = {}

    def add_input(self, name: str, type: str = "str", required: bool = True, default: Any = None):
        """添加输入端口"""
        self.inputs[name] = NodeInput(name, type, required, default)

    def add_output(self, name: str, type: str = "str"):
        """添加输出端口"""
        self.outputs[name] = NodeOutput(name, type)

    def set_input(self, name: str, value: Any):
        """设置输入值"""
        if name in self.inputs:
            self.input_values[name] = value

    def validate_inputs(self) -> bool:
        """验证输入是否完整"""
        for name, input_def in self.inputs.items():
            if input_def.required and name not in self.input_values and input_def.default is None:
                return False
        return True

    def execute(self) -> NodeResult:
        """执行节点逻辑（子类实现）"""
        raise NotImplementedError("子类必须实现 execute 方法")


class LLMNode(Node):
    """基于 LLM 的节点基类"""

    def __init__(self, node_id: str, name: str, api_key: str, model: str):
        super().__init__(node_id, name)
        self.api_key = api_key
        self.model = model
        self.base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"

    async def call_llm(self, prompt: str, system_prompt: str = "") -> str:
        """调用通义千问 API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            raise Exception(f"LLM 调用失败: {str(e)}")


class Workflow:
    """工作流类"""

    def __init__(self, workflow_id: str, name: str):
        self.workflow_id = workflow_id
        self.name = name
        self.nodes: Dict[str, Node] = {}
        self.connections: List[Dict[str, str]] = []

    def add_node(self, node: Node):
        """添加节点"""
        self.nodes[node.node_id] = node

    def add_connection(self, source_node: str, source_output: str, target_node: str, target_input: str):
        """添加连接"""
        self.connections.append({
            "source_node": source_node,
            "source_output": source_output,
            "target_node": target_node,
            "target_input": target_input
        })

    def topological_sort(self) -> List[str]:
        """拓扑排序，确定执行顺序"""
        # 构建依赖图
        in_degree = {node_id: 0 for node_id in self.nodes}
        adj_list = {node_id: [] for node_id in self.nodes}

        for conn in self.connections:
            adj_list[conn["source_node"]].append(conn["target_node"])
            in_degree[conn["target_node"]] += 1

        # 拓扑排序
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            node_id = queue.pop(0)
            result.append(node_id)

            for neighbor in adj_list[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(self.nodes):
            raise ValueError("工作流存在循环依赖")

        return result

    def propagate_to_node(self, target_node_id: str):
        """传播数据到指定节点"""
        for conn in self.connections:
            if conn["target_node"] == target_node_id:
                source_node = self.nodes[conn["source_node"]]
                target_node = self.nodes[conn["target_node"]]

                # 只有当源节点已经执行且有 output_values 时才传播
                if hasattr(source_node, 'output_values') and conn["source_output"] in source_node.output_values:
                    target_node.set_input(
                        conn["target_input"],
                        source_node.output_values[conn["source_output"]]
                    )


class Engine:
    """工作流执行引擎"""

    def __init__(self, workflow: Workflow):
        self.workflow = workflow
        self.execution_log: List[Dict[str, Any]] = []

    async def execute(self) -> Dict[str, Any]:
        """执行工作流"""
        execution_order = self.workflow.topological_sort()

        results = {}

        for node_id in execution_order:
            node = self.workflow.nodes[node_id]

            # 在执行节点前，先传播前序节点的输出到当前节点的输入
            self.workflow.propagate_to_node(node_id)

            # 验证输入
            if not node.validate_inputs():
                error_msg = f"节点 {node.name} ({node_id}) 输入不完整"
                self.execution_log.append({
                    "node_id": node_id,
                    "status": "failed",
                    "error": error_msg
                })
                raise ValueError(error_msg)

            # 执行节点
            try:
                result = node.execute()
                # 如果 execute 返回的是协程，await 它
                if asyncio.iscoroutine(result):
                    result = await result
                node.output_values = result.data

                self.execution_log.append({
                    "node_id": node_id,
                    "status": "success" if result.success else "failed",
                    "error": result.error,
                    "outputs": result.data
                })

                if not result.success:
                    raise Exception(f"节点 {node.name} 执行失败: {result.error}")

                results[node_id] = result.data

            except Exception as e:
                self.execution_log.append({
                    "node_id": node_id,
                    "status": "error",
                    "error": str(e)
                })
                raise

        return {
            "success": True,
            "results": results,
            "log": self.execution_log
        }

    def get_execution_log(self) -> List[Dict[str, Any]]:
        """获取执行日志"""
        return self.execution_log
