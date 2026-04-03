---
name: skill-evolution
description: Skill进化分析器，跟踪任务执行效果，成功3次的流程固化为正式Skill
parent: dynamic-multi-agent-system
version: 1.0.0
---

# Skill进化分析器 (Skill Evolution Analyzer)

## 功能

跟踪任务执行效果，分析成功模式，当相同类型任务成功3次后，触发Skill固化流程。

## 进化流程

```
任务执行完成
    ↓
收集执行数据
    ↓
更新Skill计数
    ↓
计数 >= 3?
    ├─ 否 → 等待下次任务
    └─ 是 → 触发固化流程
            ↓
        用户确认
            ↓
        固化到Skill
            ↓
        更新版本
```

---

## 数据收集

### 执行数据

每次任务完成后收集：

```json
{
  "task-id": "task-001",
  "task-type": "sci-fi-writing",
  "timestamp": "2026-04-03T11:00:00",
  "execution-result": {
    "status": "success",
    "user-satisfaction": 5,
    "total-time": 600,
    "sub-agents-used": 4,
    "iterations": 2,
    "errors": 0,
    "modifications": 1
  },
  "quality-metrics": {
    "first-pass-rate": 0.75,
    "avg-modifications": 1.0,
    "reviewer-score": 4.5
  },
  "flow": {
    "agents": ["搜索", "大纲", "写作", "审查"],
    "execution-order": "serial",
    "parallel-groups": 1
  }
}
```

### 用户反馈数据

任务完成后自动收集：

```json
{
  "task-id": "task-001",
  "satisfaction-score": 5,
  "feedback-text": "很好，符合要求",
  "would-reuse": true,
  "suggestions": "无",
  "timestamp": "2026-04-03T11:05:00"
}
```

---

## Skill计数追踪

### 计数结构

```json
{
  "skills": {
    "sci-fi-writing": {
      "version": "1.0",
      "count": 2,
      "last-success": "2026-04-03T10:00:00",
      "executions": [
        {
          "task-id": "task-001",
          "date": "2026-04-03T09:00:00",
          "result": "success",
          "satisfaction": 5,
          "errors": 0
        },
        {
          "task-id": "task-002",
          "date": "2026-04-03T10:00:00",
          "result": "success",
          "satisfaction": 5,
          "errors": 0
        }
      ],
      "ready-for-evolution": false,
      "evolution-threshold": 3
    }
  }
}
```

### 计数规则

| 条件 | 操作 |
|------|------|
| 任务成功 + 满意度≥4 | count++ |
| 任务成功 + 满意度<4 | 不计入（需要改进） |
| 任务失败 | 不计入，记录错误 |
| 有重大修改（≥3次） | 不计入（流程不成熟） |

### 计数存储

- 位置：`./state/skill-counters.json`
- 更新时机：每次任务完成后立即写入
- 持久化：JSON文件，避免丢失

---

## 固化触发条件

### 必须满足的条件

1. **执行次数**：相同类型任务成功≥3次
2. **用户满意度**：平均满意度≥4分
3. **错误率**：无重大错误（错误率<10%）
4. **流程稳定**：子Agent角色和顺序一致

### 可选条件

- 执行时间稳定（波动<50%）
- 修改次数稳定（平均<2次）
- 用户主动确认固化

---

## 固化流程

### 步骤1：触发通知

```
【Skill固化通知】

任务类型：{task-type}
成功次数：{count}次
平均满意度：{avg-satisfaction}分

该流程已满足固化条件，是否固化为正式Skill？

选项：
1. 确认固化（创建正式Skill）
2. 再观察几次（继续计数）
3. 不固化（重置计数）
```

### 步骤2：固化内容

固化以下内容到Skill：

1. **标准执行流程**
   - 子Agent角色列表
   - 执行顺序
   - 依赖关系

2. **审查功能**
   - 检查清单
   - 质量标准
   - 常见问题

