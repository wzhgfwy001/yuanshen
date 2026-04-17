---
name: task-decomposer
description: 任务分解器，将复杂创新任务分解为可执行子任务，确定子Agent角色和执行顺序
parent: dynamic-multi-agent-system
version: 1.0.0
---

# task-decomposer

**【分裂残渣】Split — 任务分解器** - 

## 功能

将复杂创新任务分解为可执行的子任务，确定子Agent角色和执行顺序，输出任务依赖图。

## 分解要素

### 1. 任务目标

**问题：** 最终要做什么？

**分析维度：**
- 输出类型（文本、代码、报告、方案）
- 输出规模（字数、模块数、页数）
- 质量标准（专业级、草稿级）

**示例：**
```
任务："写一本10章的悬疑小说"
目标分析：
- 输出类型：小说文本
- 输出规模：10章，约10000字
- 质量标准：可发表级别
```

---

### 2. 任务背景

**问题：** 为什么做？为谁做？

**分析维度：**
- 用户需求背景
- 目标受众
- 使用场景

**示例：**
```
任务："设计公司管理体系"
背景分析：
- 用户需求：初创公司需要规范化管理
- 目标受众：公司管理层和员工
- 使用场景：日常运营和决策参考
```

---

### 3. 任务约束

**问题：** 有什么限制条件？

**约束类型：**
- 时间约束（截止时间、执行时长）
- 格式约束（输出格式、结构要求）
- 质量约束（专业度、准确性）
- 资源约束（可用信息、工具限制）

**示例：**
```
任务约束：
- 时间：2小时内完成
- 格式：Markdown文档
- 质量：专业级，需要数据支撑
- 资源：仅使用公开信息
```

---

### 4. 相关资料

**问题：** 需要什么输入？

**输入类型：**
- 用户提供的内容（文档、数据、参考）
- 需要搜索的信息
- 需要调用的外部资源

**示例：**
```
需要输入：
- 用户提供：产品需求文档
- 需要搜索：竞品分析报告
- 需要调用：行业数据库
```

---

## 分解原则

> **【Goal-Driven Execution】分解任务时必须定义成功标准**
> - 每个子任务必须有明确的"完成定义"
> - 最终交付物必须有可验证的验收条件
> - 多步骤任务分解前先声明：Step → verify → check

### 1. 正交性

**原则：** 不同子Agent的任务不重叠

**检查方法：**
- 每个子任务有明确的输入输出
- 子任务之间无重复工作
- 责任边界清晰

**示例：**
```
✅ 正确分解：
- 搜索Agent：收集素材
- 大纲Agent：设计结构
- 写作Agent：撰写内容

❌ 错误分解：
- Agent1：收集素材并撰写
- Agent2：收集素材并设计结构
（素材收集工作重复）
```

---

### 2. 依赖性

**原则：** 明确前后依赖关系

**依赖类型：**
- 串行依赖：B需要A的输出
- 并行独立：A和B可同时进行
- 汇聚依赖：C需要A和B的输出

**依赖图示例：**
```
    搜索Agent
         │
         ↓
    大纲Agent
         │
         ↓
    写作Agent
         │
         ↓
    审查Agent
```

---

### 3. 接口标准化

**原则：** 子Agent之间通过结构化数据交换

**标准接口格式：**
```json
{
  "from": "agent-id",
  "to": "agent-id",
  "type": "data-transfer",
  "content-type": "application/json",
  "content": {...},
  "metadata": {
    "timestamp": "...",
    "checksum": "..."
  }
}
```

---

## 分解算法

### 步骤1：任务理解

```
输入：任务描述 + 分类结果
输出：任务理解报告

分析维度：
1. 核心动词（做什么）
2. 核心名词（对象是什么）
3. 修饰词（如何做、做成什么样）
4. 约束条件（限制是什么）
```

### 步骤2：维度识别

```
输入：任务理解报告
输出：任务维度列表

维度类型：
- 内容维度（写什么）
- 结构维度（如何组织）
- 风格维度（什么调性）
- 技术维度（什么技术/方法）
- 质量维度（什么标准）
```

### 步骤3：角色映射

```
输入：任务维度列表
输出：子Agent角色列表

映射规则：
- 内容维度 → 内容专家
- 结构维度 → 架构/大纲专家
- 风格维度 → 写作专家
- 技术维度 → 技术专家
- 质量维度 → 审查专家
```

### 步骤4：依赖分析

```
输入：子Agent角色列表
输出：依赖图（DAG）

分析方法：
1. 识别每个角色的输入需求
2. 识别每个角色的输出内容
3. 建立输入输出匹配关系
4. 构建有向无环图
```

### 步骤5：执行规划

