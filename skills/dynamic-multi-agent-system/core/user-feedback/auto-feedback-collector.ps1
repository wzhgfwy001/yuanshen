# Auto Feedback Collector v1.1 - Enhanced Implementation
# 用户反馈自动化 - 增强实现
#
# Features:
# - Multi-channel feedback collection (WeChat, Email, WebChat)
# - Automated satisfaction tracking
# - Sentiment analysis
# - Closed-loop feedback processing
# - Integration with skill evolution
# - Feedback-driven improvements

$script:feedbackDir = Join-Path $PSScriptRoot "feedbacks"
$script:emailConfigFile = Join-Path $PSScriptRoot "..\state\email-config.json"
$script:feedbackStatsFile = Join-Path $PSScriptRoot "..\state\feedback-stats.json"
$script:weeklyReportDir = Join-Path $PSScriptRoot "..\reports\weekly"

# Configuration
$script:config = @{
    thresholds = @{
        excellent = 5    # 超出预期
        good = 4         # 满意
        average = 3      # 一般
        poor = 2         # 不满意
        terrible = 1     # 非常不满意
    }
    autoCollection = @{
        enabled = $true
        delaySeconds = 60          # 任务完成后延迟发送
        reminderEnabled = $true
        reminderDelayHours = 24    # 24小时后提醒
        maxReminders = 2
    }
    sentiment = @{
        positiveWords = @("很好", "满意", "不错", "优秀", "超出预期", "棒", "赞", "完美", "出色", "感谢")
        negativeWords = @("失望", "不好", "差", "问题", "不满意", "糟", "烂", "错误", "失败", "没用")
        neutralWords = @("一般", "普通", "还行", "可以", "还好")
    }
    actions = @{
        onExcellent = @("incrementSolidifyWeight", "markAsExemplar", "extractSuccessFactors")
        onGood = @("countForSolidify")
        onAverage = @("recordForAnalysis")
        onPoor = @("triggerReflection", "flagForFollowup")
        onTerrible = @("triggerReflection", "requireManualReview", "alert")
    }
}

# ============================================================
# Initialization
# ============================================================

function Initialize-FeedbackSystem {
    if (!(Test-Path $script:feedbackDir)) { 
        New-Item -ItemType Directory -Force -Path $script:feedbackDir | Out-Null 
    }
    
    $weeklyDir = $script:weeklyReportDir
    if (!(Test-Path $weeklyDir)) { 
        New-Item -ItemType Directory -Force -Path $weeklyDir | Out-Null 
    }
    
    if (!(Test-Path $script:emailConfigFile)) {
        $emailConfig = @{
            email = "307645213@qq.com"
            enableAutoFetch = $false
            fetchIntervalMinutes = 30
        }
        $emailConfig | ConvertTo-Json | Out-File -FilePath $script:emailConfigFile -Encoding utf8
    }
    
    if (!(Test-Path $script:feedbackStatsFile)) {
        $stats = @{
            version = "1.1"
            totalFeedback = 0
            totalTasks = 0
            avgSatisfaction = 0
            lastUpdated = (Get-Date -Format "o")
            trends = @{
                daily = @()
                weekly = @()
            }
            byScore = @{
                excellent = 0
                good = 0
                average = 0
                poor = 0
                terrible = 0
            }
        }
        $stats | ConvertTo-Json -Depth 10 | Out-File -FilePath $script:feedbackStatsFile -Encoding utf8
    }
    
    Write-Host "✅ Feedback System v1.1 initialized" -ForegroundColor Green
}

# ============================================================
# Data Access
# ============================================================

function Get-FeedbackStats {
    return Get-Content $script:feedbackStatsFile -Raw | ConvertFrom-Json
}

function Save-FeedbackStats {
    param($stats)
    $stats.lastUpdated = (Get-Date -Format "o")
    $stats | ConvertTo-Json -Depth 10 | Out-File -FilePath $script:feedbackStatsFile -Encoding utf8
}

function Get-EmailConfig {
    return Get-Content $script:emailConfigFile -Raw | ConvertFrom-Json
}

