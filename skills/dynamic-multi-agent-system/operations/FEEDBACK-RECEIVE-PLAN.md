# 反馈接收与追踪流程

**问题：** 用户提交反馈后，我们如何知道？
**答案：** 主动检查 + 定时提醒 + 自动化汇总

---

## 📥 反馈接收渠道

### 渠道 1：ClawHub 评论区（主要）
- **检查频率：** 每日 09:00 + 18:00
- **检查人：** 值班开发者
- **记录位置：** `operations/USER-FEEDBACK.md`
- **响应时间：** 24-72h

### 渠道 2：本地反馈文件（次要）
- **位置：** `feedbacks/YYYY-MM/feedback-XXX.md`
- **检查频率：** 用户主动发送时
- **记录位置：** `operations/USER-FEEDBACK.md`
- **响应时间：** 24h

### 渠道 3：使用统计（可选）
- **位置：** 用户本地 `usage-stats.json`
- **收集方式：** 用户自愿发送
- **汇总频率：** 每周
- **分析：** 量化数据，非个人反馈

---

## 🔔 通知机制

### 方案 A：Cron 定时提醒（推荐）

**设置 OpenClaw Cron 任务：**

```yaml
名称：每日反馈检查
时间：每日 09:00
任务：
  1. 检查 ClawHub 评论区
  2. 扫描 feedbacks/ 目录
  3. 更新 USER-FEEDBACK.md
  4. 有新反馈时通知开发者
```

**实现：**
```powershell
# check-feedback-daily.ps1
$feedbackDir = "feedbacks"
$newFeedback = Get-ChildItem $feedbackDir -Filter "*.md" | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-1) }

if ($newFeedback) {
    Write-Host "🔔 发现 $($newFeedback.Count) 条新反馈！"
    # 发送通知（邮件/消息等）
} else {
    Write-Host "✅ 无新反馈"
}
```

### 方案 B：运营日历提醒

**在 `OPERATIONS-CHECKLIST.md` 中添加：**

```markdown
## 每日任务

### 09:00 晨检
- [ ] 检查 ClawHub 评论区 ← **反馈检查**
- [ ] 扫描 feedbacks/ 目录 ← **新反馈**
- [ ] 记录到 USER-FEEDBACK.md
- [ ] 回复紧急反馈（24h 内）
```

### 方案 C：日报自动汇总

**在每日报告中加入反馈统计：**

```markdown
## 今日反馈

| 渠道 | 数量 | 已回复 | 待处理 |
|------|------|--------|--------|
| ClawHub 评论 | X | X | X |
| 本地文件 | X | X | X |
| **总计** | X | X | X |
```

---

## 📊 反馈追踪表

### USER-FEEDBACK.md 结构

```markdown
## 反馈记录

| ID | 日期 | 渠道 | 类型 | 优先级 | 状态 | 回复时间 |
|----|------|------|------|--------|------|----------|
| 001 | 04-06 | ClawHub | Bug | P1 | 待处理 | - |
| 002 | 04-06 | 本地文件 | 建议 | P2 | 已回复 | 2h |

## 状态定义

- **待处理** - 刚收到，未分配
- **处理中** - 已分配，正在解决
- **已回复** - 已回复用户
- **已解决** - 问题已修复/功能已实现
- **已关闭** - 用户确认满意
```

---

## 🎯 反馈处理 SOP

### 步骤 1：收集（09:00/18:00）
```
1. 访问 ClawHub 评论区
2. 记录新评论到 USER-FEEDBACK.md
3. 扫描 feedbacks/ 目录
4. 更新反馈追踪表
```

### 步骤 2：分类（收集后立即）
```
1. 判断类型（Bug/建议/问题/性能）
2. 确定优先级（P0-P3）
3. 分配到对应负责人
```

### 步骤 3：响应（按优先级）
```
P0（紧急）- 24h 内回复
P1（高）  - 48h 内回复
P2（中）  - 72h 内回复
P3（低）  - 下周迭代
```

### 步骤 4：处理（按 SOP）
```
Bug 报告   - 确认 → 修复 → 验证 → 通知
功能建议  - 评估 → 排期 → 实现 → 通知
使用问题  - 解答 → 文档更新
性能反馈  - 分析 → 优化 → 验证
```

