---
name: user-feedback
description: 混合动态多Agent协作系统核心模块 - 用户反馈自动化，任务完成后自动收集反馈，情感分析，满意度追踪，闭环处理
parent: dynamic-multi-agent-system
version: 1.3.0
---

# User Feedback Automation v1.1

**版本：** 1.1.0  
**类型：** 核心模块  
**依赖：** skill-evolution（可选，用于反馈驱动Skill演进）  
**状态：** 🟢 增强完成

---

## 📖 简介

用户反馈自动化模块在任务完成后自动收集用户反馈，进行情感分析，追踪满意度趋势，并触发相应的处理流程。

### 核心功能 (v1.1)

| 功能 | 说明 | 状态 |
|------|------|------|
| 📊 **反馈收集** | 多渠道自动收集反馈 | ✅ |
| 😊 **情感分析** | 基于关键词的情感分析 | ✅ |
| 📈 **满意度追踪** | 追踪评分趋势和分布 | ✅ |
| 🔄 **闭环处理** | 根据分数自动触发处理 | ✅ |
| 🚨 **告警机制** | 低分自动告警 | ✅ |
| 📋 **报告生成** | 生成周报和日报 | ✅ |
| 🤝 **Skill演进集成** | 反馈驱动Skill固化 | ✅ |

---

## 评分规则

### 评分标准

| 分数 | 类别 | 说明 | 自动处理 |
|------|------|------|----------|
| **5** | 超出预期 | 非常满意 | 增加固化权重，标记为范例 |
| **4** | 满意 | 符合预期 | 计入Skill固化计数 |
| **3** | 一般 | 基本满足 | 记录供分析 |
| **2** | 不满意 | 有问题 | 触发反思，标记跟进 |
| **1** | 非常不满意 | 严重问题 | 触发反思，需要人工审查，告警 |

---

## API 参考

### 提交反馈

```powershell
$result = Submit-Feedback `
    -taskId "task-001" `
    -score 5 `
    -comment "很好，超出预期！" `
    -channel "webchat"

# 输出：
# {
#   success = true
#   feedback = { id, taskId, score, category, sentiment, ... }
#   sentiment = "positive"
#   category = "excellent"
#   actions = [ { action = "mark_exemplar", success = true }, ... ]
# }
```

### 创建反馈请求

```powershell
# 任务完成后创建反馈请求（60秒后自动发送）
New-FeedbackRequest -taskId "task-001" -taskDescription "创作科幻小说"
```

### 获取反馈摘要

```powershell
$summary = Get-FeedbackSummary -days 7

# 输出：
# {
#   total = 15
#   avgScore = 4.2
#   satisfactionRate = 86.7
#   scoreDistribution = { excellent: 5, good: 8, ... }
#   sentimentDistribution = { positive: 10, neutral: 3, negative: 2 }
#   feedbacks = [...]
# }
```

### 获取满意度趋势

```powershell
$trend = Get-SatisfactionTrend -days 30

# 输出：
# {
#   trend = "improving" | "stable" | "declining"
#   message = "Satisfaction is improving (+0.5)"
#   firstPeriodAvg = 4.0
#   secondPeriodAvg = 4.5
#   change = 0.5
# }
```

### 生成周报

```powershell
$result = Generate-WeeklyReport -weeks 1

# 输出：
# {
#   success = true
#   outputPath = "reports\weekly\feedback-weekly-2026-03-31-to-2026-04-06.md"
#   summary = { ... }
# }
```

### 情感分析

```powershell
$sentiment = Analyze-Sentiment -text "这个方案很好，推荐使用"
# 返回: "positive" | "neutral" | "negative"
```

---

## 自动化处理

### 分数触发动作

| 分数 | 触发的动作 |
|------|-----------|
| 5 | incrementSolidifyWeight, markAsExemplar, extractSuccessFactors |
| 4 | countForSolidify |
| 3 | recordForAnalysis |
| 2 | triggerReflection, flagForFollowup |
| 1 | triggerReflection, requireManualReview, alert |

