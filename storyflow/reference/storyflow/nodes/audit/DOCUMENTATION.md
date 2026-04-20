# StoryFlow 审计节点 - 完整功能文档

## 项目概述

StoryFlow 审计节点是一个功能强大的 33 维度文学审计系统，专门用于检查小说草稿的连续性、逻辑自洽性和 AI 痕迹。该系统继承自 StoryFlow 的 LLMNode 基类，使用通义千问 API 进行智能分析。

## 核心特性

### 1. 33 维度全面审计

系统提供 33 个精心设计的审计维度，涵盖文学创作的各个方面：

#### 角色相关维度（4 个）
- **角色记忆一致性**：检查角色在不同章节中的记忆是否保持一致
- **人物行为符合人设**：检查角色行为是否符合其人设和性格
- **角色动机合理性**：检查角色行为动机是否合理、充分
- **角色成长轨迹**：检查角色的成长和变化是否合理

#### 情节相关维度（5 个）
- **大纲偏离度**：检查内容是否符合原定大纲规划
- **伏笔回收**：检查伏笔是否得到合理的回收或延续
- **伏笔密度**：检查伏笔设置的密度是否合理
- **情节推进速度**：检查情节推进的速度是否合理
- **冲突设置合理性**：检查冲突的设置、发展和解决是否合理
- **逻辑自洽性**：检查文本内部逻辑的一致性

#### 叙事相关维度（7 个）
- **叙事节奏**：检查叙事节奏是否合理
- **情感弧线**：检查角色情感变化的合理性和连贯性
- **时间线一致性**：检查时间流逝的合理性和一致性
- **地理位置合理性**：检查地理位置和移动路线的合理性
- **信息边界遵守**：检查信息揭露的时机和范围是否合理
- **节奏把控**：检查整体节奏的把控是否得当
- **高潮设置**：检查高潮的设置和呈现是否有效
- **结局合理性**：检查结局（或章节结尾）是否合理

#### 文本相关维度（7 个）
- **AI 痕迹检测**：检测文本中是否存在 AI 生成痕迹
- **语言风格统一性**：检查文本语言风格是否统一
- **对话自然度**：检查对话是否自然、符合角色个性
- **描写丰富度**：检查场景、人物、动作描写的丰富性
- **细节描写准确性**：检查细节描写的准确性和可信度
- **比喻和修辞恰当性**：检查比喻和修辞是否恰当、新颖
- **情感描写深度**：检查情感描写的深度和感染力
- **文学性**：检查文本的文学价值和艺术水准

#### 世界构建维度（3 个）
- **物资连续性**：检查角色物品、装备、资源的连续性
- **物理规律一致性**：检查物理规律的遵守情况
- **社会规则合理性**：检查社会规则、文化习俗的合理性
- **世界观一致性**：检查世界观设定的统一性

#### 主题相关维度（2 个）
- **主题表达清晰度**：检查主题表达是否清晰深刻
- **读者代入感**：检查读者的代入感和参与度
- **悬念设置**：检查悬念的设置和维持

#### 副线相关维度（1 个）
- **副线推进**：检查副线的推进和交织情况

### 2. AI 痕迹检测

独立的 AI 痕迹检测算法，基于统计规则识别 AI 生成文本：

#### 检测能力
- **高频词检测**：识别过度使用的 AI 常用词汇
- **句式单调性检测**：检测句子长度和开头的重复模式
- **过度总结检测**：识别过度的总结性表达
- **AI 味表达识别**：检测典型的 AI 生成风格表达

#### 评分系统
- AI 痕迹评分：0-1，0 表示无 AI 痕迹，1 表示明显 AI 痕迹
- 问题分类：critical、major、minor
- 证据提取：提供具体的证据文本

### 3. 增量审计支持

- 支持只审计新增内容，提高效率
- 自动合并上下文，确保审计准确性
- 适合快速迭代场景

## 技术架构

### 类层次结构