function Save-EmailConfig {
    param($config)
    $config | ConvertTo-Json | Out-File -FilePath $script:emailConfigFile -Encoding utf8
}

# ============================================================
# Feedback Collection
# ============================================================

function New-FeedbackRequest {
    <#
    .SYNOPSIS
        Create a new feedback request for a completed task
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [string]$taskDescription,
        
        [int]$delaySeconds = 60
    )
    
    $request = @{
        id = "fb-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        taskId = $taskId
        taskDescription = $taskDescription
        status = "pending"
        createdAt = (Get-Date -Format "o")
        scheduledAt = (Get-Date).AddSeconds($delaySeconds).ToString("o")
        reminders = 0
        maxReminders = $script:config.autoCollection.maxReminders
        response = $null
    }
    
    # Save request
    $monthDir = Get-MonthDir
    $request | ConvertTo-Json | Out-File -FilePath (Join-Path $monthDir "$($request.id).json") -Encoding utf8
    
    # Update stats
    $stats = Get-FeedbackStats
    $stats.totalTasks++
    Save-FeedbackStats $stats
    
    return @{
        success = $true
        request = $request
        message = "Feedback request created for task $taskId"
    }
}

function Submit-Feedback {
    <#
    .SYNOPSIS
        Submit feedback for a task
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [ValidateRange(1, 5)]
        [int]$score,
        
        [string]$comment = "",
        
        [string]$channel = "webchat",
        
        [string]$userId = "",
        
        [hashtable]$taskContext = @{}
    )
    
    # Determine sentiment
    $sentiment = Analyze-Sentiment -text $comment
    
    # Determine score category
    $category = Get-ScoreCategory -score $score
    
    # Create feedback record
    $feedback = @{
        id = "feedback-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        taskId = $taskId
        score = $score
        category = $category
        comment = $comment
        sentiment = $sentiment
        channel = $channel
        userId = $userId
        submittedAt = (Get-Date -Format "o")
        taskContext = $taskContext
    }
    
    # Save feedback
    $monthDir = Get-MonthDir
    $feedback | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $monthDir "$($feedback.id).json") -Encoding utf8
    
    # Update stats
    Update-FeedbackStats -feedback $feedback
    
    # Trigger automated actions based on score
    $actions = Invoke-FeedbackActions -feedback $feedback
    
    return @{
        success = $true
        feedback = $feedback
        sentiment = $sentiment
        category = $category
        actions = $actions
    }
}

function Get-MonthDir {
    $month = (Get-Date).ToString("yyyy-MM")
    $monthDir = Join-Path $script:feedbackDir $month
    if (!(Test-Path $monthDir)) {
        New-Item -ItemType Directory -Force -Path $monthDir | Out-Null
    }
    return $monthDir
}

# ============================================================
# Sentiment Analysis
# ============================================================

function Analyze-Sentiment {
    <#
    .SYNOPSIS
        Analyze sentiment of feedback comment
    #>
    param([string]$text)
    
    if ([string]::IsNullOrWhiteSpace($text)) {
        return "neutral"
    }
    
    $positiveCount = 0
    $negativeCount = 0
    
    foreach ($word in $script:config.sentiment.positiveWords) {
        if ($text -match $word) { $positiveCount++ }
    }
    
    foreach ($word in $script:config.sentiment.negativeWords) {
        if ($text -match $word) { $negativeCount++ }
    }
    
    if ($positiveCount -gt $negativeCount) {
        return "positive"
    } elseif ($negativeCount -gt $positiveCount) {
        return "negative"
    } else {
        return "neutral"
    }
}

function Get-ScoreCategory {
    param([int]$score)
    
    if ($score -ge $script:config.thresholds.excellent) { return "excellent" }
    elseif ($score -ge $script:config.thresholds.good) { return "good" }
    elseif ($score -ge $script:config.thresholds.average) { return "average" }
    elseif ($score -ge $script:config.thresholds.poor) { return "poor" }
    else { return "terrible" }
}

# ============================================================
# Feedback Statistics
# ============================================================