### 示例：低分处理

```powershell
# 用户提交了 2 分反馈
$result = Submit-Feedback -taskId "task-005" -score 2 -comment "不满意，问题很多"

# 系统自动：
# 1. 触发反思流程
# 2. 标记任务需要跟进
# 3. 记录到反馈统计
```

---

## 反馈统计

### 统计指标

```powershell
$stats = Get-FeedbackStats

# 输出：
# {
#   totalFeedback = 150
#   totalTasks = 200
#   avgSatisfaction = 4.2
#   byScore = { excellent: 30, good: 80, average: 30, poor: 8, terrible: 2 }
#   trends = {
#     daily = [ { date, count, totalScore, avgScore }, ... ]
#     weekly = [ ... ]
#   }
# }
```

### 满意度趋势

```
趋势计算方法：
1. 将数据分为前半段和后半段
2. 计算两段的平均分
3. 比较差异：
   - diff > +0.3: improving（提升中）
   - diff < -0.3: declining（下降中）
   - else: stable（稳定）
```

---

## 报告生成

### 周报内容

```markdown
# Weekly Feedback Report

## Summary
- Total Feedback: 15
- Average Score: 4.2/5
- Satisfaction Rate: 86.7%
- Trend: improving

## Score Distribution
| Score | Count | Percentage |
|-------|-------|------------|
| 5 - Excellent | 5 | 33.3% |
| 4 - Good | 8 | 53.3% |
| 3 - Average | 2 | 13.3% |
| 2 - Poor | 0 | 0% |
| 1 - Terrible | 0 | 0% |

## Recommendations
- 🌟 Excellent satisfaction rate!
```

---

## 情感分析

### 关键词库

**正面词汇：**
很好、满意、不错、优秀、超出预期、棒、赞、完美、出色、感谢

**负面词汇：**
失望、不好、差、问题、不满意、糟、烂、错误、失败、没用

**中性词汇：**
一般、普通、还行、可以、还好

### 分析规则

```
1. 计算正面词在文本中出现的次数
2. 计算负面词在文本中出现的次数
3. 比较：
   - 正面 > 负面 → positive
   - 负面 > 正面 → negative
   - 相等 → neutral
```

---

## 配置

```powershell
# 查看当前配置
$script:config

# 可配置项：
# - thresholds.excellent/good/average/poor/terrible
# - autoCollection.enabled, delaySeconds, reminderEnabled
# - sentiment.positiveWords, negativeWords, neutralWords
# - actions.onExcellent, onGood, onAverage, onPoor, onTerrible
```

---

## 最佳实践

1. **自动收集**：任务完成后立即调用 `New-FeedbackRequest`
2. **及时反馈**：用户提交后立即调用 `Submit-Feedback`
3. **定期报告**：每天或每周生成 `Generate-WeeklyReport`
4. **监控趋势**：定期检查 `Get-SatisfactionTrend`
5. **闭环处理**：低分反馈确保触发反思和改进

---

## 🧪 测试

```powershell
# 加载模块
Import-Module (Join-Path $PSScriptRoot "auto-feedback-collector.ps1") -Force

# 运行测试
Test-AutoFeedbackCollector
```

---

## 📝 更新日志

### v1.1.0 (2026-04-07)

- ✅ **增强情感分析**：多维度关键词分析
- ✅ **满意度追踪**：计算趋势（提升/稳定/下降）
- ✅ **自动化动作**：基于分数的自动处理流程
- ✅ **告警机制**：低分自动告警
- ✅ **反馈统计**：完整的分数分布和趋势数据
- ✅ **报告生成**：自动生成周报和日报
- ✅ **Skill演进集成**：反馈驱动Skill固化

### v1.0.0 (2026-04-04)

- ✅ 基础反馈收集（WeChat、Email）
- ✅ 简单情感分析
- ✅ 周报生成

---

**创建时间：** 2026-04-07  
**维护人：** 开发团队  
**版本：** v1.1
