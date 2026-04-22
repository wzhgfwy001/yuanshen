# StoryFlow 审计节点

33 维度文学审计系统，用于检查小说草稿的连续性、逻辑自洽性和 AI 痕迹。

## 功能特性

### 1. 33 维度审计清单

审计节点提供 33 个维度的全面审计，包括：

- **角色相关**：角色记忆一致性、人物行为符合人设、角色动机合理性、角色成长轨迹
- **情节相关**：大纲偏离度、伏笔回收、伏笔密度、情节推进速度、冲突设置合理性、逻辑自洽性
- **叙事相关**：叙事节奏、情感弧线、时间线一致性、地理一致性、信息边界遵守、节奏把控、高潮设置、结局合理性
- **文本相关**：AI 痕迹检测、语言风格统一性、对话自然度、描写丰富度、细节描写准确性、比喻和修辞恰当性、情感描写深度、文学性
- **世界构建**：物资连续性、物理规律一致性、社会规则合理性、世界观一致性
- **主题相关**：主题表达清晰度、读者代入感、悬念设置
- **副线相关**：副线推进

### 2. AI 痕迹检测

检测文本中可能存在的 AI 生成痕迹：

- **高频词检测**：识别过度使用的 AI 常用词
- **句式单调性检测**：检测句子长度和开头的重复模式
- **过度总结检测**：识别过度的总结性表达
- **AI 味表达识别**：检测典型的 AI 生成风格表达

### 3. 增量审计支持

支持增量审计模式，只检查新增内容，提高效率。

## 安装

```bash
# 确保项目结构正确
cd /workspace/projects/workspace/storyflow

# 安装依赖
pip install httpx
```

## 快速开始

### 1. 基本使用

```python
import asyncio
from storyflow.nodes.audit import AuditNode

async def audit_chapter():
    # 创建审计节点
    audit_node = AuditNode(
        node_id="audit_1",
        api_key="your_qwen_api_key",
        model="qwen-plus"
    )

    # 设置输入
    audit_node.set_input("chapter_draft", "你的章节草稿...")
    audit_node.set_input("chapter_number", 1)
    audit_node.set_input("chapter_title", "第一章")
    audit_node.set_input("truth_files", ["真相1", "真相2", ...])
    audit_node.set_input("previous_chapters", "之前章节内容...")
    audit_node.set_input("outline", "大纲内容...")

    # 执行审计
    result = await audit_node.execute()

    if result.success:
        print(f"审计得分: {result.data['score']}")
        print(f"是否通过: {result.data['passed']}")
        print(f"问题数量: {result.data['issues_count']}")
        print(f"审计报告: {result.data['audit_report']}")
    else:
        print(f"审计失败: {result.error}")

# 运行审计
asyncio.run(audit_chapter())
```

### 2. 增量审计模式

```python
audit_node.set_input("incremental_mode", True)
audit_node.set_input("new_content", "新增的内容...")

# 只审计新增内容
result = await audit_node.execute()
```

### 3. 独立使用 AI 痕迹检测器

```python
from storyflow.nodes.audit import AITraceDetector

detector = AITraceDetector()

# 检测 AI 痕迹
issues = detector.detect("你的文本...")

# 获取评分
score = detector.calculate_ai_score("你的文本...")
print(f"AI 痕迹评分: {score}")

# 获取完整报告
report = detector.get_report("你的文本...")
print(report)
```

## 输入参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `chapter_draft` | str | 是 | - | 章节草稿全文 |
| `chapter_number` | int | 是 | 1 | 章节编号 |
| `chapter_title` | str | 是 | - | 章节标题 |
| `truth_files` | list | 是 | [] | 真相文件列表（7 个） |
| `previous_chapters` | str | 否 | "" | 之前章节的内容 |
| `outline` | str | 否 | "" | 故事大纲 |
| `incremental_mode` | bool | 否 | False | 是否使用增量审计模式 |
| `new_content` | str | 否 | "" | 新增内容（增量模式） |

## 输出结果

```python
{
    "success": True,
    "data": {
        "audit_report": {
            "passed": bool,  # 是否通过审计
            "score": float,  # 综合得分 (0-1)
            "issues": [...],  # 问题列表
            "dimension_scores": {...},  # 各维度得分
            "ai_trace_report": {...},  # AI 痕迹报告
            "summary": str,  # 审计摘要
            "audit_time": str,  # 审计时间
            "chapter_info": {...}  # 章节信息
        },
        "passed": bool,
        "score": float,
        "issues_count": int
    }
}
```