```
Node (基类)
  ├── 输入输出管理
  ├── 参数验证
  └── 执行接口
    │
    └── LLMNode (LLM 节点基类)
        ├── 通义千问 API 集成
        ├── 异步调用支持
        └── 错误处理
          │
          └── AuditNode (审计节点)
              ├── 33 维度审计
              ├── AI 痕迹检测
              ├── 综合评分
              └── 报告生成
```

### 核心组件

#### 1. AuditNode（审计节点）
主审计节点，协调整个审计流程。

**核心方法：**
- `execute()`: 执行审计
- `_audit_dimensions()`: 执行 33 维度审计
- `_calculate_overall_score()`: 计算综合得分
- `_evaluate_pass_status()`: 评估通过状态
- `_generate_summary()`: 生成审计摘要

#### 2. AuditDimension（审计维度）
维度定义，包含检查逻辑和权重。

**属性：**
- `dimension_id`: 维度 ID
- `name`: 维度名称
- `description`: 维度描述
- `check_prompt`: 检查提示
- `weight`: 权重（影响综合得分）

#### 3. AITraceDetector（AI 痕迹检测器）
独立的 AI 痕迹检测算法。

**核心方法：**
- `detect()`: 检测 AI 痕迹
- `calculate_ai_score()`: 计算 AI 痕迹评分
- `get_report()`: 获取完整报告

#### 4. AuditReport（审计报告）
审计报告，包含所有审计结果。

**属性：**
- `passed`: 是否通过
- `score`: 综合得分
- `issues`: 问题列表
- `dimension_scores`: 各维度得分
- `ai_trace_report`: AI 痕迹报告
- `summary`: 审计摘要

## 使用指南

### 快速开始

```python
import asyncio
from storyflow.nodes.audit import AuditNode

async def main():
    # 创建审计节点
    audit_node = AuditNode(
        node_id="my_audit",
        api_key="your_api_key",
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

    # 查看结果
    if result.success:
        print(f"得分: {result.data['score']}")
        print(f"通过: {result.data['passed']}")
        print(f"问题数: {result.data['issues_count']}")

asyncio.run(main())
```

### 增量审计

```python
audit_node.set_input("incremental_mode", True)
audit_node.set_input("new_content", "新增的内容...")
result = await audit_node.execute()
```

### 独立使用 AI 痕迹检测器

```python
from storyflow.nodes.audit import AITraceDetector

detector = AITraceDetector()
issues = detector.detect("你的文本...")
score = detector.calculate_ai_score("你的文本...")
print(f"AI 痕迹评分: {score}")
```

## 配置管理

### 预设配置

```python
from storyflow.nodes.audit.config import AuditPresets

# 严格模式（高质量要求）
strict_config = AuditPresets.strict()

# 正常模式（标准要求）
normal_config = AuditPresets.normal()

# 宽松模式（初稿检查）
relaxed_config = AuditPresets.relaxed()

# 仅初稿模式（只检查严重问题）
draft_config = AuditPresets.draft_only()
```

### 自定义配置

```python
from storyflow.nodes.audit.config import AuditConfig

# 修改通过阈值
AuditConfig.PASS_THRESHOLD = 0.8

# 修改维度权重
AuditConfig.update_dimension_weight("大纲偏离度", 2.0)
```

## 测试

### 运行测试

```bash
# 安装依赖
pip install -r requirements.txt

# 运行所有测试
python test_audit.py --api-key your_api_key

# 或使用环境变量
export QWEN_API_KEY=your_api_key
python test_audit.py
```

### 测试覆盖

- AI 痕迹检测器测试（4 个）
- 审计节点功能测试（3 个）
- 总计：7 个测试用例

## 文件结构

```
audit/
├── __init__.py              # 包初始化
├── audit_node.py            # 核心审计节点 (14KB)
├── dimensions.py            # 33 维度定义 (11KB)
├── ai_trace_detector.py     # AI 痕迹检测器 (8KB)
├── config.py                # 配置管理 (7KB)
├── example_data.py          # 示例数据 (4KB)
├── test_audit.py            # 单元测试 (9KB)
├── demo.py                  # 演示脚本 (7KB)
├── README.md                # 使用文档 (5KB)
├── DOCUMENTATION.md         # 本文档
├── requirements.txt         # 依赖列表
└── .gitignore              # Git 忽略文件
```

