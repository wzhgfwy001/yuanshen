# INKOS 5-Agent 工作流

完整的小说创作管线，基于 StoryFlow 引擎实现。

## 📋 概述

INKOS 5-Agent 工作流是一个端到端的小说创作自动化系统，通过 5 个专业 Agent 的接力协作，从市场分析到最终成稿，实现高质量小说内容的自动化生成。

### 5-Agent 接力流程

```
雷达 → 建筑师 → 真相文件 → 写手 → 审计 → 修订
 ↓         ↓           ↓         ↓        ↓
市场分析   结构规划    长期记忆   正文生成   质量保证
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd storyflow
pip install -r requirements.txt
pip install pytest pytest-asyncio
```

### 2. 配置 API Key

编辑 `workflows/examples.py`，设置你的通义千问 API Key：

```python
API_KEY = "your-api-key-here"
MODEL = "modelstudio/qwen3.5-plus"
```

### 3. 运行示例

```bash
cd workflows
python examples.py
```

### 4. 运行测试

```bash
cd workflows
python test_inkos_5agent.py
```

或使用 pytest：

```bash
pytest test_inkos_5agent.py -v
```

## 📦 组件说明

### 1. RadarNode（雷达节点）

**功能**：扫描平台趋势和读者偏好

**输入**：
- `genre`: 题材类型（如：玄幻、都市、科幻）
- `platform`: 目标平台（如：起点、飞卢）
- `trend_keywords`: 趋势关键词列表

**输出**：
- `market_report`: 市场分析报告
- `reader_preferences`: 读者偏好画像
- `story_direction`: 故事方向建议

**示例**：

```python
from workflows.inkos_5agent import RadarNode

radar = RadarNode(
    node_id="radar",
    api_key="your-api-key",
    model="modelstudio/qwen3.5-plus",
    config={
        "genre": "玄幻",
        "platform": "起点",
        "trend_keywords": ["修仙", "重生", "系统"]
    }
)

result = await radar.execute()
```

### 2. ArchitectNode（建筑师节点）

**功能**：规划章节结构、大纲设计、场景节拍、节奏控制

**输入**：
- `market_context`: 市场分析上下文
- `chapter_number`: 章节数
- `target_words`: 目标字数
- `previous_outline`: 上一章大纲

**输出**：
- `chapter_outline`: 章节大纲
- `scene_breakdown`: 场景分解
- `pacing_plan`: 节奏规划

**示例**：

```python
from workflows.inkos_5agent import ArchitectNode

architect = ArchitectNode(
    node_id="architect",
    api_key="your-api-key",
    model="modelstudio/qwen3.5-plus",
    config={
        "chapter_number": 1,
        "target_words": 3000
    }
)

architect.set_input("market_context", radar.output_values["market_report"])
result = await architect.execute()
```

### 3. WriterNode（写手节点）

**功能**：根据大纲生成正文，两阶段：创意写作 → 状态结算

**输入**：
- `chapter_outline`: 章节大纲
- `truth_context`: 真相文件上下文
- `style`: 写作风格（immersive, fast-paced, literary）
- `pacing`: 节奏（slow, balanced, fast）

**输出**：
- `chapter_draft`: 章节草稿
- `state_update`: 状态更新
- `word_count`: 字数统计

**示例**：

```python
from workflows.inkos_5agent import WriterNode

writer = WriterNode(
    node_id="writer",
    api_key="your-api-key",
    model="modelstudio/qwen3.5-plus",
    config={
        "style": "immersive",
        "pacing": "balanced"
    }
)

writer.set_input("chapter_outline", architect.output_values["chapter_outline"])
result = await writer.execute()
```

### 4. AuditNode（审计节点）

**功能**：33维度审计，对照真相文件检查

**输入**：
- `chapter_content`: 章节内容
- `current_state`: 当前状态
- `strict_mode`: 严格模式（True/False）

