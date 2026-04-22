"""
StoryFlow - 轻量级节点工作流引擎
增强版 v1.1.0
- 环境变量 API Key 支持
- 多模型提供商支持
- 断点续传/缓存机制
"""

import json
import os
import asyncio
import hashlib
import httpx
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from abc import ABC, abstractmethod


# ============================================================
# 数据结构
# ============================================================

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


@dataclass
class Checkpoint:
    """断点保存数据"""
    workflow_id: str
    step: int
    completed_nodes: Dict[str, Dict[str, Any]]
    timestamp: str
    version: str = "1.1.0"


# ============================================================
# 模型提供商配置
# ============================================================

class ModelProvider(ABC):
    """模型提供商抽象基类"""
    
    @abstractmethod
    async def call(self, prompt: str, system_prompt: str = "") -> str:
        """调用模型"""
        pass


class TongyiProvider(ModelProvider):
    """通义千问提供商"""
    
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    
    async def call(self, prompt: str, system_prompt: str = "") -> str:
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
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            raise Exception(f"通义千问 API 调用失败: {str(e)}")


class MiniMaxProvider(ModelProvider):
    """MiniMax 提供商"""
    
    # 允许的重定向白名单（仅MiniMax官方域名）
    ALLOWED_REDIRECT_HOSTS = {"api.minimax.chat", "api.minimax.io"}
    
    def __init__(self, api_key: str, model: str = "MiniMax-M2.7", timeout: float = 120.0):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.minimax.chat/v1"
        self.max_retries = 3
        self.timeout = timeout  # 可配置超时
        self.max_wait = 30.0  # 最大等待时间（秒）
        self._client = None  # 连接池复用
    
    async def _get_client(self) -> httpx.AsyncClient:
        """获取或创建复用client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=False  # 禁用自动重定向，由应用逻辑控制
            )
        return self._client
    
    async def close(self):
        """关闭client连接"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
    
    def _validate_response(self, result: dict) -> str:
        """验证并提取响应内容"""
        # 检查choices字段
        if "choices" not in result:
            raise ValueError("API响应缺少choices字段")
        if not isinstance(result["choices"], list) or len(result["choices"]) == 0:
            raise ValueError("API响应choices为空或格式错误")
        
        choice = result["choices"][0]
        # 检查message字段
        if "message" not in choice:
            raise ValueError("API响应choices[0]缺少message字段")
        
        message = choice["message"]
        # 检查content字段
        if "content" not in message:
            raise ValueError("API响应message缺少content字段")
        
        content = message["content"]
        if not content or not isinstance(content, str):
            raise ValueError("API响应content为空或格式错误")
        
        return content
    
    async def call(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model,
            "messages": messages
        }
        
        last_error = None
        for attempt in range(self.max_retries):
            try:
                client = await self._get_client()
                response = await client.post(
                    f"{self.base_url}/text/chatcompletion_v2",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                return self._validate_response(result)
            except httpx.TimeoutException as e:
                last_error = f"请求超时: {str(e)}"
            except httpx.HTTPStatusError as e:
                last_error = f"HTTP错误 {e.response.status_code}: {str(e)}"
            except ValueError as e:
                last_error = f"响应解析失败: {str(e)}"
            except Exception as e:
                last_error = str(e)
            
            if attempt < self.max_retries - 1:
                # 指数退避 + jitter，避免多实例同时重试
                import random
                wait_time = min(self.max_wait, 2 ** (attempt + 1))
                jitter = random.uniform(0, 0.5)
                await asyncio.sleep(wait_time + jitter)
        
        raise Exception(f"MiniMax API 调用失败（已重试{self.max_retries}次）: {last_error}")


class ClaudeProvider(ModelProvider):
    """Claude (Anthropic) 提供商"""
    
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.anthropic.com/v1"
    
    async def call(self, prompt: str, system_prompt: str = "") -> str:
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "user", "content": f"System: {system_prompt}\n\nUser: {prompt}"})
        else:
            messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": messages
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                return result["content"][0]["text"]
        except Exception as e:
            raise Exception(f"Claude API 调用失败: {str(e)}")