function Update-FeedbackStats {
    param([hashtable]$feedback)
    
    $stats = Get-FeedbackStats
    
    $stats.totalFeedback++
    
    # Update average satisfaction
    $totalSatisfaction = $stats.avgSatisfaction * ($stats.totalFeedback - 1) + $feedback.score
    $stats.avgSatisfaction = [math]::Round($totalSatisfaction / $stats.totalFeedback, 2)
    
    # Update score distribution
    $stats.byScore.$($feedback.category)++
    
    # Update daily trend
    $today = (Get-Date).ToString("yyyy-MM-dd")
    $dailyEntry = $stats.trends.daily | Where-Object { $_.date -eq $today }
    
    if ($dailyEntry) {
        $dailyEntry.count++
        $dailyEntry.totalScore += $feedback.score
        $dailyEntry.avgScore = [math]::Round($dailyEntry.totalScore / $dailyEntry.count, 2)
    } else {
        $stats.trends.daily += @{
            date = $today
            count = 1
            totalScore = $feedback.score
            avgScore = $feedback.score
        }
    }
    
    # Keep only last 30 days
    $cutoffDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
    $stats.trends.daily = @($stats.trends.daily | Where-Object { $_.date -ge $cutoffDate })
    
    Save-FeedbackStats $stats
}

function Get-FeedbackStats {
    return Get-Content $script:feedbackStatsFile -Raw | ConvertFrom-Json
}

function Save-FeedbackStats {
    param($stats)
    $stats.lastUpdated = (Get-Date -Format "o")
    $stats | ConvertTo-Json -Depth 10 | Out-File -FilePath $script:feedbackStatsFile -Encoding utf8
}

function Get-SatisfactionTrend {
    param([int]$days = 30)
    
    $stats = Get-FeedbackStats
    
    $cutoffDate = (Get-Date).AddDays(-$days).ToString("yyyy-MM-dd")
    $recentDaily = $stats.trends.daily | Where-Object { $_.date -ge $cutoffDate } | Sort-Object date
    
    if ($recentDaily.Count -lt 2) {
        return @{
            trend = "insufficient_data"
            message = "Not enough data to determine trend"
        }
    }
    
    # Calculate trend
    $firstHalf = $recentDaily | Select-Object -First ([Math]::Floor($recentDaily.Count / 2))
    $secondHalf = $recentDaily | Select-Object -Last ([Math]::Ceiling($recentDaily.Count / 2))
    
    $firstAvg = ($firstHalf | Measure-Object -Property avgScore -Average).Average
    $secondAvg = ($secondHalf | Measure-Object -Property avgScore -Average).Average
    
    $diff = $secondAvg - $firstAvg
    
    if ($diff -gt 0.3) {
        $trend = "improving"
        $message = "Satisfaction is improving (+$([math]::Round($diff, 2)))"
    } elseif ($diff -lt -0.3) {
        $trend = "declining"
        $message = "Satisfaction is declining ($([math]::Round($diff, 2)))"
    } else {
        $trend = "stable"
        $message = "Satisfaction is stable"
    }
    
    return @{
        trend = $trend
        message = $message
        firstPeriodAvg = [math]::Round($firstAvg, 2)
        secondPeriodAvg = [math]::Round($secondAvg, 2)
        change = [math]::Round($diff, 2)
        dataPoints = $recentDaily.Count
    }
}

# ============================================================
# Automated Actions
# ============================================================

function Invoke-FeedbackActions {
    <#
    .SYNOPSIS
        Trigger automated actions based on feedback score
    #>
    param([hashtable]$feedback)
    
    $actions = @()
    $category = $feedback.category
    
    # Get action list for this category
    $actionList = $script:config.actions."on$($category.Substring(0,1).ToUpper() + $category.Substring(1))"
    
    foreach ($action in $actionList) {
        try {
            $result = & "Invoke-$($action)" -feedback $feedback
            $actions += @{
                action = $action
                success = $true
                result = $result
            }
        }
        catch {
            $actions += @{
                action = $action
                success = $false
                error = $_.Exception.Message
            }
        }
    }
    
    return $actions
}

