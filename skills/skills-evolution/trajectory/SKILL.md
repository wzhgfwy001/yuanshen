# Trajectory System - 因果链记录系统

**版本：** v1.0.0  
**更新：** 2026-04-25  
**目的：** 完整记录Agent执行过程中的因果链，实现技能自动演化

---

## 核心价值

 SkillClaw 论文指出：很多技能层面的失败根本不会出现在最终答案里，而是藏在中间步骤里。只看"任务失败"是看不出哪里该修的。

本系统解决：如何记录完整因果链 + 如何分析失败模式 + 如何生成改进建议

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    TrajectoryRecorder                        │
│  记录：prompt → 决策 → 工具调用 → 中间错误 → 最终响应        │
└─────────────────────────────────────────────────────────────┘
                              ↓
                              ↓ 分析
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      CausalAnalyzer                          │
│  识别：失败模式 + 前置条件缺失 + 影响范围                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
                              ↓ 决策
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SkillUpdateDecider                        │
│  决策：是否更新技能 + 验证后上线                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 文件结构

```
skills/skills-evolution/trajectory/
├── trajectory_recorder.js   # 轨迹记录器
├── causal_analyzer.js        # 因果分析器
├── skill_update_decider.js   # 技能更新决策器（待实现）
├── analyzer_history.json     # 分析历史记录
└── records/                  # 轨迹数据存储
    └── *.json
```

---

## 使用方法

### 1. 记录轨迹

```javascript
const { TrajectoryRecorder } = require('./trajectory/trajectory_recorder');

// 创建记录器
const recorder = new TrajectoryRecorder(
  'task_2026_04_25_001',  // taskId
  'code_review',           // taskType
  { userId: 'user_123', session: 'main' }  // metadata
);

// 记录工具调用
recorder.beforeToolCall('read', { path: 'src/main.py' });
// ... 执行工具 ...
recorder.afterToolCall('read', { content: '...' }, null);

// 记录决策点
recorder.recordDecision(
  'reviewer', 
  'start_code_review', 
  'user requested code review for main.py',
  { file: 'src/main.py' }
);

// 结束任务
recorder.end('success', { linesReviewed: 500, issuesFound: 3 });

// 获取轨迹
const trajectory = recorder.getTrajectory();

// 保存到文件
recorder.save();
```

### 2. 分析失败

```javascript
const { CausalAnalyzer } = require('./trajectory/causal_analyzer');

const analyzer = new CausalAnalyzer();

// 分析失败原因
const result = analyzer.analyzeFailure(trajectory);

if (result.hasFailures) {
  console.log(`失败模式: ${result.rootCause.pattern}`);
  console.log(`改进建议: ${result.recommendations.join(', ')}`);
  console.log(`影响范围: ${result.impactScope}/10`);
}
```

### 3. 批量分析

```javascript
// 分析多个轨迹
const trajectories = loadAllTrajectories();
const summary = analyzer.aggregateAnalysis(trajectories);

console.log(`失败率: ${summary.failureRate * 100}%`);
console.log(`最常见模式: ${summary.topPatterns[0].pattern}`);
console.log(`最高效建议: ${summary.topRecommendations[0].recommendation}`);
```

---

## 失败模式识别

| 模式 | 关键词 | 建议 |
|------|--------|------|
| `file_path_issue` | not found, does not exist, ENOENT | 使用前检查文件存在，使用绝对路径 |
| `permission_issue` | permission, EPERM, access denied | 检查权限，管理员运行 |
| `timeout_issue` | timeout, ETIMEDOUT | 增加超时，添加重试 |
| `npm_install_issue` | npm ERR, node_modules | 清除重装，添加 --legacy-peer-deps |
| `network_issue` | ECONNREFUSED, fetch failed | 检查网络，添加重试 |
| `json_parse_issue` | JSON.parse, Unexpected token | 验证JSON格式，使用try-catch |
| `missing_dependency` | require, cannot find module | 安装缺失依赖 |
| `invalid_input` | invalid, must be, expected | 添加输入校验 |

---

## 轨迹数据结构