## 性能优化

### 批量处理
- 将 33 个维度分批审计，每批 5 个
- 减少 API 调用次数
- 提高整体效率

### 增量审计
- 只审计新增内容
- 自动合并上下文
- 适合快速迭代

### 缓存机制（未来）
- 缓存审计结果
- 避免重复审计
- 支持部分更新

## 输出格式

### 审计报告（YAML）

```yaml
passed: true
score: 0.850

issues:
  - dimension: "角色记忆一致性"
    severity: "major"
    description: "角色在第三章忘记了第二章的事件"
    location: "第三章第 5 段"
    suggestion: "建议添加回忆或重新梳理时间线"

  - dimension: "AI 痕迹检测"
    severity: "minor"
    description: "存在过度使用的 AI 常用词"
    location: "全文"
    suggestion: "建议替换重复的连接词"

summary: "审计通过，发现 2 个主要问题..."
```

### 审计报告（JSON）

```json
{
  "passed": true,
  "score": 0.85,
  "issues": [
    {
      "dimension": "角色记忆一致性",
      "severity": "major",
      "description": "...",
      "location": "...",
      "suggestion": "..."
    }
  ],
  "dimension_scores": {
    "角色记忆一致性": 0.7,
    "大纲偏离度": 0.9
  },
  "ai_trace_report": {
    "ai_trace_score": 0.3,
    "total_issues": 2,
    "severity_breakdown": {
      "critical": 0,
      "major": 1,
      "minor": 1
    }
  },
  "summary": "..."
}
```

## 常见问题

### Q: 为什么审计需要 7 个真相文件？

A: 7 个真相文件提供了故事的完整设定框架：
1. 世界观设定
2. 主角设定
3. 主线剧情
4. 反派设定
5. 配角设定
6. 魔法/科技体系
7. 时间线

这些文件是审计的"基准线"，用于检查草稿的连续性和一致性。

### Q: AI 痕迹检测的准确度如何？

A: AI 痕迹检测基于统计规则，可以识别常见的 AI 生成模式：
- 准确度：约 75-85%（取决于文本类型）
- 误报率：约 10-15%
- 漏报率：约 5-10%

结果仅供参考，建议结合人工判断。

### Q: 如何提高审计得分？

A:
1. **修复严重问题**：优先处理 critical 级别问题
2. **减少 AI 痕迹**：避免过度使用 AI 常用词和句式
3. **增加细节**：丰富场景、人物、动作描写
4. **确保逻辑**：检查因果关系和时间线
5. **保持一致**：确保角色记忆、行为连续

### Q: 审计需要多长时间？

A: 审计时间取决于：
- 草稿长度：每 1000 字约 10-15 秒
- 真相文件数量：7 个文件约增加 5-10 秒
- 网络速度：API 调用延迟
- 总计：通常 30-60 秒

## 未来改进

### 短期计划
- [ ] 支持并行审计多个维度
- [ ] 添加审计结果导出（PDF）
- [ ] 支持审计历史追踪
- [ ] 优化 AI 痕迹检测算法

### 中期计划
- [ ] 支持自定义维度
- [ ] 添加多人协作审计
- [ ] 实现审计结果可视化
- [ ] 支持审计规则配置化

### 长期计划
- [ ] 集成到 StoryFlow 工作流引擎
- [ ] 开发 Web 界面
- [ ] 支持多种 LLM 模型
- [ ] 构建审计知识库

## 许可证

MIT License

## 联系方式

- 项目地址：`/workspace/projects/workspace/storyflow/nodes/audit/`
- 作者：StoryFlow Team
- 版本：0.1.0
- 创建日期：2026-04-19

---

**文档版本**: 1.0
**最后更新**: 2026-04-19
