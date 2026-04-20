# StoryFlow 修订节点

智能修订节点 - 自动修复审计发现的问题，确保最终成品符合创作标准。

## 📋 功能特性

### 1. 分级修复策略

#### Critical（关键）- 自动修复，无需人工介入
- ✅ 时间线错误
- ✅ 逻辑矛盾
- ✅ 物资连续性错误
- ✅ 事实错误

#### Major（重要）- 自动修复 + 标记建议
- ✅ 叙事节奏问题
- ✅ 情感弧线偏离
- ✅ 角色行为不符合人设
- ✅ 对话问题

#### Minor（次要）- 标记给人工审核
- 💡 语言润色建议
- 💡 描写优化
- 💡 比喻和修辞改进
- 💡 词汇选择

### 2. 去 AI 味修订

- 📝 词汇疲劳词表处理
- 🚫 禁用句式替换
- 🎨 文风指纹注入
- 📏 句长多样性调整

### 3. 核心功能

- 🔄 多轮修订支持（直到关键问题清零）
- 📊 修订摘要生成
- 🎯 问题分类和统计
- 💾 完整的输入输出接口

## 🏗️ 架构设计

```
┌─────────────────────────────────────────┐
│           ReviseNode (修订节点)           │
├─────────────────────────────────────────┤
│  Inputs:                                │
│  - draft: 草稿内容                       │
│  - audit_result: 审计结果                │
│  - truth_files: 真相文件（可选）          │
├─────────────────────────────────────────┤
│  Components:                            │
│  - IssueClassifier: 问题分类器           │
│  - AITraceRemover: AI 痕迹去除器         │
│  - StyleFingerprint: 文风指纹            │
├─────────────────────────────────────────┤
│  Outputs:                               │
│  - revised_draft: 修订后的草稿           │
│  - suggestions: 次要问题建议             │
│  - revision_summary: 修订摘要            │
│  - revision_rounds: 修订轮次             │
└─────────────────────────────────────────┘
```

## 📦 模块结构

```
revise/
├── __init__.py              # 模块初始化
├── revise_node.py           # 修订节点核心实现
├── issue_classifier.py      # 问题分类器
├── ai_trace_remover.py      # AI 痕迹去除器
├── style_fingerprint.py     # 文风指纹
├── test_revise.py          # 单元测试
├── examples.py             # 使用示例
└── README.md               # 本文档
```

## 🚀 快速开始

### 1. 基本使用

```python
import asyncio
from nodes.revise import ReviseNode

async def revise_draft():
    # 创建修订节点
    node = ReviseNode(
        node_id="revise_1",
        api_key="your_api_key_here",
        model="modelstudio/qwen3.5-plus"
    )

    # 设置输入
    node.set_input("draft", "草稿内容...")
    node.set_input("audit_result", {
        "issues": [
            {
                "type": "timeline_error",
                "severity": "critical",
                "description": "时间线错误",
                "location": "第一章"
            }
        ]
    })

    # 执行修订
    result = await node.execute()

    if result.success:
        print("修订成功！")
        print(result.data["revised_draft"])

# 运行
asyncio.run(revise_draft())
```

### 2. 在工作流中使用

```python
from engine import Workflow, Engine
from nodes.revise import ReviseNode

# 创建工作流
workflow = Workflow("story_revision", "故事修订工作流")

# 添加修订节点
revise_node = ReviseNode(
    node_id="auto_revise",
    api_key="your_api_key_here",
    model="modelstudio/qwen3.5-plus"
)

workflow.add_node(revise_node)

# 设置输入（可以从其他节点传递）
revise_node.set_input("draft", draft_content)
revise_node.set_input("audit_result", audit_result)

# 执行工作流
engine = Engine(workflow)
results = await engine.execute()
```

### 3. 使用文风指纹

```python
# 定义文风指纹
style_fingerprint = {
    "sentence_length_avg": 25.0,
    "unique_word_ratio": 0.65,
    "tone": {
        "happy": 1,
        "sad": 0,
        "angry": 0,
        "calm": 2
    }
}

# 创建修订节点并注入文风指纹
node = ReviseNode(
    node_id="revise_1",
    api_key="your_api_key_here",
    model="modelstudio/qwen3.5-plus",
    config={
        "max_revision_rounds": 3,
        "style_fingerprint": style_fingerprint,
        "ai_trace_removal_config": {
            "word_replacement_rate": 0.8,
            "pattern_removal_rate": 0.9
        }
    }
)
```

## 📊 输入输出格式

### 输入

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| draft | str | ✅ | 草稿内容 |
| audit_result | dict | ✅ | 审计结果，包含 issues 列表 |
| truth_files | dict | ❌ | 真相文件（世界观、角色设定等） |

