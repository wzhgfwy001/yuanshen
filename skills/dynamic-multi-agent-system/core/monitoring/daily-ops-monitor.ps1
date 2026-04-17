# daily-ops-monitor.ps1
# 每日运营监控脚本

param(
    [switch]$SaveReport
)

$analyticsFile = "$PSScriptRoot\..\..\operations\skillhub-analytics.md"
$skillDir = "$PSScriptRoot\..\.."

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  每日运营监控" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 本地数据统计
Write-Host "[步骤1] 本地数据统计" -ForegroundColor Yellow

$coreModules = (Get-ChildItem "$skillDir\core" -Directory -ErrorAction SilentlyContinue).Count
Write-Host "   核心模块数：$coreModules"

$docsCount = (Get-ChildItem "$skillDir\docs" -Filter "*.md" -ErrorAction SilentlyContinue).Count
Write-Host "   文档数量：$docsCount"
Write-Host ""

# 2. 系统状态
Write-Host "[步骤2] 系统状态" -ForegroundColor Yellow
$gatewayStatus = try { Invoke-WebRequest -Uri "http://127.0.0.1:18789/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop; "正常" } catch { "异常" }
Write-Host "   Gateway状态：$gatewayStatus"
Write-Host ""

# 3. 生成分析报告
if ($SaveReport) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
    $timestampFull = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    
    $reportContent = "# SkillHub 运营数据分析`n`n"
    $reportContent += "**监控时间：** $timestamp`n"
    $reportContent += "**版本：** v1.9.1`n`n"
    $reportContent += "---`n`n"
    $reportContent += "## 本地数据统计`n`n"
    $reportContent += "| 指标 | 数值 |`n"
    $reportContent += "|------|------|`n"
    $reportContent += "| 核心模块数 | $coreModules |`n"
    $reportContent += "| 文档数量 | $docsCount |`n`n"
    $reportContent += "| Gateway状态 | $gatewayStatus |`n`n"
    $reportContent += "---`n`n"
    $reportContent += "*报告生成时间：$timestampFull*`n"
    
    $reportContent | Out-File $analyticsFile -Encoding utf8
    Write-Host "[完成] 报告已保存：$analyticsFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  监控完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
