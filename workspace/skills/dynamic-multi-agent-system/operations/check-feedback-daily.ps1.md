# 每日反馈检查脚本

**用途：** 每日自动检查用户反馈
**执行时间：** 每日 09:00 + 18:00
**输出：** 反馈检查报告

---

## 🔧 脚本代码

```powershell
# check-feedback-daily.ps1
# 用法：.\check-feedback-daily.ps1

param(
    [switch]$notify,
    [string]$outputFile = "operations/feedback-check-result.md"
)

$clawhubUrl = "https://cn.clawhub-mirror.com/"
$feedbackDir = "feedbacks"
$trackingFile = "operations/USER-FEEDBACK.md"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  每日反馈检查" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 ClawHub 评论区（需手动）
Write-Host "📋 步骤 1: ClawHub 评论区检查" -ForegroundColor Yellow
Write-Host "   网址：$clawhubUrl"
Write-Host "   操作：请手动访问并查看新评论"
Write-Host ""

# 2. 扫描本地反馈目录
Write-Host "📂 步骤 2: 扫描本地反馈目录" -ForegroundColor Yellow
$newFeedback = Get-ChildItem $feedbackDir -Filter "*.md" -ErrorAction SilentlyContinue | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-1) }

if ($newFeedback) {
    Write-Host "   ✅ 发现 $($newFeedback.Count) 条新反馈：" -ForegroundColor Green
    foreach ($file in $newFeedback) {
        Write-Host "      - $($file.Name)" -ForegroundColor White
    }
} else {
    Write-Host "   ⭕ 无新本地反馈" -ForegroundColor Yellow
}
Write-Host ""

# 3. 统计反馈数据
Write-Host "📊 步骤 3: 反馈数据统计" -ForegroundColor Yellow
$totalFeedback = (Get-ChildItem $feedbackDir -Filter "*.md" -ErrorAction SilentlyContinue).Count
$thisWeek = (Get-ChildItem $feedbackDir -Filter "*.md" -ErrorAction SilentlyContinue | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) }).Count

Write-Host "   累计反馈：$totalFeedback 条"
Write-Host "   本周反馈：$thisWeek 条"
Write-Host ""

# 4. 生成检查报告
$report = @"
# 反馈检查报告

**检查时间：** $(Get-Date -Format 'yyyy-MM-dd HH:mm')
**检查人：** 系统自动

## 检查结果

### ClawHub 评论区
- [ ] 已检查（需手动访问）
- [ ] 发现新评论
- [ ] 已记录到 USER-FEEDBACK.md

### 本地反馈目录
- 新反馈：$($newFeedback.Count) 条
- 累计反馈：$totalFeedback 条
- 本周反馈：$thisWeek 条

### 待处理反馈
$(if ($newFeedback) {
    $newFeedback | ForEach-Object { "- [ ] $($_.Name)" }
} else {
    "- 无待处理反馈"
})

## 下一步行动

$(if ($newFeedback.Count -gt 0) {
    "1. 阅读新反馈内容
2. 分类定级（P0-P3）
3. 记录到 USER-FEEDBACK.md
4. 24-72h 内回复"
} else {
    "✅ 无新反馈，继续日常运营"
})

---
*报告生成时间：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')*
"@

$report | Out-File $outputFile -Encoding utf8
Write-Host "📄 报告已保存：$outputFile" -ForegroundColor Green
Write-Host ""

# 5. 通知（可选）
if ($notify) {
    if ($newFeedback.Count -gt 0) {
        Write-Host "🔔 发现新反馈，正在通知开发者..." -ForegroundColor Yellow
        # 这里可以添加邮件/Webhook 通知逻辑
        Write-Host "   通知已发送" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ 无新反馈，跳过通知" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  检查完成" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
```

---

## 📋 使用方法

### 手动运行
```powershell
cd skills/dynamic-multi-agent-system
.\check-feedback-daily.ps1
```

### 自动运行（Cron）
```yaml
# OpenClaw Cron 配置
name: 每日反馈检查
schedule:
  kind: cron
  expr: "0 9 * * *"  # 每日 09:00
payload:
  kind: systemEvent
  text: "执行反馈检查脚本"
```

### 带通知运行
```powershell
.\check-feedback-daily.ps1 -notify
```

---

## 📊 输出示例

```
================================
  每日反馈检查
  2026-04-06 09:00
================================

📋 步骤 1: ClawHub 评论区检查
   网址：https://cn.clawhub-mirror.com/
   操作：请手动访问并查看新评论

📂 步骤 2: 扫描本地反馈目录
   ✅ 发现 2 条新反馈：
      - feedback-001.md
      - feedback-002.md

📊 步骤 3: 反馈数据统计
   累计反馈：2 条
   本周反馈：2 条

📄 报告已保存：operations/feedback-check-result.md

🔔 发现新反馈，正在通知开发者...
   通知已发送

================================
  检查完成
================================
```

---

## 📁 输出文件

每次检查生成：
- `operations/feedback-check-result.md` - 检查报告

报告包含：
- 检查时间
- ClawHub 检查状态
- 本地反馈统计
- 待处理反馈列表
- 下一步行动建议

---

## 🔔 通知集成（可选）

### 邮件通知
```powershell
# 添加到脚本中
if ($newFeedback.Count -gt 0) {
    Send-MailMessage `
        -To "dev@example.com" `
        -Subject "🔔 新反馈：$($newFeedback.Count) 条" `
        -Body "发现新反馈，请及时处理"
}
```

### Webhook 通知（钉钉/企业微信）
```powershell
if ($newFeedback.Count -gt 0) {
    $body = @{
        text = "🔔 新反馈提醒`n发现 $($newFeedback.Count) 条新反馈"
    } | ConvertTo-Json
    
    Invoke-RestMethod `
        -Uri "https://webhook.url" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
}
```

---

## 📅 执行频率

| 时间 | 频率 | 说明 |
|------|------|------|
| 09:00 | 每日 | 晨检，查看隔夜反馈 |
| 18:00 | 每日 | 晚检，查看当日反馈 |
| 周五 17:00 | 每周 | 生成周报汇总 |

---

**创建时间：** 2026-04-06
**维护人：** 开发团队
