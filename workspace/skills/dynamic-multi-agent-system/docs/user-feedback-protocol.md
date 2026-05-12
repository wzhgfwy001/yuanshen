# 用户反馈自动化 v1.0

## 概述

用户反馈自动化模块负责任务完成后的反馈收集和分析：
- ✅ 自动收集用户评分（1-5 分）
- ✅ 低分任务自动触发反思改进（<3 分）
- ✅ 高分任务计入固化计数（≥4 分）
- ✅ 生成用户满意度报告
- ✅ 情感分析和关键词提取

---

## 反馈收集流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    用户反馈自动化流程                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  任务完成 → 自动发送反馈请求 → 用户评分 → 分析处理              │
│                                                    │            │
│                       ┌───────────────────────────┤            │
│                       │                           │            │
│                       ▼                           ▼            │
│                评分 <3 分                    评分 ≥4 分         │
│                       │                           │            │
│                       ▼                           ▼            │
│              触发反思改进               计入固化计数           │
│              生成改进计划               记录成功经验           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 反馈收集机制

### 自动触发时机

```javascript
// 任务完成后自动触发
function onTaskCompleted(task) {
  // 延迟 30 秒发送，避免打断用户
  setTimeout(() => {
    sendFeedbackRequest(task)
  }, 30000)
}
```

### 反馈请求格式

**Discord/Telegram/WhatsApp:**
```
✅ 任务完成！

任务：创作科幻短篇小说
完成时间：2026-04-04 19:00
耗时：70 分钟
质量评分：92/100

请评分（1-5 分）：
⭐⭐⭐⭐⭐ - 超出预期
⭐⭐⭐⭐  - 满意
⭐⭐⭐   - 一般
⭐⭐    - 不满意
⭐     - 非常不满意

可选：具体建议或修改要求
[回复此消息]
```

**Web Chat:**
```json
{
  "type": "feedback-request",
  "task-id": "task-sci-fi-001",
  "task-description": "创作科幻短篇小说",
  "quality-score": 92,
  "duration-minutes": 70,
  "rating-scale": {
    "5": "超出预期",
    "4": "满意",
    "3": "一般",
    "2": "不满意",
    "1": "非常不满意"
  },
  "allow-comment": true
}
```

---

## 评分标准

### 5 分制定义

| 分数 | 含义 | 说明 | 处理 |
|------|------|------|------|
| **5** | 超出预期 | 质量优秀，超出用户期望 | 计入固化，标记为优秀案例 |
| **4** | 满意 | 符合预期，质量好 | 计入固化 |
| **3** | 一般 | 基本满足需求，有小问题 | 记录问题，不计入固化 |
| **2** | 不满意 | 多处问题，需要改进 | 触发反思改进 |
| **1** | 非常不满意 | 严重问题，无法使用 | 触发反思改进 + 人工介入 |

### 评分阈值

```json
{
  "excellent": {
    "min-score": 5,
    "action": "mark-as-exemplar",
    "solidify-weight": 1.5
  },
  "good": {
    "min-score": 4,
    "action": "count-for-solidify",
    "solidify-weight": 1.0
  },
  "average": {
    "min-score": 3,
    "action": "record-issues",
    "solidify-weight": 0
  },
  "poor": {
    "min-score": 2,
    "action": "trigger-reflection",
    "solidify-weight": -1
  },
  "terrible": {
    "min-score": 1,
    "action": "trigger-reflection + manual-review",
    "solidify-weight": -2
  }
}
```

---

## 低分处理流程

### 反思改进触发

```javascript
async function handleLowScore(feedback) {
  if (feedback.score < 3) {
    // 1. 记录问题
    await recordIssues(feedback)
    
    // 2. 触发反思改进器
    const reflection = await triggerReflection(feedback.task)
    
    // 3. 生成改进计划
    const improvementPlan = generateImprovementPlan(reflection)
    
    // 4. 通知用户
    await notifyUser({
      type: 'improvement-plan',
      task-id: feedback.task.id,
      plan: improvementPlan
    })
    
    // 5. 标记任务需要跟进
    await flagForFollowup(feedback.task.id)
  }
}
```