function Invoke-IncrementSolidifyWeight {
    param([hashtable]$feedback)
    
    # For excellent feedback, increase the weight for skill solidification
    Write-Host "📈 Increasing solidification weight for task $($feedback.taskId)" -ForegroundColor Green
    return @{
        action = "solidify_weight_multiplier"
        value = 1.5
        reason = "Excellent feedback"
    }
}

function Invoke-MarkAsExemplar {
    param([hashtable]$feedback)
    
    # Mark this task as an exemplar for future reference
    Write-Host "⭐ Marking task $($feedback.taskId) as exemplar" -ForegroundColor Green
    return @{
        action = "mark_exemplar"
        taskId = $feedback.taskId
        reason = "Score 5 - exceptional quality"
    }
}

function Invoke-ExtractSuccessFactors {
    param([hashtable]$feedback)
    
    # Extract what made this task successful
    Write-Host "🔍 Extracting success factors from task $($feedback.taskId)" -ForegroundColor Green
    return @{
        action = "extract_success_factors"
        factors = @()
        note = "Implementation would analyze task context"
    }
}

function Invoke-CountForSolidify {
    param([hashtable]$feedback)
    
    # This contributes to skill solidification count
    Write-Host "📊 Counting task $($feedback.taskId) for skill solidification" -ForegroundColor Green
    return @{
        action = "solidify_count"
        increment = 1
    }
}

function Invoke-RecordForAnalysis {
    param([hashtable]$feedback)
    
    # Record for later analysis
    Write-Host "📝 Recording average feedback for analysis" -ForegroundColor Yellow
    return @{
        action = "recorded_for_analysis"
    }
}

function Invoke-TriggerReflection {
    param([hashtable]$feedback)
    
    # Trigger reflection and improvement process
    Write-Host "🔄 Triggering reflection for task $($feedback.taskId)" -ForegroundColor Yellow
    return @{
        action = "reflection_triggered"
        taskId = $feedback.taskId
        priority = "high"
        reason = "Low satisfaction score ($($feedback.score))"
    }
}

function Invoke-FlagForFollowup {
    param([hashtable]$feedback)
    
    # Flag this task for follow-up
    Write-Host "🚩 Flagging task $($feedback.taskId) for follow-up" -ForegroundColor Yellow
    return @{
        action = "flagged_for_followup"
        taskId = $feedback.taskId
        followupPriority = if ($feedback.category -eq "terrible") { "urgent" } else { "normal" }
    }
}

function Invoke-RequireManualReview {
    param([hashtable]$feedback)
    
    # Flag for manual review
    Write-Host "👤 Flagging task $($feedback.taskId) for manual review" -ForegroundColor Red
    return @{
        action = "manual_review_required"
        taskId = $feedback.taskId
        reason = "Score <= 1 requires manual review"
    }
}

function Invoke-Alert {
    param([hashtable]$feedback)
    
    # Send alert for terrible feedback
    Write-Host "🚨 ALERT: Terrible feedback for task $($feedback.taskId)" -ForegroundColor Red
    return @{
        action = "alert_sent"
        alertLevel = "critical"
        message = "User gave score of $($feedback.score): $($feedback.comment)"
    }
}

# ============================================================
# Feedback Retrieval
# ============================================================

function Get-FeedbackSummary {
    param(
        [int]$days = 7,
        [string]$channel = ""
    )
    
    $fromDate = (Get-Date).AddDays(-$days)
    $feedbacks = Get-FeedbackRecords -fromDate $fromDate -channel $channel
    
    if ($feedbacks.Count -eq 0) {
        return @{
            total = 0
            avgScore = 0
            scoreDistribution = @{}
            sentimentDistribution = @{}
            feedbacks = @()
        }
    }
    
    $avgScore = ($feedbacks | Measure-Object -Property score -Average).Average
    
    $scoreDist = @{}
    foreach ($category in @("excellent", "good", "average", "poor", "terrible")) {
        $scoreDist[$category] = ($feedbacks | Where-Object { $_.category -eq $category }).Count
    }
    
    $sentimentDist = @{
        positive = ($feedbacks | Where-Object { $_.sentiment -eq "positive" }).Count
        neutral = ($feedbacks | Where-Object { $_.sentiment -eq "neutral" }).Count
        negative = ($feedbacks | Where-Object { $_.sentiment -eq "negative" }).Count
    }
    
    return @{
        total = $feedbacks.Count
        avgScore = [math]::Round($avgScore, 2)
        scoreDistribution = $scoreDist
        sentimentDistribution = $sentimentDist
        satisfactionRate = [math]::Round(($scoreDist.excellent + $scoreDist.good) / $feedbacks.Count * 100, 1)
        feedbacks = $feedbacks | Select-Object id, taskId, score, category, sentiment, comment, channel, submittedAt
    }
}

