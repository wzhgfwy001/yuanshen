# StoryFlow 快速开始指南

## 📋 项目概览

StoryFlow 是一个轻量级的 Python 节点工作流引擎，专为创意写作和内容生成设计。它采用节点化架构，支持通过可视化连接构建复杂的工作流。

### 📊 代码统计

- **核心引擎** (engine.py): 237 行
- **示例节点** (nodes.py): 186 行
- **主程序** (main.py): 145 行
- **单元测试** (test_basic.py): 175 行
- **总计**: ~743 行

### 🎯 核心特性

✅ 节点类定义（输入/输出/处理函数）
✅ 节点连接和数据传递
✅ 工作流执行引擎
✅ 拓扑排序和循环依赖检测
✅ 通义千问 API 集成
✅ JSON 配置驱动
✅ 详细的执行日志

## 🚀 三步上手

### 1️⃣ 安装依赖

```bash
cd storyflow
pip install -r requirements.txt
```

### 2️⃣ 配置 API Key

编辑 `main.py`，设置你的通义千问 API Key：

```python
API_KEY = "your-api-key-here"
MODEL = "modelstudio/qwen3.5-plus"
```

### 3️⃣ 运行示例

```bash
# 运行小说创作工作流（需要 API Key）
python main.py

# 运行单元测试（不需要 API Key）
python test_basic.py
```

## 📁 项目结构

```
storyflow/
├── __init__.py              # 包初始化文件
├── engine.py                # 核心引擎 (237 行)
│   ├── Node                 # 节点基类
│   ├── NodeInput/Output     # 输入/输出定义
│   ├── NodeResult           # 执行结果
│   ├── LLMNode              # LLM 节点基类
│   ├── Workflow             # 工作流管理
│   └── Engine               # 执行引擎
│
├── nodes.py                 # 示例节点 (186 行)
│   ├── WorldBuildingNode    # 世界观生成
│   ├── CharacterNode        # 角色生成
│   ├── ChapterGenerationNode # 章节生成
│   └── SimpleNode           # 简单节点示例
│
├── main.py                  # 主入口 (145 行)
│   ├── 配置加载
│   ├── 工作流构建
│   └── 执行演示
│
├── test_basic.py            # 单元测试 (175 行)
│   ├── 基本工作流测试
│   ├── 拓扑排序测试
│   ├── 循环依赖测试
│   └── 输入验证测试
│
├── workflow_config.json     # 工作流配置示例
├── requirements.txt         # Python 依赖
├── README.md               # 详细文档
└── QUICKSTART.md           # 本文档
```

## 💡 使用示例

### 示例 1：创建简单工作流

```python
from engine import Workflow, Engine
from nodes import WorldBuildingNode, CharacterNode

# 创建工作流
workflow = Workflow("simple_story", "简单故事")

# 添加节点
world_node = WorldBuildingNode("world1", API_KEY, MODEL)
world_node.set_input("genre", "科幻")
world_node.set_input("theme", "太空探索")

char_node = CharacterNode("char1", API_KEY, MODEL)

workflow.add_node(world_node)
workflow.add_node(char_node)

# 添加连接
workflow.add_connection(
    "world1", "world_description",
    "char1", "world_description"
)

# 执行工作流
engine = Engine(workflow)
result = await engine.execute()
```

### 示例 2：自定义节点

```python
from engine import Node, NodeResult

class TextSummarizerNode(Node):
    """文本摘要节点"""

    def __init__(self, node_id: str):
        super().__init__(node_id, "文本摘要")
        self.add_input("text", "str", True)
        self.add_output("summary", "str")

    def execute(self) -> NodeResult:
        text = self.input_values.get("text", "")
        summary = text[:100] + "..." if len(text) > 100 else text
        return NodeResult(success=True, data={"summary": summary})
```

### 示例 3：从 JSON 加载工作流

```python
import json

# 加载配置
with open("my_workflow.json") as f:
    config = json.load(f)

# 创建工作流（需要实现节点工厂）
workflow = create_workflow_from_config(config)

# 执行
engine = Engine(workflow)
result = await engine.execute()
```

## 🔧 工作流配置格式

```json
{
  "workflow_id": "unique_id",
  "name": "我的工作流",
  "nodes": [
    {
      "node_id": "node1",
      "name": "节点1",
      "type": "world_building",
      "config": {
        "genre": "奇幻",
        "theme": "魔法"
      }
    }
  ],
  "connections": [
    {
      "source_node": "node1",
      "source_output": "world_description",
      "target_node": "node2",
      "target_input": "world_description"
    }
  ]
}
```

## 🧪 运行测试

所有测试都在 `test_basic.py` 中，不需要 API Key：

```bash
python test_basic.py
```

测试覆盖：
- ✅ 基本工作流执行
- ✅ 拓扑排序正确性
- ✅ 循环依赖检测
- ✅ 输入验证

## 🎨 示例工作流

### 小说创作工作流（已包含）

```
世界观生成 → 角色生成 → 章节生成
     ↓             ↓            ↓
世界描述      角色档案      章节内容
魔法体系      角色动机      字数统计
```

### 可扩展的工作流

你可以创建更多节点来扩展功能：

- **场景生成节点**: 根据世界观和角色创建场景
- **对话生成节点**: 生成角色对话
- **情节规划节点**: 规划故事情节线
- **多角色互动**: 处理多个角色之间的互动

## 📖 核心概念

### 节点 (Node)

工作流的基本执行单元，每个节点都有：
- **输入端口**: 接收数据
- **输出端口**: 产生数据
- **处理逻辑**: execute() 方法

### 工作流 (Workflow)

定义节点和连接关系：
- **拓扑排序**: 确定执行顺序
- **数据传播**: 自动传递数据
- **依赖管理**: 避免循环依赖

### 引擎 (Engine)

执行工作流的核心：
- **节点调度**: 按顺序执行节点
- **数据流控制**: 确保数据正确传递
- **日志记录**: 追踪执行过程

## 🚨 常见问题

### Q: 如何调试工作流？

A: 查看执行日志：

```python
result = await engine.execute()
for log in result["log"]:
    print(f"{log['node_id']}: {log['status']}")
```

### Q: 如何处理节点失败？

A: 检查 result["success"] 和错误信息：

```python
if not result["success"]:
    print(f"执行失败: {result.get('error')}")
```

### Q: 如何添加新的节点类型？

A: 继承 `Node` 或 `LLMNode` 类：

```python
class MyCustomNode(Node):
    def __init__(self, node_id: str):
        super().__init__(node_id, "我的节点")
        self.add_input("data", "str")
        self.add_output("result", "str")

    def execute(self) -> NodeResult:
        # 实现你的逻辑
        return NodeResult(success=True, data={"result": "..."})
```

## 📚 下一步

1. 阅读 `README.md` 了解更多细节
2. 运行 `test_basic.py` 熟悉核心概念
3. 运行 `main.py` 看完整示例
4. 创建你自己的节点和工作流
5. 修改 `workflow_config.json` 尝试不同配置

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**开始你的 StoryFlow 之旅吧！** 🚀