### 改进计划模板

```markdown
# 改进计划

**任务 ID：** task-xxx  
**用户评分：** ⭐⭐ (2/5)  
**问题分类：** {问题类型}

## 识别的问题

1. {问题 1}
   - 影响：{影响描述}
   - 优先级：高/中/低

2. {问题 2}
   ...

## 改进措施

### 短期措施（立即执行）
- [ ] {措施 1}
- [ ] {措施 2}

### 中期措施（下次任务优化）
- [ ] {措施 1}
- [ ] {措施 2}

### 长期措施（系统优化）
- [ ] {措施 1}
- [ ] {措施 2}

## 预计完成时间
- 短期：24 小时内
- 中期：下次任务执行时
- 长期：1 周内

## 负责人
- 主 Agent：{agent-id}
- 跟进人：{user-id}
```

---

## 高分处理流程

### 优秀案例标记

```javascript
async function handleHighScore(feedback) {
  if (feedback.score >= 4) {
    // 1. 计入固化计数
    await incrementSolidifyCount(feedback.task.patternId)
    
    // 2. 标记为优秀案例（5 分）
    if (feedback.score === 5) {
      await markAsExemplar(feedback.task.id)
    }
    
    // 3. 提取成功经验
    const successFactors = extractSuccessFactors(feedback.task)
    
    // 4. 保存到经验库
    await saveSuccessExperience({
      task: feedback.task,
      score: feedback.score,
      factors: successFactors,
      comment: feedback.comment
    })
  }
}
```

### 成功经验提取

```javascript
function extractSuccessFactors(task) {
  const factors = []
  
  // 工作流分析
  if (task.workflowEfficiency > 0.9) {
    factors.push('工作流程高效')
  }
  
  // 质量分析
  if (task.qualityScore >= 90) {
    factors.push('输出质量优秀')
  }
  
  // 时效分析
  if (task.actualDuration <= task.estimatedDuration) {
    factors.push('按时完成任务')
  }
  
  // Agent 协作分析
  if (task.subagentCoordination === 'excellent') {
    factors.push('多 Agent 协作流畅')
  }
  
  return factors
}
```

---

## 情感分析

### 评论情感分类

```javascript
function analyzeSentiment(comment) {
  // 简单关键词匹配（可扩展为 ML 模型）
  const positiveWords = ['很好', '满意', '不错', '优秀', '超出预期']
  const negativeWords = ['失望', '不好', '差', '问题', '不满意']
  
  let score = 0
  positiveWords.forEach(word => {
    if (comment.includes(word)) score++
  })
  negativeWords.forEach(word => {
    if (comment.includes(word)) score--
  })
  
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
}
```

### 关键词提取

```javascript
function extractKeywords(comment) {
  // 分词 + 词频统计
  const words = tokenize(comment)
  const stopwords = ['的', '了', '是', '在', '我', '有']
  
  const filtered = words.filter(w => !stopwords.includes(w))
  const freq = countFrequency(filtered)
  
  // 返回 top 5 关键词
  return getTopKeywords(freq, 5)
}
```

---

## 满意度报告

### 日报模板