## 审计报告格式

```yaml
passed: true/false
score: 0.85

issues:
  - dimension: "角色记忆一致性"
    severity: "major"
    description: "角色在第三章忘记了第二章的事件"
    location: "第三章第 5 段"
    suggestion: "建议添加回忆或重新梳理时间线"

summary: "审计通过，发现 2 个主要问题..."
```

## 问题严重程度

- **critical**（严重）：必须修复，严重影响作品质量
- **major**（主要）：建议修复，影响作品体验
- **minor**（次要）：可选修复，轻微影响作品质量

## 审计阈值

- **通过阈值**：0.7（得分 ≥ 0.7 且无严重问题）
- **AI 痕迹阈值**：0.5（AI 痕迹评分 ≤ 0.5）

## 单元测试

```bash
# 运行所有测试
cd /workspace/projects/workspace/storyflow/nodes/audit
python test_audit.py --api-key your_api_key

# 或使用环境变量
export QWEN_API_KEY=your_api_key
python test_audit.py
```

## 示例数据

```python
from storyflow.nodes.audit.example_data import (
    EXAMPLE_CHAPTER_DRAFT,
    EXAMPLE_TRUTH_FILES,
    EXAMPLE_OUTLINE,
    get_example_inputs
)

# 获取示例输入
inputs = get_example_inputs()
```

## 文件结构

```
audit/
├── __init__.py              # 包初始化
├── audit_node.py            # 核心审计节点
├── dimensions.py            # 33 维度定义
├── ai_trace_detector.py     # AI 痕迹检测器
├── example_data.py          # 示例数据
├── test_audit.py            # 单元测试
└── README.md                # 本文档
```

## 技术架构

### 继承关系

```
Node (基类)
  └── LLMNode (LLM 节点基类)
      └── AuditNode (审计节点)
```

### 核心组件

1. **AuditNode**：主审计节点，协调整个审计流程
2. **AuditDimension**：维度定义，包含检查逻辑和权重
3. **AITraceDetector**：AI 痕迹检测器，独立的检测算法
4. **AuditReport**：审计报告，包含所有审计结果

### 审计流程

```
1. 构建上下文（真相文件 + 之前章节 + 大纲）
2. 批量审计 33 个维度（每批 5 个）
3. AI 痕迹检测（独立算法）
4. 计算综合得分
5. 评估通过状态
6. 生成审计摘要
```

## 性能优化

- **批量审计**：将 33 个维度分批审计，每批 5 个，减少 API 调用次数
- **增量审计**：支持只审计新增内容，减少重复工作
- **并行处理**：未来可支持并行审计多个维度

## 注意事项

1. **API Key**：需要通义千问 API Key，从 [阿里云百炼](https://bailian.console.aliyun.com/) 获取
2. **真相文件**：建议提供完整的 7 个真相文件以获得最佳审计效果
3. **上下文限制**：由于 LLM token 限制，过长的上下文可能需要分段处理
4. **网络连接**：审计过程需要稳定的网络连接

## 常见问题

### Q: 为什么审计需要真相文件？

A: 真相文件是故事的核心设定，审计需要对照这些设定来检查草稿的连续性和逻辑自洽性。

### Q: AI 痕迹检测准确吗？

A: AI 痕迹检测基于统计规则，可以识别常见的 AI 生成模式，但不是 100% 准确。结果仅供参考。

### Q: 如何提高审计得分？

A:
1. 修复严重和主要问题
2. 减少 AI 味表达
3. 增加细节描写和情感深度
4. 确保逻辑自洽和连续性

### Q: 增量审计和全量审计有什么区别？

A:
- 全量审计：审计整个章节，准确度更高
- 增量审计：只审计新增内容，速度更快

## 未来改进

- [ ] 支持并行审计多个维度
- [ ] 添加更多自定义维度
- [ ] 支持审计结果导出（Markdown、PDF）
- [ ] 添加审计历史追踪
- [ ] 支持多人协作审计

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

- 项目地址：`/workspace/projects/workspace/storyflow/nodes/audit/`
- 作者：StoryFlow Team
- 版本：0.1.0