**输出**：
- `audit_report`: 审计报告
- `issues`: 问题列表
- `critical_issues_count`: 关键问题数
- `passed`: 是否通过

**33个审计维度**：
- 逻辑一致性、角色行为、剧情连贯、对话自然、细节描写
- 节奏把控、情感深度、冲突设计、伏笔埋设、角色成长
- 世界观一致、场景转换、时间线一致、道具使用、技能设定
- 信息量控制、阅读体验、代入感、悬念设置、高潮设计
- 结尾力度、人物关系、语言风格、用词精准、句式变化
- 段落结构、标点规范、错别字、格式规范、原创性
- 市场匹配、目标受众、完成度

**示例**：

```python
from workflows.inkos_5agent import AuditNode

audit = AuditNode(
    node_id="audit",
    api_key="your-api-key",
    model="modelstudio/qwen3.5-plus",
    config={
        "strict_mode": True,
        "critical_dimensions": ["逻辑一致性", "角色行为", "剧情连贯"]
    }
)

audit.set_input("chapter_content", writer.output_values["chapter_draft"])
result = await audit.execute()
```

### 5. ReviserNode（修订节点）

**功能**：修复审计问题、去 AI 味处理

**输入**：
- `audit_issues`: 审计问题
- `original_content`: 原始内容
- `remove_ai_traces`: 去除 AI 味（True/False）
- `enhance_readability`: 增强可读性（True/False）

**输出**：
- `final_chapter`: 最终章节
- `revision_log`: 修订日志
- `word_count`: 字数统计

**示例**：

```python
from workflows.inkos_5agent import ReviserNode

revise = ReviserNode(
    node_id="revise",
    api_key="your-api-key",
    model="modelstudio/qwen3.5-plus",
    config={
        "remove_ai_traces": True,
        "enhance_readability": True
    }
)

revise.set_input("audit_issues", audit.output_values["audit_report"])
revise.set_input("original_content", writer.output_values["chapter_draft"])
result = await revise.execute()
```

## 🔄 循环机制

工作流支持自动循环，当审计不通过时，自动进入"修订 → 再审计"循环，直到所有关键问题清零。

### 循环配置

在配置文件中设置：

```json
{
  "loop_config": {
    "enabled": true,
    "loop_nodes": ["revise", "audit"],
    "max_iterations": 3,
    "exit_condition": "critical_issues_count == 0"
  }
}
```

**参数说明**：
- `enabled`: 是否启用循环
- `loop_nodes`: 参与循环的节点列表
- `max_iterations`: 最大迭代次数
- `exit_condition`: 退出条件（目前支持 `critical_issues_count == 0`）

### 循环流程示例

```
迭代 1:
  audit: critical_issues_count = 5
  revise: 修复问题
迭代 2:
  audit: critical_issues_count = 2
  revise: 继续修复
迭代 3:
  audit: critical_issues_count = 0
  ✅ 退出循环，输出最终章节
```

## 📁 文件结构

```
workflows/
├── inkos_5agent.py          # 5-Agent 工作流实现
├── inkos_5agent_config.json # 工作流配置文件
├── examples.py              # 使用示例
├── test_inkos_5agent.py     # 单元测试
├── README.md                # 本文档
└── outputs/                 # 输出目录（自动创建）
    ├── workflow_result.json # 工作流执行结果
    ├── chapter_final.txt    # 最终章节
    └── chapter_outline.json # 章节大纲
```

## 🔧 配置说明

### 工作流配置文件（JSON）

```json
{
  "workflow_id": "inkos_5agent",
  "name": "INKOS 5-Agent 接力工作流",
  "nodes": [
    {
      "id": "radar",
      "type": "RadarNode",
      "name": "市场趋势雷达",
      "config": {
        "genre": "玄幻",
        "platform": "起点",
        "trend_keywords": ["修仙", "重生", "系统"]
      }
    }
  ],
  "connections": [
    {
      "source": "radar",
      "output": "market_report",
      "target": "architect",
      "input": "market_context"
    }
  ],
  "loop_config": {
    "enabled": true,
    "loop_nodes": ["revise", "audit"],
    "max_iterations": 3,
    "exit_condition": "critical_issues_count == 0"
  }
}
```