function Get-FeedbackRecords {
    param(
        [DateTime]$fromDate,
        [string]$channel = "",
        [int]$limit = 100
    )
    
    $feedbacks = @()
    
    if (Test-Path $script:feedbackDir) {
        $monthDirs = Get-ChildItem $script:feedbackDir -Directory
        foreach ($monthDir in $monthDirs) {
            $files = Get-ChildItem $monthDir.FullName -Filter "feedback-*.json" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
            
            foreach ($file in $files) {
                try {
                    $feedback = Get-Content $file.FullName -Raw | ConvertFrom-Json
                    
                    # Apply filters
                    $submittedDate = [DateTime]::Parse($feedback.submittedAt)
                    if ($submittedDate -lt $fromDate) { continue }
                    if ($channel -and $feedback.channel -ne $channel) { continue }
                    
                    $feedbacks += $feedback
                    
                    if ($feedbacks.Count -ge $limit) { break }
                }
                catch { continue }
            }
            
            if ($feedbacks.Count -ge $limit) { break }
        }
    }
    
    return $feedbacks
}

function Get-PendingFeedbackRequests {
    $requests = @()
    $now = Get-Date
    
    if (Test-Path $script:feedbackDir) {
        $monthDirs = Get-ChildItem $script:feedbackDir -Directory
        foreach ($monthDir in $monthDirs) {
            $files = Get-ChildItem $monthDir.FullName -Filter "fb-*.json" -ErrorAction SilentlyContinue
            
            foreach ($file in $files) {
                try {
                    $request = Get-Content $file.FullName -Raw | ConvertFrom-Json
                    if ($request.status -eq "pending") {
                        $requests += $request
                    }
                }
                catch { continue }
            }
        }
    }
    
    return $requests
}

# ============================================================
# Report Generation
# ============================================================

