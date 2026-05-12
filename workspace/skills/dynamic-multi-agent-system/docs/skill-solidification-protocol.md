# Skill 固化追踪器 v1.0

## 概述

Skill 固化追踪器负责系统的持续进化，将成功经验沉淀为可复用的 Skill：
- ✅ 跟踪任务执行次数
- ✅ 识别可固化模式（3 次成功 → 可固化）
- ✅ 分析成功要素
- ✅ 生成固化建议
- ✅ 版本管理（v1.0 → v1.1 → v2.0）

---

## 固化流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      Skill 固化流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  任务执行 → 记录经验 → 计数 +1 → 检查阈值 → 分析模式            │
│                                                   │             │
│                                                   ▼             │
│  用户确认 ← 生成建议 ← 提取共性 ← 达到 3 次                        │
│     │                                              │            │
│     │                                              │            │
│     ▼                                              ▼            │
│  固化成功                                      继续积累         │
│  版本升级                                      (4 次、5 次...)   │
│  v1.0 → v1.1                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心概念

### 技能生命周期

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   探索期     │ ──► │   成长期     │ ──► │   成熟期     │
│  (0-2 次)     │     │  (3-5 次)     │     │  (6 次+)      │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
  无固化资格          可固化 (需确认)        已固化/推荐固化
  记录经验            生成建议              版本迭代