### 节点配置

每个节点都可以配置以下参数：

**RadarNode**:
- `genre`: 题材类型
- `platform`: 目标平台
- `trend_keywords`: 趋势关键词

**ArchitectNode**:
- `chapter_number`: 章节数
- `target_words`: 目标字数

**WriterNode**:
- `style`: 写作风格（immersive, fast-paced, literary）
- `pacing`: 节奏（slow, balanced, fast）

**AuditNode**:
- `strict_mode`: 严格模式（True/False）
- `critical_dimensions`: 关键维度列表

**ReviserNode**:
- `remove_ai_traces`: 去除 AI 味（True/False）
- `enhance_readability`: 增强可读性（True/False）

## 🧪 测试

### 运行所有测试

```bash
python test_inkos_5agent.py
```

### 运行特定测试

```bash
pytest test_inkos_5agent.py::test_radar_node_basic -v
```

### 测试覆盖

- ✅ 节点基本功能测试
- ✅ 节点模拟执行测试
- ✅ 循环引擎测试
- ✅ 工作流配置加载测试
- ✅ 集成测试

## 💡 使用建议

### 1. 逐步调试

首次使用时，建议逐步执行每个节点，检查中间结果：

```python
# 1. 执行雷达节点
radar_result = await radar.execute()
print(radar_result.data)

# 2. 执行建筑师节点
architect.set_input("market_context", radar_result.data["market_report"])
architect_result = await architect.execute()
print(architect_result.data)

# 3. 继续执行后续节点...
```

### 2. 调整参数

根据实际效果调整节点参数：

- `target_words`: 调整目标字数
- `style`: 调整写作风格
- `strict_mode`: 调整审计严格程度
- `max_iterations`: 调整最大迭代次数

### 3. 保存结果

将工作流执行结果保存到文件：

```python
result = await workflow.execute()

# 保存结果
with open("outputs/workflow_result.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

# 保存章节
with open("outputs/chapter_final.txt", "w", encoding="utf-8") as f:
    f.write(result["results"]["revise"]["final_chapter"])
```

## 📊 性能优化

### 1. 减少调用次数

- 合并多个小节为一个完整章节
- 使用缓存存储中间结果

### 2. 并行执行

某些节点可以并行执行（如 RadarNode 和其他节点）

### 3. 批量处理

一次生成多个章节，减少上下文切换

## 🚨 常见问题

### Q: API 调用失败怎么办？

A: 检查以下几点：
1. API Key 是否正确
2. 网络连接是否正常
3. API 配额是否充足
4. 模型名称是否正确

### Q: 生成内容质量不理想？

A: 尝试以下方法：
1. 调整 `style` 和 `pacing` 参数
2. 优化章节大纲
3. 增加 `max_iterations` 数量
4. 修改审计维度的权重

### Q: 循环次数过多？

A: 检查以下几点：
1. 审计条件是否过严
2. 降低 `strict_mode` 或减少 `critical_dimensions`
3. 调整 `exit_condition`

### Q: 如何集成到现有项目？

A: 参考 `examples.py` 中的示例代码，按照以下步骤：
1. 导入必要的节点类
2. 创建节点实例
3. 设置节点连接
4. 执行工作流
5. 处理执行结果

## 📚 相关文档

- [StoryFlow README](../README.md) - StoryFlow 引擎文档
- [QUICKSTART](../QUICKSTART.md) - 快速开始指南
- [DELIVERY](../DELIVERY.md) - 项目交付清单

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**最后更新**: 2026-04-19
**版本**: 1.0.0