```markdown
# 用户满意度日报

**日期：** 2026-04-04

## 今日概览

| 指标 | 数值 | 趋势 |
|------|------|------|
| 完成任务数 | 15 | ↑ +3 |
| 收到反馈数 | 12 | ↑ +2 |
| 平均评分 | 4.3/5 | ↑ +0.2 |
| 满意度 | 92% | ↑ +5% |

## 评分分布

⭐⭐⭐⭐⭐  5 分：8 次 (67%)  
⭐⭐⭐⭐   4 分：3 次 (25%)  
⭐⭐⭐    3 分：1 次 (8%)  
⭐⭐     2 分：0 次 (0%)  
⭐      1 分：0 次 (0%)  

## 优秀案例

1. **任务：** 创作科幻短篇小说
   **评分：** ⭐⭐⭐⭐⭐
   **用户评价：** "超出预期，世界观设定非常详细！"
   **质量分：** 92/100

2. **任务：** 数据分析报告
   **评分：** ⭐⭐⭐⭐⭐
   **用户评价：** "专业且易懂，图表很清晰"
   **质量分：** 95/100

## 需要改进

1. **任务：** 会议纪要整理
   **评分：** ⭐⭐⭐
   **问题：** 格式不符合要求
   **改进措施：** 增加格式确认环节

## 趋势分析

- 本周平均评分：4.2/5
- 上周平均评分：4.0/5
- 趋势：上升 ↑

## 建议

- 继续保持高质量输出
- 加强格式确认环节
- 考虑增加模板库
```

### 周报模板

```markdown
# 用户满意度周报

**周期：** 2026-W14 (3.31-4.6)

## 本周概览

| 指标 | 本周 | 上周 | 变化 |
|------|------|------|------|
| 完成任务数 | 85 | 72 | ↑ +18% |
| 收到反馈数 | 68 | 55 | ↑ +24% |
| 平均评分 | 4.2/5 | 4.0/5 | ↑ +5% |
| 满意度 (≥4 分) | 88% | 82% | ↑ +6% |
| 优秀率 (5 分) | 45% | 38% | ↑ +7% |

## 技能表现

| 技能类型 | 任务数 | 平均分 | 满意度 |
|----------|--------|--------|--------|
| 创意写作 | 25 | 4.5 | 96% |
| 数据分析 | 18 | 4.2 | 89% |
| 代码开发 | 15 | 4.0 | 85% |
| 研究整理 | 12 | 4.1 | 88% |

## 趋势分析

[图表：近 4 周评分趋势]

## 改进重点

1. 代码开发类任务满意度偏低（85%）
   - 主要问题：测试覆盖率不足
   - 改进措施：增加测试环节

2. 格式相关问题频发
   - 主要问题：用户需求理解不准确
   - 改进措施：增加需求确认步骤
```

---

## API 协议

### 1. 发送反馈请求

**接口：** `sendFeedbackRequest(taskId)`

**请求：**
```json
{
  "action": "send-feedback-request",
  "task-id": "task-sci-fi-001",
  "channel": "webchat",
  "template": "default"
}
```

**响应：**
```json
{
  "success": true,
  "message-id": "msg-123",
  "sent-at": "2026-04-04T19:05:00Z"
}
```

---

### 2. 提交反馈

**接口：** `submitFeedback(taskId, score, comment)`

**请求：**
```json
{
  "action": "submit-feedback",
  "task-id": "task-sci-fi-001",
  "score": 5,
  "comment": "超出预期，世界观设定非常详细！",
  "user-id": "user-123"
}
```

**响应：**
```json
{
  "success": true,
  "feedback-id": "fb-001",
  "processed": true,
  "solidify-counted": true,
  "message": "感谢反馈！已计入技能固化进度"
}
```

---

### 3. 查询反馈统计

**接口：** `getFeedbackStats(period)`

**请求：**
```json
{
  "action": "get-feedback-stats",
  "period": "today|week|month|custom",
  "start-date": "2026-04-01",
  "end-date": "2026-04-04"
}
```

**响应：**
```json
{
  "success": true,
  "stats": {
    "total-tasks": 85,
    "feedback-count": 68,
    "avg-score": 4.2,
    "distribution": {
      "5": 45,
      "4": 23,
      "3": 10,
      "2": 2,
      "1": 1
    },
    "satisfaction-rate": 0.88,
    "exemplar-rate": 0.45
  }
}
```

---

### 4. 获取低分任务列表

**接口：** `getLowScoreTasks(minScore)`