```

### 固化阈值

| 阶段 | 成功次数 | 状态 | 说明 |
|------|----------|------|------|
| **探索期** | 0-2 次 | 积累中 | 记录经验，不触发固化 |
| **成长期** | 3-5 次 | 可固化 | 生成固化建议，等待用户确认 |
| **成熟期** | 6 次+ | 已固化 | 持续优化，版本迭代 |

### 成功判定

```javascript
function isSuccessfulTask(task) {
  // 基本条件
  if (task.status !== 'completed') return false
  if (task.userScore < 4) return false  // 用户评分 <4 分
  
  // 质量检查
  if (task.qualityIssues > 3) return false  // 超过 3 个质量问题
  
  // 时效性
  if (task.actualDuration > task.estimatedDuration * 2) return false  // 超时 2 倍
  
  return true
}
```

---

## 数据结构

### 经验记录 (Experience Record)

```json
{
  "id": "exp-001",
  "task-id": "task-sci-fi-001",
  "task-type": "standard",
  "task-description": "创作科幻短篇小说",
  "date": "2026-04-04T19:00:00Z",
  "outcome": "success",
  "user-score": 5,
  "quality-score": 92,
  
  "workflow": [
    {"step": 1, "module": "task-classifier", "result": "standard"},
    {"step": 2, "module": "task-decomposer", "agents": ["世界观设计师", "大纲规划师", "内容创作者", "质量审查员"]},
    {"step": 3, "module": "executor-coordinator", "duration": 70},
    {"step": 4, "module": "quality-checker", "score": 92}
  ],
  
  "agents-used": [
    {"role": "世界观设计师", "count": 1},
    {"role": "大纲规划师", "count": 1},
    {"role": "内容创作者", "count": 1},
    {"role": "质量审查员", "count": 1}
  ],
  
  "metrics": {
    "total-duration-minutes": 70,
    "output-words": 892,
    "subagent-count": 4,
    "retry-count": 0
  },
  
  "lessons-learned": [
    "串行流程适合小型创作任务",
    "世界观设定为创作提供丰富细节支撑",
    "三层质量检查有效保障输出质量"
  ],
  
  "tags": ["科幻", "短篇", "创作", "北京"],
  
  "can-solidify": false,
  "solidify-count": 1,
  "solidify-threshold": 3
}
```

### 技能模式 (Skill Pattern)

```json
{
  "pattern-id": "pattern-sci-fi-writing",
  "name": "科幻创作",
  "category": "creative-writing",
  "first-seen": "2026-04-04",
  "last-seen": "2026-04-04",
  "execution-count": 1,
  "success-count": 1,
  "fail-count": 0,
  "avg-quality-score": 92,
  "avg-user-score": 5,
  "avg-duration-minutes": 70,
  
  "common-workflow": [
    "task-classifier",
    "task-decomposer",
    "executor-coordinator",
    "quality-checker"
  ],
  
  "common-agents": [
    {"role": "世界观设计师", "frequency": 1.0},
    {"role": "大纲规划师", "frequency": 1.0},
    {"role": "内容创作者", "frequency": 1.0},
    {"role": "质量审查员", "frequency": 1.0}
  ],
  
  "success-factors": [
    "世界观设定详细",
    "大纲结构清晰",
    "三层质量检查"
  ],
  
  "common-issues": [],
  
  "solidify-status": "accumulating",
  "solidify-progress": "1/3",
  
  "version": null,
  "solidified-at": null
}
```

### 固化技能 (Solidified Skill)

```json
{
  "skill-id": "skill-sci-fi-writing-v1.0",
  "pattern-id": "pattern-sci-fi-writing",
  "name": "科幻创作 v1.0",
  "version": "1.0",
  "created-at": "2026-04-05T10:00:00Z",
  "updated-at": "2026-04-05T10:00:00Z",
  
  "workflow": {
    "steps": [
      {
        "id": 1,
        "name": "任务分类",
        "module": "task-classifier",
        "expected-output": "standard"
      },
      {
        "id": 2,
        "name": "任务分解",
        "module": "task-decomposer",
        "agents": ["世界观设计师", "大纲规划师", "内容创作者", "质量审查员"],
        "dependencies": [1]
      },
      {
        "id": 3,
        "name": "执行协调",
        "module": "executor-coordinator",
        "execution-mode": "serial",
        "dependencies": [2]
      },
      {
        "id": 4,
        "name": "质量检查",
        "module": "quality-checker",
        "min-score": 85,
        "dependencies": [3]
      }
    ]
  },
  
  "config": {
    "estimated-duration-minutes": 70,
    "recommended-agents": 4,
    "min-quality-score": 85
  },
  
  "metrics": {
    "based-on-tasks": 3,
    "avg-quality-score": 91.3,
    "avg-user-score": 4.7,
    "success-rate": 1.0
  },
  
  "status": "active"
}
```

---

## API 协议

### 1. 记录任务经验

**接口：** `recordExperience(taskResult)`

**请求：**
```json
{
  "action": "record-experience",
  "task": {
    "id": "task-sci-fi-001",
    "type": "standard",
    "description": "创作科幻短篇小说",
    "status": "completed",
    "user-score": 5,
    "quality-score": 92,
    "workflow": [...],
    "agents-used": [...],
    "metrics": {...}
  }
}
```

**响应：**
```json
{
  "success": true,
  "experience-id": "exp-001",
  "pattern-id": "pattern-sci-fi-writing",
  "solidify-progress": "1/3",
  "message": "经验已记录，再积累 2 次成功可固化"
}
```

---

### 2. 查询技能模式

**接口：** `getPattern(patternId)`

**请求：**
```json
{
  "action": "get-pattern",
  "pattern-id": "pattern-sci-fi-writing"
}
```

**响应：**
```json
{
  "success": true,
  "pattern": {
    "name": "科幻创作",
    "execution-count": 3,
    "success-count": 3,
    "avg-quality-score": 91.3,
    "solidify-status": "ready",
    "solidify-progress": "3/3"
  }
}
```

---

### 3. 获取可固化列表

**接口：** `getSolidifiablePatterns()`

**响应：**
```json
{
  "success": true,
  "patterns": [
    {
      "pattern-id": "pattern-sci-fi-writing",
      "name": "科幻创作",
      "execution-count": 3,
      "avg-quality-score": 91.3,
      "recommendation": "建议固化，3 次执行均成功，质量稳定"
    },
    {
      "pattern-id": "pattern-data-analysis",
      "name": "数据分析",
      "execution-count": 4,
      "avg-quality-score": 88.5,
      "recommendation": "建议固化，4 次执行 3 次成功"
    }
  ]
}
```

---

### 4. 固化技能

**接口：** `solidifyPattern(patternId, userId)`

**请求：**
```json
{
  "action": "solidify-pattern",
  "pattern-id": "pattern-sci-fi-writing",
  "user-id": "user-123",
  "version": "1.0"
}
```

**处理流程：**
```
1. 验证模式是否达到固化阈值（≥3 次成功）
2. 提取共性工作流
3. 生成固化技能
4. 保存到技能库
5. 更新模式状态
6. 返回固化结果
```

**响应：**
```json
{
  "success": true,
  "skill-id": "skill-sci-fi-writing-v1.0",
  "version": "1.0",
  "message": "技能固化成功，可在后续任务中使用"
}
```

---

### 5. 技能版本升级

**接口：** `upgradeSkill(skillId, newVersion, userId)`

**请求：**
```json
{
  "action": "upgrade-skill",
  "skill-id": "skill-sci-fi-writing-v1.0",
  "new-version": "1.1",
  "user-id": "user-123",
  "changes": [
    "优化大纲设计环节",
    "增加审查 Agent"
  ]
}
```

**响应：**
```json
{
  "success": true,
  "skill-id": "skill-sci-fi-writing-v1.1",
  "previous-version": "1.0",
  "changes": ["优化大纲设计环节", "增加审查 Agent"],
  "message": "技能版本升级成功"
}
```

---

### 6. 分析成功要素

**接口：** `analyzeSuccessFactors(patternId)`

**请求：**
```json
{
  "action": "analyze-success-factors",
  "pattern-id": "pattern-sci-fi-writing"
}
```

**响应：**
```json
{
  "success": true,
  "analysis": {
    "common-success-factors": [
      {
        "factor": "世界观设定详细",
        "frequency": 1.0,
        "impact": "high"
      },
      {
        "factor": "大纲结构清晰",
        "frequency": 1.0,
        "impact": "high"
      },
      {
        "factor": "三层质量检查",
        "frequency": 0.67,
        "impact": "medium"
      }
    ],
    "common-issues": [
      {
        "issue": "字数控制不精确",
        "frequency": 0.33,
        "severity": "low"
      }
    ],
    "recommendations": [
      "保持详细的世界观设定流程",
      "增加字数控制检查环节"
    ]
  }
}
```

---

## 固化算法

### 模式识别

```javascript
function identifyPattern(task) {
  // 提取任务特征
  const features = extractFeatures(task)
  
  // 在现有模式中查找匹配
  const matchedPattern = findMatchingPattern(features)
  
  if (matchedPattern) {
    // 更新现有模式
    matchedPattern.executionCount++
    if (isSuccessfulTask(task)) {
      matchedPattern.successCount++
    }
    return matchedPattern
  } else {
    // 创建新模式
    return createNewPattern(task)
  }
}
```

### 共性提取

```javascript
function extractCommonalities(pattern) {
  const experiences = getExperiencesByPattern(pattern.id)
  
  // 工作流共性
  const commonWorkflow = extractCommonWorkflow(experiences)
  
  // Agent 共性
  const commonAgents = extractCommonAgents(experiences)
  
  // 成功要素
  const successFactors = extractSuccessFactors(experiences)
  
  // 问题共性
  const commonIssues = extractCommonIssues(experiences)
  
  return {
    commonWorkflow,
    commonAgents,
    successFactors,
    commonIssues
  }
}
```

### 固化建议生成

```javascript
function generateSolidifyRecommendation(pattern) {
  const analysis = analyzeSuccessFactors(pattern.id)
  
  const recommendation = {
    shouldSolidify: pattern.successCount >= 3,
    confidence: calculateConfidence(pattern),
    reasons: [],
    warnings: []
  }
  
  // 生成理由
  if (pattern.successCount >= 3) {
    recommendation.reasons.push(`已积累${pattern.successCount}次成功经验`)
  }
  if (pattern.avgQualityScore >= 90) {
    recommendation.reasons.push(`平均质量分${pattern.avgQualityScore}，质量稳定`)
  }
  if (pattern.avgUserScore >= 4.5) {
    recommendation.reasons.push(`用户满意度${pattern.avgUserScore}/5，评价良好`)
  }
  
  // 生成警告
  if (pattern.failCount > 0) {
    recommendation.warnings.push(`有${pattern.failCount}次失败记录`)
  }
  if (pattern.avgQualityScore < 85) {
    recommendation.warnings.push('质量波动较大，建议继续积累')
  }
  
  return recommendation
}
```

---

## 版本管理

### 版本命名规则

```
主版本。次版本.修订版
  │      │      │
  │      │      └─ 小修正（错别字、格式）
  │      └──────── 功能优化（新增环节、改进流程）
  └─────────────── 重大变更（流程重构、角色变更）