3. **经验库**
   - 历史错误及解决方案
   - 最佳实践
   - 优化建议

### 步骤3：版本管理

```
版本命名规则：
- 主版本：重大变更（流程重构）
- 次版本：功能增加（新环节）
- 修订版：小优化（检查清单更新）

示例：
v1.0 → v1.1 → v1.2 → v2.0
```

### 步骤4：Skill文件生成

生成标准Skill文件结构：

```
{skill-name}/
├── SKILL.md           # Skill定义
├── manifest.json      # 元数据
├── flow.json          # 执行流程
├── checklists/        # 检查清单
│   └── quality-checklist.md
└── examples/          # 使用示例
```

---

## 进化策略

### 完善现有Skill

**触发条件：** 差异<50%

**操作：**
- 调整参数
- 优化检查清单
- 更新经验库
- 升级次版本

### 创建新Skill分支

**触发条件：** 差异>50%

**操作：**
- 创建新Skill文件
- 定义新流程
- 独立计数
- 升级主版本

### 仅计数不创建

**触发条件：** 差异<10%

**操作：**
- 仅增加计数
- 用于统计分析
- 了解任务频率

---

## 差异分析算法

### 流程差异计算

```
流程差异 = (不同环节数 / 总环节数) × 100%

示例：
现有流程：[搜索, 大纲, 写作, 审查]
新流程：[搜索, 大纲, 写作, 审查, 技术顾问]
差异 = (1 / 5) × 100% = 20%
```

### 角色差异计算

```
角色差异 = (不同角色数 / 总角色数) × 100%

示例：
现有角色：[搜索专家, 大纲专家, 写作专家]
新角色：[搜索专家, 大纲专家, 写作专家, 技术顾问]
差异 = (1 / 4) × 100% = 25%
```

### 综合差异

```
综合差异 = (流程差异 × 0.6) + (角色差异 × 0.4)

决策：
- <10%: 仅计数
- 10-50%: 完善现有Skill
- >50%: 创建新分支
```

---

## 经验库管理

### 经验结构

```json
{
  "skill-name": "sci-fi-writing",
  "experiences": [
    {
      "id": "exp-001",
      "type": "success-pattern",
      "description": "先收集素材再设计大纲效果更好",
      "confidence": 0.9,
      "occurrences": 3
    },
    {
      "id": "exp-002",
      "type": "common-error",
      "description": "世界观设定容易前后矛盾",
      "solution": "在大纲阶段增加世界观检查环节",
      "occurrences": 2
    }
  ]
}
```

### 经验类型

| 类型 | 说明 | 用途 |
|------|------|------|
| success-pattern | 成功模式 | 优化流程 |
| common-error | 常见错误 | 预防问题 |
| optimization | 优化建议 | 提升效率 |
| user-preference | 用户偏好 | 个性化调整 |

---

## 与其他组件的接口

### 输入

- 来自：主Agent / 反思改进器
- 格式：`TaskExecutionResult`

### 输出

- 到：主Agent / Skill库
- 格式：`SkillEvolutionResult`

```json
{
  "skill-name": "sci-fi-writing",
  "action": "count-only|update|create-new",
  "new-count": 3,
  "ready-for-evolution": true,
  "suggested-changes": ["增加技术顾问角色"],
  "version-bump": "minor"
}
```

---

## 记忆持久化

### 存储位置

- Skill计数：`./state/skill-counters.json`
- 经验库：`./state/experience-db.json`
- 执行日志：`./state/execution-logs/`

### 备份策略

- 每次更新后备份
- 保留最近10个版本
- 支持回滚

---

## 测试用例

### 测试1：计数增加

```
输入：任务成功，满意度5分
预期：count++
```

### 测试2：触发固化

```
输入：count=3，满意度>=4，无重大错误
预期：触发固化通知
```

### 测试3：差异分析

```
输入：现有流程[A,B,C]，新流程[A,B,C,D]
预期：差异25%，完善现有Skill
```
