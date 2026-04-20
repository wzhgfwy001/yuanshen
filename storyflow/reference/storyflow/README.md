# StoryFlow - 轻量级节点工作流引擎

一个基于 Python 的命令行节点工作流引擎，支持可视化节点连接和异步执行，内置通义千问 LLM 集成。

## ✨ 特性

- 🔗 **节点化设计**：模块化的节点系统，易于扩展
- 🔄 **数据流管理**：自动节点间数据传递和依赖解析
- 🧠 **LLM 集成**：内置通义千问 API 支持
- 📊 **拓扑排序**：智能执行顺序确定
- 📝 **执行日志**：详细的执行过程追踪
- ⚙️ **配置驱动**：JSON 格式的工作流配置

## 📦 安装

```bash
pip install httpx
```

## 🏗️ 项目结构

```
storyflow/
├── engine.py              # 核心引擎（Node, Workflow, Engine）
├── nodes.py               # 示例节点类
├── main.py                # 主入口文件
├── workflow_config.json   # 工作流配置示例
└── README.md             # 本文档
```

## 🚀 快速开始

### 1. 配置 API Key

在 `main.py` 中设置你的通义千问 API Key：

```python
API_KEY = "your-api-key-here"
MODEL = "modelstudio/qwen3.5-plus"
```

### 2. 运行示例

```bash
python main.py
```

这将执行一个完整的小说创作工作流：
1. 世界观生成
2. 角色生成
3. 章节生成

## 📚 核心概念

### Node（节点）

节点是工作流的基本执行单元，包含：
- 输入端口
- 输出端口
- 处理逻辑

```python
from engine import Node, NodeResult

class MyNode(Node):
    def __init__(self, node_id: str, name: str):
        super().__init__(node_id, name)
        self.add_input("data", "str", True)
        self.add_output("result", "str")

    def execute(self) -> NodeResult:
        # 实现节点逻辑
        data = self.input_values.get("data", "")
        return NodeResult(
            success=True,
            data={"result": data.upper()}
        )
```

### Workflow（工作流）

工作流定义了节点之间的连接关系：

```python
from engine import Workflow

workflow = Workflow("my_workflow", "我的工作流")

# 添加节点
workflow.add_node(my_node)

# 添加连接
workflow.add_connection(
    source_node="node1",
    source_output="output1",
    target_node="node2",
    target_input="input1"
)
```

### Engine（执行引擎）

引擎负责工作流的执行和数据传播：

```python
from engine import Engine

engine = Engine(workflow)
result = await engine.execute()
```

## 🔧 创建自定义节点

### 1. 普通节点

继承 `Node` 类并实现 `execute` 方法：

```python
from engine import Node, NodeResult

class TextProcessorNode(Node):
    def __init__(self, node_id: str):
        super().__init__(node_id, "文本处理")
        self.add_input("text", "str", True)
        self.add_output("processed", "str")

    def execute(self) -> NodeResult:
        text = self.input_values.get("text", "")
        processed = text.strip()
        return NodeResult(success=True, data={"processed": processed})
```

### 2. LLM 节点

继承 `LLMNode` 类获得自动 LLM 调用能力：

```python
from nodes import LLMNode

class TranslationNode(LLMNode):
    def __init__(self, node_id: str, api_key: str, model: str):
        super().__init__(node_id, "翻译", api_key, model)
        self.add_input("text", "str", True)
        self.add_output("translation", "str")

    async def execute(self) -> NodeResult:
        text = self.input_values.get("text", "")

        system_prompt = "你是一位专业的翻译家"
        prompt = f"将以下文本翻译成英文：{text}"

        translation = await self.call_llm(prompt, system_prompt)

        return NodeResult(
            success=True,
            data={"translation": translation}
        )
```

## 📝 工作流配置

工作流配置使用 JSON 格式：

```json
{
  "workflow_id": "my_workflow",
  "name": "我的工作流",
  "nodes": [
    {
      "node_id": "node1",
      "name": "节点1",
      "type": "world_building",
      "config": {
        "genre": "奇幻",
        "theme": "冒险"
      }
    }
  ],
  "connections": [
    {
      "source_node": "node1",
      "source_output": "output1",
      "target_node": "node2",
      "target_input": "input1"
    }
  ]
}
```

## 📊 执行流程

1. **拓扑排序**：确定节点的执行顺序
2. **数据传播**：将上一个节点的输出传递到下一个节点的输入
3. **节点执行**：依次执行每个节点
4. **结果收集**：收集所有节点的输出结果

## 🎯 示例节点

### WorldBuildingNode（世界观生成）
生成虚构世界的设定，包括地理、魔法体系、政治等。

### CharacterNode（角色生成）
基于世界观创建角色，包括背景、性格、动机等。

### ChapterGenerationNode（章节生成）
根据世界观和角色信息创作小说章节。

## 🔍 调试技巧

### 查看执行日志

```python
result = await engine.execute()
for log in result["log"]:
    print(f"{log['node_id']}: {log['status']}")
```

### 查看节点输入输出

```python
node = workflow.nodes["node_id"]
print("输入:", node.input_values)
print("输出:", node.output_values)
```

## 🛠️ 技术要求

- Python 3.10+
- httpx（HTTP 客户端）
- 通义千问 API Key

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，欢迎联系。

---

**StoryFlow** - 让创意流动起来！ 🚀