### 步骤 5：关闭（用户确认后）
```
1. 确认用户满意
2. 更新状态为"已关闭"
3. 记录到贡献者名单
4. 周报中感谢
```

---

## 📈 反馈汇总报告

### 日报模板（节选）

```markdown
## 今日反馈

**新增反馈：** X 条
**已回复：** X 条
**待处理：** X 条

### 详情
| ID | 类型 | 优先级 | 状态 |
|----|------|--------|------|
| 001 | Bug | P1 | 处理中 |
| 002 | 建议 | P2 | 已回复 |
```

### 周报模板（节选）

```markdown
## 用户反馈汇总

**本周反馈：** X 条
**累计反馈：** X 条
**满意度：** X%

### 分类统计
| 类型 | 数量 | 占比 |
|------|------|------|
| Bug | X | X% |
| 建议 | X | X% |
| 问题 | X | X% |

### 贡献者名单
- 用户 A - Bug 报告
- 用户 B - 功能建议
- ...
```

---

## 🔧 自动化工具

### 脚本 1：反馈检查脚本

```powershell
# check-feedback-daily.ps1
# 用途：每日检查反馈

$clawhubUrl = "https://cn.clawhub-mirror.com/"
$feedbackDir = "feedbacks"
$outputFile = "operations/USER-FEEDBACK.md"

Write-Host "=== 反馈检查 ==="
Write-Host "时间：$(Get-Date)"

# 1. 检查 ClawHub（手动）
Write-Host "1. 请访问 ClawHub 查看评论区"
Write-Host "   $clawhubUrl"

# 2. 扫描本地反馈
$newFeedback = Get-ChildItem $feedbackDir -Filter "*.md" | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-1) }

if ($newFeedback) {
    Write-Host "2. 发现 $($newFeedback.Count) 条新反馈" -ForegroundColor Green
    $newFeedback | ForEach-Object { Write-Host "   - $($_.Name)" }
} else {
    Write-Host "2. 无新本地反馈" -ForegroundColor Yellow
}

# 3. 更新追踪表
Write-Host "3. 请手动更新 USER-FEEDBACK.md"
```

### 脚本 2：反馈汇总脚本

```powershell
# summarize-feedback.ps1
# 用途：汇总反馈数据

$feedbackDir = "feedbacks"
$outputFile = "reports/feedback-summary.md"

# 统计
$total = (Get-ChildItem $feedbackDir -Filter "*.md").Count
$thisWeek = (Get-ChildItem $feedbackDir -Filter "*.md" | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }).Count

# 生成报告
$report = @"
# 反馈汇总报告

**生成时间：** $(Get-Date)
**累计反馈：** $total 条
**本周反馈：** $thisWeek 条
"@

$report | Out-File $outputFile -Encoding utf8
Write-Host "✅ 报告已生成：$outputFile"
```

---

## 📞 通知方式

### 方式 1：OpenClaw 消息通知

在 Cron 任务中设置：
```yaml
delivery:
  mode: announce
  channel: webchat
```

### 方式 2：邮件通知（如有）

```powershell
# 发现新反馈时发送邮件
Send-MailMessage -To "dev@example.com" `
    -Subject "🔔 新用户反馈" `
    -Body "发现 $count 条新反馈，请及时处理"
```

### 方式 3：即时消息（如钉钉/企业微信）

```powershell
# 发送 Webhook 通知
Invoke-RestMethod -Uri "https://webhook.url" `
    -Method POST `
    -Body @{ text = "🔔 新反馈：$count 条" } | ConvertTo-Json
```

---

## 📋 检查清单

### 每日检查（09:00/18:00）

- [ ] 访问 ClawHub 评论区
- [ ] 记录新评论到 USER-FEEDBACK.md
- [ ] 扫描 feedbacks/ 目录
- [ ] 更新反馈追踪表
- [ ] 回复紧急反馈（P0/P1）

### 每周检查（周五 17:00）

- [ ] 生成反馈汇总报告
- [ ] 更新贡献者名单
- [ ] 分析反馈趋势
- [ ] 规划下周改进

---

**创建时间：** 2026-04-06
**维护人：** 开发团队