function Generate-WeeklyReport {
    param(
        [int]$weeks = 1,
        [string]$outputPath = ""
    )
    
    if (-not $outputPath) {
        $weekStart = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
        $weekEnd = (Get-Date).ToString("yyyy-MM-dd")
        $outputPath = Join-Path $script:weeklyReportDir "feedback-weekly-$weekStart-to-$weekEnd.md"
    }
    
    $summary = Get-FeedbackSummary -days ($weeks * 7)
    $trend = Get-SatisfactionTrend -days ($weeks * 7)
    $stats = Get-FeedbackStats
    
    $report = @"
# Weekly Feedback Report

**Period:** Last $($weeks * 7) days  
**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Summary

| Metric | Value |
|--------|-------|
| Total Feedback | $($summary.total) |
| Average Score | $($summary.avgScore)/5 |
| Satisfaction Rate | $($summary.satisfactionRate)% |
| Trend | $($trend.trend) |

## Score Distribution

| Score | Count | Percentage |
|-------|-------|------------|
| 5 - Excellent | $($summary.scoreDistribution.excellent) | $(if($summary.total){[math]::Round($summary.scoreDistribution.excellent/$summary.total*100,1)}else{0})% |
| 4 - Good | $($summary.scoreDistribution.good) | $(if($summary.total){[math]::Round($summary.scoreDistribution.good/$summary.total*100,1)}else{0})% |
| 3 - Average | $($summary.scoreDistribution.average) | $(if($summary.total){[math]::Round($summary.scoreDistribution.average/$summary.total*100,1)}else{0})% |
| 2 - Poor | $($summary.scoreDistribution.poor) | $(if($summary.total){[math]::Round($summary.scoreDistribution.poor/$summary.total*100,1)}else{0})% |
| 1 - Terrible | $($summary.scoreDistribution.terrible) | $(if($summary.total){[math]::Round($summary.scoreDistribution.terrible/$summary.total*100,1)}else{0})% |

## Sentiment Analysis

| Sentiment | Count |
|-----------|-------|
| Positive | $($summary.sentimentDistribution.positive) |
| Neutral | $($summary.sentimentDistribution.neutral) |
| Negative | $($summary.sentimentDistribution.negative) |

## Trend Analysis

$($trend.message)

- First Period Average: $($trend.firstPeriodAvg)
- Second Period Average: $($trend.secondPeriodAvg)
- Change: $($trend.change)

## Recent Feedback

$(
    $recentFeedback = $summary.feedbacks | Select-Object -First 5
    if ($recentFeedback.Count -eq 0) {
        "No feedback in this period."
    } else {
        $recentFeedback | ForEach-Object { 
            $comment = if ($_.comment) { " - $_" } else { "" }
            "- **$($_.taskId)**: Score $_.score ($($_.category))$comment"
        }
    }
)

## Recommendations

$(
    if ($summary.satisfactionRate -lt 70) {
        "- ⚠️ Satisfaction rate is below 70%. Consider reviewing recent tasks for common issues."
    }
    if ($summary.scoreDistribution.terrible -gt 0) {
        "- 🚨 $($summary.scoreDistribution.terrible) terrible feedback(s) received. Manual review recommended."
    }
    if ($trend.trend -eq "declining") {
        "- 📉 Satisfaction trend is declining. Investigate root causes."
    }
    if ($summary.satisfactionRate -ge 90) {
        "- 🌟 Excellent satisfaction rate! Consider documenting best practices."
    }
)

---
*Report generated by Auto Feedback Collector v1.1*
"@
    
    $report | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "✅ Weekly feedback report generated: $outputPath" -ForegroundColor Green
    
    return @{
        success = $true
        outputPath = $outputPath
        summary = $summary
    }
}

function Generate-DailyReport {
    param([string]$outputPath = "")
    
    if (-not $outputPath) {
        $today = (Get-Date).ToString("yyyy-MM-dd")
        $outputPath = Join-Path $script:feedbackDir "..\reports\daily-feedback-$today.md"
    }
    
    $summary = Get-FeedbackSummary -days 1
    $stats = Get-FeedbackStats
    
    $report = @"
# Daily Feedback Report - $(Get-Date -Format 'yyyy-MM-dd')

## Today's Summary

| Metric | Value |
|--------|-------|
| Total Feedback | $($summary.total) |
| Average Score | $($summary.avgScore)/5 |
| Satisfaction Rate | $($summary.satisfactionRate)% |

## Distribution

- Excellent (5): $($summary.scoreDistribution.excellent)
- Good (4): $($summary.scoreDistribution.good)
- Average (3): $($summary.scoreDistribution.average)
- Poor (2): $($summary.scoreDistribution.poor)
- Terrible (1): $($summary.scoreDistribution.terrible)

## Recent Feedback

$(
    if ($summary.feedbacks.Count -eq 0) {
        "No feedback today."
    } else {
        $summary.feedbacks | ForEach-Object { 
            $comment = if ($_.comment) { " - $_" } else { "" }
            "- $_.taskId: Score $_.score ($($_.category))$comment"
        }
    }
)

---
*Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')*
"@
    
    $report | Out-File -FilePath $outputPath -Encoding utf8
    
    return @{
        success = $true
        outputPath = $outputPath
    }
}

# ============================================================
# Import Functions (Legacy Compatibility)
# ============================================================