### 审计结果格式

```python
{
    "draft": "草稿内容",
    "issues": [
        {
            "type": "timeline_error",        # 问题类型
            "severity": "critical",          # 严重程度：critical/major/minor
            "description": "时间线错误",     # 问题描述
            "location": "第一章",           # 问题位置
            "suggestion": "调整时间描述"     # 修复建议
        }
    ],
    "summary": {
        "total_issues": 9,
        "critical_issues": 3,
        "major_issues": 3,
        "minor_issues": 3
    }
}
```

### 输出

| 参数 | 类型 | 说明 |
|------|------|------|
| revised_draft | str | 修订后的草稿 |
| suggestions | list | 次要问题建议列表 |
| revision_summary | dict | 修订摘要 |
| revision_rounds | int | 修订轮次 |

### 修订摘要格式

```python
{
    "revision_rounds": 3,
    "original_issue_count": 9,
    "critical_fixed": 3,
    "major_fixed": 3,
    "minor_suggestions": 3,
    "original_length": 1500,
    "revised_length": 1650,
    "length_change": 150,
    "auto_fixable_issues": 6,
    "success_rate": 0.67
}
```

## 🧪 运行测试

```bash
# 运行所有测试
python nodes/revise/test_revise.py

# 预期输出
✅ 测试 1: 关键问题分类正确
✅ 测试 2: 重要问题分类正确
...
✅ 所有测试通过！
```

## 📝 运行示例

```bash
# 运行示例（需要配置 API Key）
python nodes/revise/examples.py
```

## 🔧 配置选项

### 节点配置

```python
config = {
    "max_revision_rounds": 3,              # 最大修订轮次
    "ai_trace_removal_config": {           # AI 痕迹去除配置
        "word_replacement_rate": 0.8,      # 词汇替换率 (0-1)
        "pattern_removal_rate": 0.9,       # 句式移除率 (0-1)
        "min_sentence_length": 5,          # 最小句长
        "max_sentence_length": 50          # 最大句长
    },
    "style_fingerprint": {                 # 文风指纹（可选）
        "sentence_length_avg": 25.0,
        "unique_word_ratio": 0.65,
        # ... 更多参数
    }
}
```

## 🎯 问题类型

### 关键问题（Critical）

| 类型 | 说明 | 示例 |
|------|------|------|
| timeline_error | 时间线错误 | 前后时间不一致 |
| logic_contradiction | 逻辑矛盾 | 前后描述矛盾 |
| continuity_error | 连续性错误 | 人物/物品突然出现或消失 |
| fact_error | 事实错误 | 不符合设定的事实 |

### 重要问题（Major）

| 类型 | 说明 | 示例 |
|------|------|------|
| narrative_pacing | 叙事节奏问题 | 节奏过快或过慢 |
| emotion_arc | 情感弧线偏离 | 情感表达不连贯 |
| character_behavior | 角色行为不符合人设 | 行为与设定不符 |
| dialogue_issue | 对话问题 | 对话不自然或缺乏张力 |

### 次要问题（Minor）

| 类型 | 说明 | 示例 |
|------|------|------|
| language_polish | 语言润色建议 | 句式重复、表达不够精炼 |
| description_opt | 描写优化 | 环境描写缺乏细节 |
| rhetoric_improve | 比喻和修辞改进 | 修辞手法不够丰富 |
| word_choice | 词汇选择 | 词汇重复或不够精准 |

## 💡 最佳实践

1. **多轮修订**：设置 `max_revision_rounds=3`，确保关键问题完全修复
2. **使用真相文件**：提供世界观、角色设定等参考，提高修复准确性
3. **注入文风指纹**：保持作者独特的写作风格
4. **人工审核次要问题**：`suggestions` 列表需要人工审核和处理
5. **保存修订历史**：记录每轮修订的结果，便于追溯和回滚

## 🔍 常见问题

### Q: 如何处理修订失败？

A: 检查以下几点：
1. API Key 是否正确
2. 草稿内容是否过长（建议分段处理）
3. 审计结果格式是否正确
4. 网络连接是否正常

### Q: 能否自定义修复策略？

A: 可以。修改 `_fix_critical()` 和 `_fix_major()` 方法中的 prompt，定制修复逻辑。

### Q: 如何添加新的问题类型？

A: 在 `issue_classifier.py` 中添加新的类型到对应的严重程度列表中。

### Q: 文风指纹如何获取？

A: 使用 `StyleFingerprint.extract()` 方法从作者的原文中提取。

## 📚 相关文档

- [StoryFlow 核心引擎](../../README.md)
- [审计节点](../audit/README.md)
- [真相文件节点](../truth_files/README.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

---

**版本**: 1.0.0
**最后更新**: 2026-04-19