```json
{
  "taskId": "task_2026_04_25_001",
  "taskType": "code_review",
  "startedAt": "2026-04-25T14:00:00Z",
  "endedAt": "2026-04-25T14:05:00Z",
  "finalStatus": "failed",
  "totalDuration": 300000,
  "stepCount": 12,
  "steps": [
    {
      "id": 1,
      "type": "task_start",
      "timestamp": "2026-04-25T14:00:00Z"
    },
    {
      "id": 2,
      "type": "agent_decision",
      "agent": "reviewer",
      "decision": "start_code_review",
      "reason": "user requested",
      "timestamp": "2026-04-25T14:00:01Z"
    },
    {
      "id": 3,
      "type": "tool_call",
      "tool": "read",
      "action": "call",
      "inputs": { "path": "src/main.py" },
      "status": "pending",
      "timestamp": "2026-04-25T14:00:02Z"
    },
    {
      "id": 4,
      "type": "tool_call",
      "tool": "read",
      "action": "response",
      "outputs": null,
      "error": { "name": "Error", "message": "File does not exist" },
      "status": "failed",
      "duration": 12,
      "timestamp": "2026-04-25T14:00:03Z"
    }
  ],
  "metadata": { "userId": "user_123" }
}
```

---

## 与现有系统集成

### skills-evolution 集成

在 `skills-evolution/SKILL.md` 的执行流程中添加：

```
第7步：执行任务
  → 在工具调用前后使用 TrajectoryRecorder 记录轨迹

第8步：验证结果
  → 使用 CausalAnalyzer 分析失败原因
  → 如果识别到可改进的模式，记录到 lessons/
```

### tracker 集成

```javascript
const { TrajectoryRecorder } = require('./trajectory/trajectory_recorder');
const { CausalAnalyzer } = require('./trajectory/causal_analyzer');
const tracker = require('../core/tracker/category-validation-tracker');

// 主Agent执行任务时
const recorder = new TrajectoryRecorder(taskId, category);

// ... 执行任务 ...

// 任务完成后
if (result.status === 'failed') {
  const analyzer = new CausalAnalyzer();
  const analysis = analyzer.analyzeFailure(recorder.getTrajectory());
  
  if (analysis.impactScope >= 7 && analysis.rootCause.pattern !== 'unknown') {
    // 高影响失败 → 触发技能更新审查
    console.log(`[高影响失败] ${analysis.rootCause.pattern}`);
  }
}

// 更新 tracker
tracker.increment();
```

---

## 实施状态

| 模块 | 状态 | 文件 |
|------|------|------|
| TrajectoryRecorder | ✅ 已完成 | trajectory_recorder.js (11.9KB) |
| CausalAnalyzer | ✅ 已完成 | causal_analyzer.js (15.8KB) |
| Integration Layer | ✅ 已完成 | skills-evolution-integration.js (7.1KB) |
| Dashboard | ⏳ 待实现 | - |

### P3 集成测试结果 (2026-04-25 14:16)

```
Health Check:
  trajectoryAvailable: true
  analyzerAvailable: true
  activeRecorders: 0
  status: ok

测试场景：
- 工具调用：read (成功) → exec (失败：npm permission denied)

分析结果：
  Pattern: permission_issue
  Impact: 8/10
  Recommendations: 4

自动保存：
- 轨迹: trajectory/records/test-task-001_*.json
- 教训: brain/lessons/lesson_*.md
```

## 下一步

1. **P1**: TrajectoryRecorder 基础版 ✅
2. **P2**: CausalAnalyzer 失败模式识别 ✅
3. **P3**: 与 skills-evolution 集成 ✅
4. **P4**: Dashboard 可视化 ⏳

---

## 下一步

1. **P1（已完成）**: TrajectoryRecorder 基础版
2. **P2（已完成）**: CausalAnalyzer 失败模式识别
3. **P3**: 与 skills-evolution 集成
4. **P4**: SkillUpdateDecider 实现验证后上线机制

---

## 相关资源

- SkillClaw 论文: https://arxiv.org/abs/2604.08377
- SkillClaw GitHub: https://github.com/AMAP-ML/SkillClaw
- 知识储备: brain/knowledge_reserve/skillclaw-2026-04-25.md

---

*最后更新: 2026-04-25 14:08*