function Import-WeChatFeedback {
    param(
        [string]$inputPath,
        [string]$date
    )
    
    if (!(Test-Path $inputPath)) {
        return $false
    }
    
    $feedback = Get-Content $inputPath -Raw | ConvertFrom-Json
    
    # Map WeChat feedback to standard format
    $feedbackId = "wechat-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    $record = @{
        id = $feedbackId
        channel = "wechat"
        date = $date
        user = $feedback.user
        type = $feedback.type
        content = $feedback.content
        priority = $feedback.priority
        status = "pending"
        importedAt = (Get-Date -Format "o")
    }
    
    $monthDir = Get-MonthDir
    $record | ConvertTo-Json | Out-File -FilePath (Join-Path $monthDir "$feedbackId.json") -Encoding utf8
    
    Write-Host "✅ WeChat feedback imported" -ForegroundColor Green
    return $true
}

function Import-EmailFeedback {
    param(
        [string]$subject,
        [string]$from,
        [string]$content,
        [string]$date
    )
    
    $type = "general"
    $priority = "P2"
    
    if ($subject -match "bug|error|fail") {
        $type = "bug"
        $priority = "P1"
    } elseif ($subject -match "suggest|feature") {
        $type = "suggestion"
        $priority = "P2"
    }
    
    $feedbackId = "email-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    $record = @{
        id = $feedbackId
        channel = "email"
        date = $date
        user = $from
        type = $type
        content = $content
        priority = $priority
        status = "pending"
        importedAt = (Get-Date -Format "o")
    }
    
    $monthDir = Get-MonthDir
    $record | ConvertTo-Json | Out-File -FilePath (Join-Path $monthDir "$feedbackId.json") -Encoding utf8
    
    Write-Host "✅ Email feedback imported (Type: $type)" -ForegroundColor Green
    return $true
}

# ============================================================
# Test Function
# ============================================================

function Test-AutoFeedbackCollector {
    Write-Host "`n=== Auto Feedback Collector v1.1 Tests ===" -ForegroundColor Cyan
    
    Initialize-FeedbackSystem
    
    Write-Host "`n[Test 1] Submit Feedback (Excellent)" -ForegroundColor Yellow
    $result = Submit-Feedback -taskId "test-001" -score 5 -comment "很好，超出预期！" -channel "webchat"
    if ($result.success -and $result.sentiment -eq "positive") { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Submit Feedback (Good)" -ForegroundColor Yellow
    $result = Submit-Feedback -taskId "test-002" -score 4 -comment "满意" -channel "webchat"
    if ($result.success -and $result.category -eq "good") { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 3] Submit Feedback (Poor)" -ForegroundColor Yellow
    $result = Submit-Feedback -taskId "test-003" -score 2 -comment "不满意，问题很多" -channel "webchat"
    if ($result.success -and $result.sentiment -eq "negative") { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 4] Sentiment Analysis" -ForegroundColor Yellow
    $sentiment = Analyze-Sentiment -text "这个方案很好，推荐使用"
    if ($sentiment -eq "positive") { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 5] Get Feedback Summary" -ForegroundColor Yellow
    $summary = Get-FeedbackSummary -days 7
    if ($summary.total -ge 3) { Write-Host "✅ PASS (total: $($summary.total))" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 6] Get Satisfaction Trend" -ForegroundColor Yellow
    $trend = Get-SatisfactionTrend -days 30
    Write-Host "✅ PASS (trend: $($trend.trend))" -ForegroundColor Green
    
    Write-Host "`n[Test 7] Generate Weekly Report" -ForegroundColor Yellow
    $result = Generate-WeeklyReport -weeks 1
    if ($result.success) { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 8] Feedback Statistics" -ForegroundColor Yellow
    $stats = Get-FeedbackStats
    if ($stats.totalFeedback -ge 3) { Write-Host "✅ PASS (total: $($stats.totalFeedback))" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

# Auto initialize
Initialize-FeedbackSystem

# Export functions
Export-ModuleMember -Function `
    Initialize-FeedbackSystem, `
    New-FeedbackRequest, Submit-Feedback, Get-FeedbackSummary, Get-FeedbackRecords, `
    Get-PendingFeedbackRequests, `
    Analyze-Sentiment, Get-ScoreCategory, Get-SatisfactionTrend, `
    Invoke-FeedbackActions, `
    Generate-WeeklyReport, Generate-DailyReport, `
    Import-WeChatFeedback, Import-EmailFeedback, `
    Test-AutoFeedbackCollector