class ProviderFactory:
    """模型提供商工厂"""
    
    _providers = {
        "tongyi": TongyiProvider,
        "qwen": TongyiProvider,  # alias
        "minimax": MiniMaxProvider,
        "claude": ClaudeProvider,
    }
    
    @classmethod
    def create(cls, provider_name: str, api_key: str, model: str = None) -> ModelProvider:
        """创建模型提供商"""
        provider_class = cls._providers.get(provider_name.lower())
        if not provider_class:
            raise ValueError(f"不支持的提供商: {provider_name}, 可选: {list(cls._providers.keys())}")
        
        # 根据提供商设置默认模型
        if model is None:
            defaults = {
                "tongyi": "qwen-turbo",
                "qwen": "qwen-turbo",
                "minimax": "MiniMax-M2.7",
                "claude": "claude-sonnet-4-20250514"
            }
            model = defaults.get(provider_name.lower(), "default")
        
        return provider_class(api_key, model)


# ============================================================
# 缓存机制
# ============================================================

class CacheManager:
    """结果缓存管理器"""
    
    def __init__(self, cache_dir: str = ".storyflow_cache"):
        self.cache_dir = cache_dir
        self._ensure_cache_dir()
    
    def _ensure_cache_dir(self):
        """确保缓存目录存在"""
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
    
    def _make_cache_key(self, workflow_id: str, node_id: str, model: str, inputs: Dict[str, Any]) -> str:
        """生成缓存键"""
        content = f"{workflow_id}:{node_id}:{model}:{json.dumps(inputs, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def get(self, workflow_id: str, node_id: str, model: str, inputs: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """获取缓存结果"""
        cache_key = self._make_cache_key(workflow_id, node_id, model, inputs)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                return None
        return None
    
    def set(self, workflow_id: str, node_id: str, model: str, inputs: Dict[str, Any], outputs: Dict[str, Any]):
        """保存缓存结果"""
        cache_key = self._make_cache_key(workflow_id, node_id, model, inputs)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(outputs, f, ensure_ascii=False, indent=2)
        except Exception:
            pass  # 缓存失败不影响主流程
    
    def clear(self, node_id: str = None):
        """清除缓存"""
        if node_id:
            # 清除特定节点的缓存
            prefix = hashlib.sha256(node_id.encode()).hexdigest()[:16]
            for filename in os.listdir(self.cache_dir):
                if filename.startswith(prefix):
                    os.remove(os.path.join(self.cache_dir, filename))
        else:
            # 清除所有缓存
            for filename in os.listdir(self.cache_dir):
                filepath = os.path.join(self.cache_dir, filename)
                if os.path.isfile(filepath):
                    os.remove(filepath)


# ============================================================
# 断点管理器
# ============================================================

class CheckpointManager:
    """断点续传管理器"""
    
    def __init__(self, checkpoint_dir: str = ".storyflow_checkpoints"):
        self.checkpoint_dir = checkpoint_dir
        self._ensure_dir()
    
    def _ensure_dir(self):
        """确保目录存在"""
        if not os.path.exists(self.checkpoint_dir):
            os.makedirs(self.checkpoint_dir)
    
    def save(self, checkpoint: Checkpoint):
        """保存断点"""
        checkpoint_file = os.path.join(
            self.checkpoint_dir, 
            f"{checkpoint.workflow_id}_checkpoint.json"
        )
        try:
            with open(checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "workflow_id": checkpoint.workflow_id,
                    "step": checkpoint.step,
                    "completed_nodes": checkpoint.completed_nodes,
                    "timestamp": checkpoint.timestamp,
                    "version": checkpoint.version
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[WARN]️ 断点保存失败: {e}")
    
    def load(self, workflow_id: str) -> Optional[Checkpoint]:
        """加载断点"""
        checkpoint_file = os.path.join(
            self.checkpoint_dir, 
            f"{workflow_id}_checkpoint.json"
        )
        
        if not os.path.exists(checkpoint_file):
            return None
        
        try:
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Checkpoint(
                workflow_id=data["workflow_id"],
                step=data["step"],
                completed_nodes=data["completed_nodes"],
                timestamp=data["timestamp"],
                version=data.get("version", "1.0.0")
            )
        except Exception:
            return None
    
    def clear(self, workflow_id: str):
        """清除断点"""
        checkpoint_file = os.path.join(
            self.checkpoint_dir, 
            f"{workflow_id}_checkpoint.json"
        )
        if os.path.exists(checkpoint_file):
            os.remove(checkpoint_file)


# ============================================================
# 节点基类
# ============================================================

class Node:
    """节点基类"""
    
    def __init__(self, node_id: str, name: str):
        self.node_id = node_id
        self.name = name
        self.inputs: Dict[str, NodeInput] = {}
        self.outputs: Dict[str, NodeOutput] = {}
        self.input_values: Dict[str, Any] = {}
        self.output_values: Dict[str, Any] = {}
    
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
    
    def __init__(self, node_id: str, name: str, provider: ModelProvider):
        super().__init__(node_id, name)
        self.provider = provider
        self.system_prompt = ""
    
    async def call_llm(self, prompt: str, system_prompt: str = "") -> str:
        """调用 LLM"""
        if system_prompt:
            return await self.provider.call(prompt, system_prompt)
        elif self.system_prompt:
            return await self.provider.call(prompt, self.system_prompt)
        else:
            return await self.provider.call(prompt)


# ============================================================
# 工作流类
# ============================================================

class Workflow:
    """工作流类"""
    
    def __init__(self, workflow_id: str, name: str):
        self.workflow_id = workflow_id
        self.name = name
        self.nodes: Dict[str, Node] = {}
        self.connections = []
    
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
        in_degree = {node_id: 0 for node_id in self.nodes}
        adj_list = {node_id: [] for node_id in self.nodes}
        
        for conn in self.connections:
            adj_list[conn["source_node"]].append(conn["target_node"])
            in_degree[conn["target_node"]] += 1
        
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
                
                if hasattr(source_node, 'output_values') and conn["source_output"] in source_node.output_values:
                    target_node.set_input(
                        conn["target_input"],
                        source_node.output_values[conn["source_output"]]
                    )


# ============================================================
# 执行引擎
# ============================================================

class Engine:
    """工作流执行引擎"""
    
    def __init__(self, workflow: Workflow, use_cache: bool = True, enable_checkpoint: bool = True):
        self.workflow = workflow
        self.use_cache = use_cache
        self.enable_checkpoint = enable_checkpoint
        self.cache = CacheManager() if use_cache else None
        self.checkpoint_manager = CheckpointManager() if enable_checkpoint else None
        self.execution_log: List[Dict[str, Any]] = []
    
    async def execute(self, skip_completed: bool = True) -> Dict[str, Any]:
        """执行工作流"""
        execution_order = self.workflow.topological_sort()
        
        results = {}
        step = 0
        
        # 检查断点
        if skip_completed and self.checkpoint_manager:
            checkpoint = self.checkpoint_manager.load(self.workflow.workflow_id)
            if checkpoint:
                print(f"[D] 从断点恢复: 步骤 {checkpoint.step}")
                for node_id, node_data in checkpoint.completed_nodes.items():
                    results[node_id] = node_data
                    if node_id in self.workflow.nodes:
                        self.workflow.nodes[node_id].output_values = node_data
        
        for node_id in execution_order:
            if node_id in results and skip_completed:
                print(f"[SKIP] Skip completed node: {node_id}")
                step += 1
                continue
            
            node = self.workflow.nodes[node_id]
            self.workflow.propagate_to_node(node_id)
            
            if not node.validate_inputs():
                error_msg = f"节点 {node.name} ({node_id}) 输入不完整"
                self.execution_log.append({
                    "node_id": node_id,
                    "status": "failed",
                    "error": error_msg
                })
                raise ValueError(error_msg)
            
            # 检查缓存
            if self.cache:
                node_model = getattr(node, 'provider', None) and getattr(node.provider, 'model', None) or ''
                cached = self.cache.get(self.workflow.workflow_id, node_id, node_model, node.input_values)
                if cached:
                    print(f"📦 使用缓存: {node_id}")
                    node.output_values = cached
                    results[node_id] = cached
                    step += 1
                    self._save_checkpoint(step, results)
                    continue
            
            try:
                # 检查是否是异步方法
                import asyncio
                import inspect
                if inspect.iscoroutinefunction(node.execute):
                    result = await node.execute()
                else:
                    result = node.execute()
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
                
                # 保存缓存
                if self.cache:
                    node_model = getattr(node, 'provider', None) and getattr(node.provider, 'model', None) or ''
                    self.cache.set(self.workflow.workflow_id, node_id, node_model, node.input_values, result.data)
                
                # 保存断点
                step += 1
                if self.checkpoint_manager:
                    self._save_checkpoint(step, results)
                
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
    
    def _save_checkpoint(self, step: int, results: Dict[str, Any]):
        """保存断点"""
        if self.checkpoint_manager:
            checkpoint = Checkpoint(
                workflow_id=self.workflow.workflow_id,
                step=step,
                completed_nodes=results,
                timestamp=__import__('datetime').datetime.now().isoformat()
            )
            self.checkpoint_manager.save(checkpoint)
    
    def get_execution_log(self) -> List[Dict[str, Any]]:
        """获取执行日志"""
        return self.execution_log


# ============================================================
# 循环配置
# ============================================================

@dataclass
class LoopConfig:
    """循环配置"""
    enabled: bool = False
    loop_nodes: List[str] = field(default_factory=list)
    max_iterations: int = 3
    exit_condition: str = ""


# ============================================================
# 支持循环的执行引擎
# ============================================================

class LoopEngine(Engine):
    """支持循环的工作流执行引擎

    用于实现：审计 → 修订 → 审计 → ... 的迭代循环
    直到关键问题清零或达到最大迭代次数
    """

    def __init__(self, workflow: Workflow, loop_config: LoopConfig = None,
                 use_cache: bool = True, enable_checkpoint: bool = True):
        super().__init__(workflow, use_cache, enable_checkpoint)
        self.loop_config = loop_config or LoopConfig()
        self.iteration_count = 0

    async def execute(self, skip_completed: bool = True) -> Dict[str, Any]:
        """执行工作流（支持循环）"""
        result = await super().execute(skip_completed)

        if self.loop_config.enabled and self.loop_config.loop_nodes:
            result = await self._execute_loop(result)

        return result

    async def _execute_loop(self, initial_result: Dict[str, Any]) -> Dict[str, Any]:
        """执行循环逻辑"""
        self.iteration_count = 0

        while self.iteration_count < self.loop_config.max_iterations:
            self.iteration_count += 1
            print(f"\n[LOOP] 循环迭代 {self.iteration_count}/{self.loop_config.max_iterations}")

            if self._check_exit_condition(initial_result):
                print(f"[OK] 循环退出条件满足，结束循环（第 {self.iteration_count} 次迭代）")
                break

            loop_result = await self._execute_loop_nodes()
            initial_result["results"].update(loop_result)
            initial_result["iteration_count"] = self.iteration_count

        if self.iteration_count >= self.loop_config.max_iterations:
            print(f"[WARN]️  达到最大迭代次数 {self.loop_config.max_iterations}，强制退出循环")
            initial_result["loop_terminated"] = "max_iterations"

        return initial_result

    def _check_exit_condition(self, result: Dict[str, Any]) -> bool:
        """检查退出条件"""
        condition = self.loop_config.exit_condition
        if not condition:
            return False

        if "critical_issues == 0" in condition:
            for node_id, node_result in result.get("results", {}).items():
                if isinstance(node_result, dict):
                    if "critical_issues_count" in node_result:
                        return node_result["critical_issues_count"] == 0
                    if "audit_report" in node_result:
                        audit = node_result["audit_report"]
                        if isinstance(audit, dict):
                            critical_count = len([
                                i for i in audit.get("issues", [])
                                if i.get("severity") == "critical"
                            ])
                            return critical_count == 0
        return False

    async def _execute_loop_nodes(self) -> Dict[str, Any]:
        """执行循环节点"""
        results = {}

        for node_id in self.loop_config.loop_nodes:
            if node_id not in self.workflow.nodes:
                print(f"[WARN]️  循环节点不存在: {node_id}")
                continue

            node = self.workflow.nodes[node_id]
            self.workflow.propagate_to_node(node_id)

            if not node.validate_inputs():
                print(f"[WARN]️  节点 {node.name} ({node_id}) 输入不完整，跳过")
                continue

            if self.cache:
                cached = self.cache.get(node_id, node.input_values)
                if cached:
                    print(f"📦 循环节点使用缓存: {node_id}")
                    node.output_values = cached
                    results[node_id] = cached
                    continue

            try:
                import inspect
                if inspect.iscoroutinefunction(node.execute):
                    result = await node.execute()
                else:
                    result = node.execute()

                node.output_values = result.data
                results[node_id] = result.data

                self.execution_log.append({
                    "node_id": node_id,
                    "status": "success" if result.success else "failed",
                    "error": result.error,
                    "outputs": result.data,
                    "iteration": self.iteration_count
                })

                if self.cache and result.success:
                    self.cache.set(node_id, node.input_values, result.data)

            except Exception as e:
                print(f"[X] 循环节点 {node.name} 执行失败: {str(e)}")
                self.execution_log.append({
                    "node_id": node_id,
                    "status": "error",
                    "error": str(e),
                    "iteration": self.iteration_count
                })

        return results