```

### 版本升级条件

| 升级类型 | 条件 | 示例 |
|----------|------|------|
| **修订版** (v1.0.1) | 小修正，不影响流程 | 修复错别字、优化描述 |
| **次版本** (v1.1) | 功能优化，向后兼容 | 新增审查环节、优化 Agent 配置 |
| **主版本** (v2.0) | 重大变更，可能不兼容 | 流程重构、角色重新定义 |

### 版本兼容性

```javascript
function checkCompatibility(oldVersion, newVersion) {
  const [oldMajor, oldMinor] = oldVersion.split('.').map(Number)
  const [newMajor, newMinor] = newVersion.split('.').map(Number)
  
  if (newMajor > oldMajor) {
    return { compatible: false, reason: '主版本变更，流程可能不兼容' }
  }
  if (newMinor > oldMinor) {
    return { compatible: true, reason: '次版本升级，向后兼容' }
  }
  return { compatible: true, reason: '修订版，完全兼容' }
}
```

---

## 使用示例

### 示例 1：记录任务经验

```javascript
// 任务完成后记录经验
const result = await recordExperience({
  id: "task-sci-fi-001",
  type: "standard",
  description: "创作科幻短篇小说",
  status: "completed",
  user-score: 5,
  quality-score: 92,
  workflow: [...],
  agents-used: [...],
  metrics: {
    duration: 70,
    words: 892,
    subagents: 4
  }
})

