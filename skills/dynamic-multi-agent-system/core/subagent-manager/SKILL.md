---
name: subagent-manager
description: 子Agent管理器，根据任务分解结果动态创建子Agent，分配模型和职责
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 子Agent管理器 (SubAgent Manager)

## 功能

根据任务分解结果，动态创建子Agent，分配模型和职责，管理子Agent生命周期。

## 子Agent创建规则

### 数量决策

基于任务分解器的输出，按以下规则确定子Agent数量：

| 任务类型 | 维度数 | 子Agent数量 | 示例 |
|----------|--------|-------------|------|
| 简单 | 1-2 | 1-2 | 短篇故事、翻译 |
| 中等 | 2-3 | 3 | 中篇小说、分析报告 |
| 复杂 | 4+ | 4-6 | 长篇小说、完整项目 |

### 角色分配原则

1. **专业匹配**：子任务类型与Agent专业能力匹配
2. **负载均衡**：避免单一Agent承担过多任务
3. **依赖优化**：有依赖关系的子任务分配给不同Agent
4. **模型适配**：根据任务难度分配不同能力的模型

---

## 模型选择策略

### 模型能力矩阵

| 模型 | 写作 | 推理 | 代码 | 分析 | 速度 |
|------|------|------|------|------|------|
| qwen3.5-plus | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| qwen3-max | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| qwen3-coder-plus | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| MiniMax-M2.5 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 选择规则

```
if 任务类型 == "创意写作":
    model = "qwen3.5-plus"
elif 任务类型 == "复杂推理":
    model = "qwen3-max"
elif 任务类型 == "代码开发":
    model = "qwen3-coder-plus"
elif 任务类型 == "快速执行":
    model = "MiniMax-M2.5"
else:
    model = "qwen3.5-plus"  # 默认
```

---

## 子Agent创建语法

### OpenClaw sessions_spawn

```json
{
  "task": "子Agent的具体任务描述",
  "label": "agent-角色名称-序号",
  "model": "模型名称",
  "cleanup": "delete",
  "mode": "run",
  "runTimeoutSeconds": 300,
  "thread": true
}
```

### 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| task | string | 子Agent的具体任务，包含输入输出要求 |
| label | string | Agent标识，格式：agent-角色-序号 |
| model | string | 使用的模型 |
| cleanup | "delete" | 任务完成后自动删除 |
| mode | "run" | 一次性执行模式 |
| runTimeoutSeconds | number | 超时时间（秒） |
| thread | boolean | 是否绑定线程 |

---

## 子Agent任务描述模板

### 通用模板

```
你是一名"{角色名称}"，负责{职责描述}。

## 任务目标
{具体目标}

## 输入
{输入内容或引用前序Agent输出}

## 输出要求
- 格式：{输出格式}
- 内容：{内容要求}
- 质量：{质量标准}

## 约束条件
- 时间：{时间要求}
- 其他：{其他约束}

## 自我检查
完成任务后，请进行自我检查：
- [ ] 是否完成所有要求
- [ ] 输出格式是否正确
- [ ] 内容质量是否达标
```

### 示例：写作Agent

```
你是一名"写作专家"，负责撰写小说章节内容。

## 任务目标
根据提供的大纲，撰写第1章内容，约1000字。

## 输入
- 大纲：{大纲内容}
- 素材：{素材包}
- 风格要求：科幻写实风格

## 输出要求
- 格式：Markdown文本
- 内容：完整的第1章，包含场景描写、对话、情节推进
- 质量：文笔流畅，逻辑连贯，符合大纲设定

## 约束条件
- 字数：1000字左右（±10%）
- 时间：5分钟内完成

## 自我检查
完成任务后，请进行自我检查：
- [ ] 字数是否符合要求
- [ ] 情节是否符合大纲
- [ ] 文风是否一致
- [ ] 有无逻辑漏洞
```

---

## 生命周期管理

### 创建阶段

```
1. 接收任务分解结果
2. 为每个子任务创建子Agent
3. 分配模型和任务描述
4. 记录子Agent元数据
```

### 执行阶段

```
1. 按依赖顺序启动子Agent
2. 监控执行状态
3. 处理超时和异常
4. 收集输出结果
```

### 清理阶段

```
1. 任务完成后删除子Agent
2. 释放资源
3. 记录执行日志
4. 更新Skill计数
```

---

## 状态管理

### 子Agent状态

| 状态 | 说明 | 转换 |
|------|------|------|
| pending | 等待创建 | → creating |
| creating | 正在创建 | → running / failed |
| running | 正在执行 | → completed / failed / timeout |
| completed | 执行完成 | → cleaning |
| failed | 执行失败 | → retrying / cleaning |
| timeout | 执行超时 | → retrying / cleaning |
| cleaning | 正在清理 | → deleted |

### 状态流转图

```
pending → creating → running → completed → cleaning → deleted
                    ↓          ↓          ↓
                  failed    timeout    failed
                    ↓          ↓
                 retrying → (重新进入running)
```

---

## 异常处理

### 创建失败

**现象：** sessions_spawn返回错误

**处理流程：**
```
1. 记录错误信息
2. 重试1-2次（间隔5秒）
3. 仍失败则降级：
   - 减少子Agent数量
   - 合并子任务
   - 主Agent接手
4. 记录到异常日志
```

### 执行超时

**现象：** 超过runTimeoutSeconds未完成

**处理流程：**
```
1. 终止子Agent
2. 分析超时原因
3. 决策：
   - 简单任务：主Agent接手
   - 复杂任务：重试（增加超时时间）
4. 记录到异常日志
```

### 输出质量差

**现象：** 自检不通过或主Agent判断质量差

**处理流程：**
```
1. 提供具体反馈
2. 要求重新执行（最多3次）
3. 仍不通过则：
   - 更换模型重试
   - 主Agent接手
4. 记录到异常日志
```

---

## 资源控制

### 并发限制

```yaml
max-concurrent-tasks: 3      # 最多3个主任务并行
max-sub-agents-per-task: 6   # 单任务最多6个子Agent
max-total-sub-agents: 12     # 系统总共最多12个子Agent
```

### 优先级调度

```
优先级计算：
priority = base_priority + user_priority + time_priority

base_priority: 交互式任务 > 后台任务
user_priority: 用户指定的优先级
time_priority: 等待时间越长优先级越高
```

---

## 输出格式

### 创建结果

```json
{
  "task-id": "uuid",
  "agents-created": [
    {
      "agent-id": "agent-search-001",
      "role": "搜索专家",
      "model": "qwen3.5-plus",
      "status": "running",
      "session-key": "session-xxx",
      "created-at": "2026-04-03T10:00:00"
    }
  ],
  "execution-order": [
    ["agent-search-001"],
    ["agent-outline-001"],
    ["agent-writing-001"]
  ],
  "estimated-completion": "2026-04-03T10:10:00"
}
```

---

## 与其他组件的接口

### 输入

- 来自：任务分解器
- 格式：`TaskDecompositionResult`

### 输出

- 到：执行协调器
- 格式：`SubAgentCreationResult`（见上方输出格式）

---

## 记忆与追踪

### Agent执行记录

```json
{
  "agent-id": "agent-search-001",
  "task-id": "task-001",
  "role": "搜索专家",
  "model": "qwen3.5-plus",
  "created-at": "2026-04-03T10:00:00",
  "completed-at": "2026-04-03T10:02:00",
  "status": "success",
  "iterations": 1,
  "quality-score": 5
}
```

### 统计信息

定期（每次任务完成后）更新：
- 总创建Agent数
- 成功率统计
- 平均执行时间
- 模型使用分布