**请求：**
```json
{
  "action": "get-low-score-tasks",
  "min-score": 3,
  "period": "week"
}
```

**响应：**
```json
{
  "success": true,
  "tasks": [
    {
      "task-id": "task-xxx",
      "description": "会议纪要整理",
      "score": 2,
      "comment": "格式不符合要求",
      "date": "2026-04-03",
      "improvement-status": "in-progress"
    }
  ]
}
```

---

### 5. 生成满意度报告

**接口：** `generateReport(period, format)`

**请求：**
```json
{
  "action": "generate-report",
  "period": "week",
  "format": "markdown|json|pdf"
}
```

**响应：**
```json
{
  "success": true,
  "report-id": "report-2026-w14",
  "format": "markdown",
  "url": "reports/2026-w14-satisfaction.md",
  "generated-at": "2026-04-04T20:00:00Z"
}
```

---

## 配置管理

### feedback-config.json

```json
{
  "collection": {
    "auto-send": true,
    "delay-seconds": 30,
    "reminder-enabled": true,
    "reminder-delay-hours": 24,
    "max-reminders": 1
  },
  "thresholds": {
    "excellent": 5,
    "good": 4,
    "average": 3,
    "poor": 2,
    "terrible": 1
  },
  "actions": {
    "on-excellent": ["mark-as-exemplar", "solidify-weight-1.5"],
    "on-good": ["count-for-solidify"],
    "on-average": ["record-issues"],
    "on-poor": ["trigger-reflection"],
    "on-terrible": ["trigger-reflection", "manual-review"]
  },
  "reporting": {
    "daily-report": true,
    "weekly-report": true,
    "monthly-report": true,
    "report-time": "20:00"
  }
}
```

---

## 使用示例

### 示例 1：自动发送反馈请求

```javascript
// 任务完成后自动触发
await sendFeedbackRequest("task-sci-fi-001")

// 输出：
// ✅ 任务完成！
// 
// 任务：创作科幻短篇小说
// 请评分（1-5 分）：
// ⭐⭐⭐⭐⭐ - 超出预期
// ...
```

### 示例 2：处理用户反馈

```javascript
// 用户回复评分
const result = await submitFeedback({
  "task-id": "task-sci-fi-001",
  "score": 5,
  "comment": "超出预期，世界观设定非常详细！"
})

// 结果：
// {
//   success: true,
//   solidify-counted: true,
//   message: "感谢反馈！已计入技能固化进度"
// }
```

### 示例 3：查询满意度统计

```javascript
const stats = await getFeedbackStats({
  period: "week"
})

console.log(`本周平均评分：${stats.avg-score}/5`)
console.log(`满意度：${stats.satisfaction-rate * 100}%`)
```

### 示例 4：生成周报

```javascript
const report = await generateReport({
  period: "week",
  format: "markdown"
})

console.log(`报告生成成功：${report.url}`)
```

---

## 监控指标

### 实时指标

```json
{
  "timestamp": "2026-04-04T19:15:00Z",
  "metrics": {
    "today": {
      "tasks-completed": 15,
      "feedback-received": 12,
      "avg-score": 4.3,
      "satisfaction-rate": 0.92
    },
    "this-week": {
      "tasks-completed": 85,
      "feedback-received": 68,
      "avg-score": 4.2,
      "satisfaction-rate": 0.88
    }
  }
}
```

### 趋势分析

```json
{
  "trend": {
    "score-trend": "up",
    "score-change": "+0.2",
    "satisfaction-trend": "up",
    "satisfaction-change": "+5%",
    "volume-trend": "up",
    "volume-change": "+18%"
  }
}
```

---

## 下一步

1. **实现反馈收集** - 自动发送反馈请求
2. **添加情感分析** - 分析用户评论情感
3. **实现低分处理** - 触发反思改进
4. **实现高分处理** - 计入固化计数
5. **生成满意度报告** - 日报/周报/月报

---

*协议版本：1.0*  
*最后更新：2026-04-04*