// 结果：{success: true, solidify-progress: "1/3"}
```

### 示例 2：查询固化进度

```javascript
const pattern = await getPattern("pattern-sci-fi-writing")

console.log(`执行次数：${pattern.execution-count}`)
console.log(`成功次数：${pattern.success-count}`)
console.log(`固化进度：${pattern.solidify-progress}`)
console.log(`平均质量：${pattern.avg-quality-score}`)
```

### 示例 3：获取可固化列表

```javascript
const patterns = await getSolidifiablePatterns()

patterns.forEach(p => {
  console.log(`${p.name}: ${p.execution-count}次执行，${p.avg-quality-score}分`)
})
```

### 示例 4：固化技能

```javascript
const result = await solidifyPattern("pattern-sci-fi-writing", "user-123")

if (result.success) {
  console.log(`技能固化成功：${result.skill-id}`)
}
```

### 示例 5：版本升级

```javascript
const result = await upgradeSkill(
  "skill-sci-fi-writing-v1.0",
  "1.1",
  "user-123",
  ["优化大纲设计环节", "增加审查 Agent"]
)

console.log(`技能升级到 v${result.new-version}`)
```

---

## 监控指标

### 固化进度

```json
{
  "timestamp": "2026-04-04T19:10:00Z",
  "metrics": {
    "total-patterns": 5,
    "patterns-by-stage": {
      "exploring": 2,
      "growing": 2,
      "solidified": 1
    },
    "solidification-progress": {
      "ready-to-solidify": 2,
      "accumulating": 2,
      "completed": 1
    }
  }
}
```

### 技能质量

```json
{
  "skill-id": "skill-sci-fi-writing-v1.0",
  "quality": {
    "based-on-tasks": 3,
    "avg-quality-score": 91.3,
    "avg-user-score": 4.7,
    "success-rate": 1.0,
    "stability": "high"
  }
}
```

---

## 配置文件

### solidify-config.json

```json
{
  "thresholds": {
    "min-success-count": 3,
    "min-quality-score": 85,
    "min-user-score": 4.0,
    "max-fail-rate": 0.2
  },
  "versioning": {
    "auto-increment": true,
    "require-user-confirm": true,
    "changelog-required": true
  },
  "analysis": {
    "min-samples": 3,
    "confidence-threshold": 0.7,
    "update-frequency": "per-task"
  }
}
```

---

## 下一步

1. **实现经验记录** - 任务完成后自动记录
2. **添加模式识别** - 识别相同类型的任务
3. **实现固化算法** - 提取共性，生成技能
4. **添加版本管理** - 支持版本升级
5. **编写测试用例** - 验证固化流程

---

*协议版本：1.0*  
*最后更新：2026-04-04*
