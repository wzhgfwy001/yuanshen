# 每日反馈检查脚本
# 运行时间：每天 09:00

param(
    [string]$SkillPath = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== 阳神系统 - 每日反馈检查 ===" -ForegroundColor Cyan
Write-Host ("时间: " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host ""

# 1. 检查反馈目录
$feedbackDir = Join-Path $SkillPath "feedbacks"
if (!(Test-Path $feedbackDir)) {
    New-Item -ItemType Directory -Path $feedbackDir -Force | Out-Null
    Write-Host "[1/5] 创建反馈目录: $feedbackDir" -ForegroundColor Green
} else {
    Write-Host "[1/5] 检查反馈目录: $feedbackDir" -ForegroundColor Green
}

# 2. 列出已有反馈
$existingFeedback = Get-ChildItem $feedbackDir -Filter "*.md" | Select-Object Name, LastWriteTime
Write-Host "[2/5] 已有反馈文件:" -ForegroundColor Green
Write-Host ("  数量: " + $existingFeedback.Count)
if ($existingFeedback.Count -gt 0) {
    $existingFeedback | ForEach-Object { Write-Host ("  - " + $_.Name + " (" + $_.LastWriteTime + ")") }
}

# 3. 检查 USER-FEEDBACK.md
$userFeedbackPath = Join-Path $SkillPath "operations\USER-FEEDBACK.md"
if (Test-Path $userFeedbackPath) {
    Write-Host "[3/5] USER-FEEDBACK.md 存在" -ForegroundColor Green
} else {
    Write-Host "[3/5] USER-FEEDBACK.md 不存在，需要创建" -ForegroundColor Yellow
}

# 4. 提示手动检查
Write-Host "[4/5] SkillHub 评论检查..." -ForegroundColor Green
Write-Host "  提示: 请手动访问 https://console.cloud.tencent.com/skillhub 查看评论" -ForegroundColor Gray

# 5. 生成检查报告
$reportPath = Join-Path $feedbackDir ("daily-check-" + (Get-Date -Format 'yyyyMMdd') + ".md")
$checkDate = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$feedbackCount = $existingFeedback.Count
$lastUpdate = if($existingFeedback.Count -gt 0){$existingFeedback[0].LastWriteTime.ToString('yyyy-MM-dd')}else{'无'}

$report = @"
# 每日反馈检查报告

**检查时间:** $checkDate
**检查人:** 阳神系统自动检查

## 反馈统计

- 已有反馈文件: $feedbackCount
- 最后更新: $lastUpdate

## 反馈列表

"@

if ($existingFeedback.Count -gt 0) {
    $existingFeedback | ForEach-Object {
        $report += "- " + $_.Name + "`n"
    }
} else {
    $report += "暂无反馈文件`n"
}

$report += @"

## 下次检查

下次检查时间: 明天 09:00

---
*由阳神系统自动生成*
"@

Set-Content -Path $reportPath -Value $report -Encoding UTF8
Write-Host "[5/5] 检查报告已生成: $reportPath" -ForegroundColor Green

Write-Host ""
Write-Host "=== 检查完成 ===" -ForegroundColor Cyan
Write-Host "如有新反馈，请:" -ForegroundColor Yellow
Write-Host "  1. 访问 SkillHub 管理后台查看" -ForegroundColor Gray
Write-Host "  2. 添加到 feedbacks/ 目录" -ForegroundColor Gray
Write-Host "  3. 更新 USER-FEEDBACK.md" -ForegroundColor Gray
