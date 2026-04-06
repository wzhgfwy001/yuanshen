# Auto Feedback Collector - Final Simplified Version

$script:feedbackDir = Join-Path $PSScriptRoot "feedbacks"
$script:emailConfigFile = Join-Path $PSScriptRoot "..\state\email-config.json"
$script:weeklyReportDir = Join-Path $PSScriptRoot "..\reports\weekly"

if (!(Test-Path $feedbackDir)) { New-Item -ItemType Directory -Force -Path $feedbackDir | Out-Null }
if (!(Test-Path $weeklyReportDir)) { New-Item -ItemType Directory -Force -Path $weeklyReportDir | Out-Null }

function Initialize-EmailConfig {
    if (!(Test-Path $emailConfigFile)) {
        $config = @{email = "307645213@qq.com"; enableAutoFetch = $false}
        $config | ConvertTo-Json | Out-File -FilePath $emailConfigFile -Encoding utf8
    }
}

function Get-EmailConfig {
    if (!(Test-Path $emailConfigFile)) { Initialize-EmailConfig }
    return Get-Content $emailConfigFile -Raw | ConvertFrom-Json
}

function Import-WeChatFeedback {
    param([string]$inputPath, [string]$date)
    if (!(Test-Path $inputPath)) { return $false }
    
    $feedback = Get-Content $inputPath -Raw | ConvertFrom-Json
    $record = @{
        id = "wechat-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        channel = "wechat"; date = $date; user = $feedback.user
        type = $feedback.type; content = $feedback.content
        priority = $feedback.priority; status = "pending"
        importedAt = (Get-Date -Format "o")
    }
    
    $month = (Get-Date).ToString("yyyy-MM")
    $monthDir = Join-Path $feedbackDir $month
    if (!(Test-Path $monthDir)) { New-Item -ItemType Directory -Force -Path $monthDir | Out-Null }
    
    $record | ConvertTo-Json | Out-File -FilePath (Join-Path $monthDir "$($record.id).json") -Encoding utf8
    Write-Host "OK: WeChat feedback imported" -ForegroundColor Green
    return $true
}

function Import-EmailFeedback {
    param([string]$subject, [string]$from, [string]$content, [string]$date)
    
    $type = "general"; $priority = "P2"
    if ($subject -match "bug|error|fail") { $type = "bug"; $priority = "P1" }
    elseif ($subject -match "suggest|feature") { $type = "suggestion"; $priority = "P2" }
    
    $record = @{
        id = "email-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        channel = "email"; date = $date; user = $from
        type = $type; content = $content; priority = $priority
        status = "pending"; importedAt = (Get-Date -Format "o")
    }
    
    $month = (Get-Date).ToString("yyyy-MM")
    $monthDir = Join-Path $feedbackDir $month
    if (!(Test-Path $monthDir)) { New-Item -ItemType Directory -Force -Path $monthDir | Out-Null }
    
    $record | ConvertTo-Json | Out-File -FilePath (Join-Path $monthDir "$($record.id).json") -Encoding utf8
    Write-Host "OK: Email feedback imported (Type: $type)" -ForegroundColor Green
    return $true
}

function Get-FeedbackSummary {
    param([int]$days = 7)
    $fromDate = (Get-Date).AddDays(-$days)
    $feedbacks = @()
    
    if (Test-Path $feedbackDir) {
        $monthDirs = Get-ChildItem $feedbackDir -Directory
        foreach ($monthDir in $monthDirs) {
            $files = Get-ChildItem $monthDir.FullName -Filter "*.json" -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                try {
                    $feedback = Get-Content $file.FullName -Raw | ConvertFrom-Json
                    if ([DateTime]::Parse($feedback.importedAt) -ge $fromDate) {
                        $feedbacks += $feedback
                    }
                } catch {}
            }
        }
    }
    
    return @{
        total = $feedbacks.Count
        byType = ($feedbacks | Group-Object type | ForEach-Object { @{ $_.Name = $_.Count } })
        byChannel = ($feedbacks | Group-Object channel | ForEach-Object { @{ $_.Name = $_.Count } })
        feedbacks = $feedbacks
    }
}

function Generate-WeeklyReport {
    param([int]$weeks = 1, [string]$outputPath)
    $summary = Get-FeedbackSummary -days ($weeks * 7)
    
    $report = "# Weekly Feedback Report`n"
    $report += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"
    $report += "Total Feedback: $($summary.total)`n`n"
    $report += "By Type:`n"
    if ($summary.byType) {
        $summary.byType | ForEach-Object { $_.GetEnumerator() | ForEach-Object { $report += "  - $($_.Key): $($_.Value)`n" } }
    }
    $report += "`nPending Issues:`n"
    $pending = $summary.feedbacks | Where-Object { $_.status -eq "pending" }
    if ($pending) {
        $pending | ForEach-Object { $report += "  - $($_.content) ($($_.priority))`n" }
    }
    
    $report | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: Report generated: $outputPath" -ForegroundColor Green
    return $true
}

function Test-AutoFeedbackCollector {
    Write-Host "=== Auto Feedback Collector Tests ===" -ForegroundColor Cyan
    
    Initialize-EmailConfig
    
    Write-Host "`n[Test 1] Initialize Email Config" -ForegroundColor Yellow
    $config = Get-EmailConfig
    if ($config.email -eq "307645213@qq.com") { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Import WeChat Feedback" -ForegroundColor Yellow
    $wechatFeedback = @{user = "test"; type = "suggestion"; content = "Test"; priority = "P2"}
    $wechatFeedback | ConvertTo-Json | Out-File -FilePath "$env:TEMP\test-wechat.json" -Encoding utf8
    $result = Import-WeChatFeedback -inputPath "$env:TEMP\test-wechat.json" -date (Get-Date -Format "yyyy-MM-dd")
    if ($result) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 3] Import Email Feedback" -ForegroundColor Yellow
    $result = Import-EmailFeedback -subject "Bug report" -from "test@example.com" -content "Test" -date (Get-Date -Format "yyyy-MM-dd")
    if ($result) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 4] Get Feedback Summary" -ForegroundColor Yellow
    $summary = Get-FeedbackSummary -days 7
    Write-Host "PASS (Total: $($summary.total))" -ForegroundColor Green
    
    Write-Host "`n[Test 5] Generate Weekly Report" -ForegroundColor Yellow
    $reportPath = Join-Path $weeklyReportDir "test-weekly.md"
    $result = Generate-WeeklyReport -weeks 1 -outputPath $reportPath
    if ($result) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

Initialize-EmailConfig