```
输入：依赖图
输出：执行计划

规划内容：
1. 并行组划分
2. 串行顺序确定
3. 预计执行时间
4. 关键路径识别
```

---

## 输出格式

```json
{
  "task-id": "uuid",
  "original-task": "任务描述",
  "subtasks": [
    {
      "id": "subtask-1",
      "name": "素材收集",
      "agent-role": "搜索专家",
      "description": "搜索和整理相关信息",
      "input": [],
      "output": "素材包（JSON）",
      "estimated-time": 60,
      "model": "qwen3.5-plus"
    },
    {
      "id": "subtask-2",
      "name": "大纲设计",
      "agent-role": "大纲专家",
      "description": "设计故事结构和章节规划",
      "input": ["subtask-1.output"],
      "output": "大纲（JSON）",
      "estimated-time": 120,
      "model": "qwen3.5-plus"
    }
  ],
  "dependency-graph": {
    "nodes": ["subtask-1", "subtask-2"],
    "edges": [
      {"from": "subtask-1", "to": "subtask-2"}
    ],
    "parallel-groups": [
      ["subtask-1"],
      ["subtask-2"]
    ]
  },
  "execution-plan": {
    "total-estimated-time": 180,
    "critical-path": ["subtask-1", "subtask-2"],
    "parallelism-degree": 1
  }
}
```

---

## 分解模板库

### 模板1：创意写作

```
任务类型：小说/文章创作
标准分解：
1. 素材收集（搜索Agent）
2. 大纲设计（大纲Agent）
3. 内容撰写（写作Agent）
4. 质量审查（审查Agent）

依赖关系：1→2→3→4
预计时间：300-600秒
```

### 模板2：数据分析

```
任务类型：数据分析报告
标准分解：
1. 数据获取（数据Agent）
2. 数据清洗（清洗Agent）
3. 数据分析（分析Agent）
4. 可视化（图表Agent）
5. 报告撰写（写作Agent）

依赖关系：1→2→3→4→5
预计时间：400-800秒
```

### 模板3：代码开发

```
任务类型：软件开发
标准分解：
1. 需求分析（需求Agent）
2. 架构设计（架构Agent）
3. 前端开发（前端Agent）
4. 后端开发（后端Agent）
5. 测试（测试Agent）

依赖关系：1→2→(3,4)→5
预计时间：600-1200秒
```

### 模板4：完整工程团队开发（增强）

```
任务类型：全套工程团队任务
触发条件：检测到 FULL_TEAM_TRIGGERS 关键词

触发关键词列表：
- "开发应用"、"开发系统"、"开发平台"
- "完整开发"、"全套开发"、"整个工程"
- "app开发"、"application开发"
- "开发一个XXX"、"搭建一个XXX"
- "从零开始开发"、"全新项目"

标准分解（全部11个engineering Agent）：
1. 需求分析（Product Manager）
2. 架构设计（Software Architect）
3. 安全设计（Security Engineer）
4. 数据库设计（Database Optimizer）
5. 后端开发（Backend Architect + Senior Developer）
6. 前端开发（Frontend Developer）
7. API设计（Backend Architect）
8. DevOps部署（DevOps Automator）
9. 代码审查（Code Reviewer）
10. 质量测试（Tester）
11. 集成开发（Senior Developer）

依赖关系：
1→2→3→4→5→6→7→8→9→10→11
或
1→2→(3,4,5,6)→7→8→9→10→11

预计时间：1200-3000秒

特殊逻辑：
- 当检测到 FULL_TEAM_TRIGGERS 时，绕过智能筛选
- 自动加载该领域全部Agent
- 不再进行"相关性分析"剪枝
```

---

## 复杂度评估

### 计算公式

```
复杂度 = 维度数 × 平均维度复杂度 × 依赖深度

维度数：任务涉及的独立维度数量
平均维度复杂度：1-5分
依赖深度：最长依赖链的长度
```

### 复杂度等级

| 复杂度分数 | 等级 | 子Agent数量 |
|------------|------|-------------|
| 1-5 | 简单 | 1-2个 |
| 6-15 | 中等 | 3个 |
| 16-30 | 复杂 | 4-6个 |
| 30+ | 极复杂 | 6+个（建议拆分任务） |

---

## 异常处理

### 无法分解

**现象：** 任务描述模糊，无法识别维度

**处理：**
1. 向用户提问澄清
2. 提供分解建议选项
3. 等待用户确认后继续

### 过度复杂

**现象：** 复杂度>30，子Agent>6

**处理：**
1. 建议拆分为多个独立任务
2. 提供拆分方案
3. 等待用户确认

---

## Agency Agent 知识注入

### 触发条件

当任务分类结果包含 `requiresAgencyAgent: true` 时执行知识注入。

### 注入流程

```
1. 读取 classification.agency-agent.name
2. 调用 agency-registry/loader.ts 的 parseAgentFile()
3. 提取 Agent 的 sections（Identity/Rules/Deliverables/Workflow）
4. 在每个子Agent的prompt中注入专业知识
```

### prompt注入模板

```typescript
import { parseAgentFile, injectAgentKnowledge } from '../agency-registry/loader';

// 注入专业知识到子Agent
function enhanceSubtaskPrompt(subtask: SubTask, agencyAgentName: string): SubTask {
  // 读取Agent文件
  const agentPath = path.join(
    process.env.AGENCY_ROOT || '',
    'marketing',
    `${agencyAgentName}.md`
  );
  const agent = parseAgentFile(agentPath);
  
  if (!agent) return subtask;
  
  // 增强prompt
  const enhancedPrompt = injectAgentKnowledge(subtask.prompt, agent, {
    includeIdentity: true,
    includeRules: true,
    includeDeliverables: true,
    includeWorkflow: true,
  });
  
  return {
    ...subtask,
    prompt: enhancedPrompt,
    agencyAgent: agent.name,
  };
}
```

### 注入后的prompt结构

```
你是「{阳神角色}」，负责{职责描述}。

[Agency Agent 专业知识]
## 身份与思维
{从Agency Agent提取的Identity}

## 关键规则
{从Agency Agent提取的Critical Rules}

## 交付标准
{从Agency Agent提取的Deliverables}

## 工作流程
{从Agency Agent提取的Workflow Process}

## 任务目标
{具体目标}

## 输出要求
{格式要求}
```

### 示例：小红书运营任务

```json
{
  "subtask": {
    "id": "subtask-1",
    "name": "内容策划",
    "agent-role": "内容专家",
    "prompt": "你是「文字炼金师」，负责撰写小红书内容..."
  },
  "agency-agent": {
    "name": "marketing-xiaohongshu-specialist",
    "enhanced-prompt": "你是「文字炼金师」，负责撰写小红书内容...\n\n[Agency Agent 专业知识]\n## 身份与思维\n你是一个小红书营销专家...\n\n## 关键规则\n- 保持70%有机生活内容...\n\n## 交付标准\n- 30天内容日历..."
  }
}
```

---

## 与其他组件的接口

### 输入

- 来自：任务分类器 / 主Agent
- 格式：`{ task: string, classification: TaskClassificationResult }`

### 输出

- 到：队伍组建器 / 执行协调器
- 格式：`TaskDecompositionResult`（见上方输出格式）

---

## 标准交付物输出格式

本SKILL执行完毕后，必须输出以下格式的交付物：

```json
{
  "task": "分解任务描述",
  "result": {
    "summary": "简要结果（1-2句话）",
    "details": "详细分解结果，包括子任务数和依赖关系",
    "data": {
      "taskId": "uuid",
      "originalTask": "任务描述",
      "subtasks": [...],
      "dependencyGraph": {...},
      "executionPlan": {
        "totalEstimatedTime": 480,
        "criticalPath": ["素材收集", "大纲设计", "内容撰写", "质量审查"],
        "parallelismDegree": 1
      }
    }
  },
  "quality": {
    "completeness": 90,
    "accuracy": 88,
    "readability": 85
  },
  "issues": ["依赖深度较大，单点故障风险"],
  "suggestions": ["可考虑将素材收集与大纲设计并行"]
}
```

---

## 测试用例

### 测试1：小说创作分解

```
输入："写一本10章的悬疑小说，暴风雪山庄模式"
预期输出：
- 4个子任务（案件设计、大纲、写作、审查）
- 依赖关系：串行
- 预计时间：600秒
```

### 测试2：数据分析分解

```
输入："分析销售数据，生成报告"
预期输出：
- 5个子任务（获取、清洗、分析、可视化、报告）
- 依赖关系：串行
- 预计时间：500秒
```

### 测试3：Agency Agent知识注入

```
输入："写一个小红书运营方案"
classification.agency-agent.name = "marketing-xiaohongshu-specialist"
预期输出：
- 子任务prompt包含Agency Agent专业知识
- 包含Identity/Rules/Deliverables/Workflow
```


## ?? �������

### ����ֽ�ʱ
- **��� success_pattern**���ο���������ķֽⷽʽ
- **��� failure_lesson**������֮ǰʧ�ܵķֽ�ģʽ
- **��¼�ֽ����**�������ֽ�˼·����������

### ���÷�ʽ
const memory = require('../memory-manager/memory');

// ��ȡ��سɹ�ģʽ
const successPatterns = memory.getRelevant({ type: taskType });

// ��ȡʧ�ܽ�ѵ
const failures = memory.search('failure_lesson');

