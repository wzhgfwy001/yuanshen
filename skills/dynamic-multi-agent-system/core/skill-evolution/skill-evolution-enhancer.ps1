# Skill Evolution & Solidification Tracker v1.1
# Skill 固化追踪器 - 增强实现
#
# Features:
# - Enhanced solidification workflow
# - Version management
# - Auto-detection of patterns
# - Skill template generation
# - Central skill registry
# - Tracking analytics

$script:patternsFile = Join-Path $PSScriptRoot "..\..\state\skill-patterns.json"
$script:usageStatsFile = Join-Path $PSScriptRoot "..\..\state\skill-usage-stats.json"
$script:registryFile = Join-Path $PSScriptRoot "..\..\state\skill-registry.json"

# Configuration
$script:config = @{
    solidificationThreshold = 3        # 成功次数阈值
    qualityThreshold = 80               # 质量分数阈值
    stabilityWindow = 5               # 稳定性评估窗口
    maxExecutionsHistory = 20          # 保存最近执行数
    autoDetectEnabled = $true          # 自动检测模式
    approvalRequired = $true           # 是否需要用户确认
}

# ============================================================
# Initialization
# ============================================================

function Initialize-SkillEvolution {
    if (!(Test-Path $script:patternsFile)) {
        $patterns = @{
            version = "1.1"
            patterns = @()
            metadata = @{
                createdAt = (Get-Date -Format "o")
                lastUpdated = (Get-Date -Format "o")
            }
        }
        $patterns | ConvertTo-Json -Depth 15 | Out-File -FilePath $script:patternsFile -Encoding utf8
    }
    
    if (!(Test-Path $script:usageStatsFile)) {
        $stats = @{
            version = "1.1"
            stats = @()
            metadata = @{
                createdAt = (Get-Date -Format "o")
            }
        }
        $stats | ConvertTo-Json -Depth 10 | Out-File -FilePath $script:usageStatsFile -Encoding utf8
    }
    
    if (!(Test-Path $script:registryFile)) {
        $registry = @{
            version = "1.1"
            skills = @()
            metadata = @{
                createdAt = (Get-Date -Format "o")
                totalSkills = 0
            }
        }
        $registry | ConvertTo-Json -Depth 10 | Out-File -FilePath $script:registryFile -Encoding utf8
    }
    
    Write-Host "✅ Skill Evolution v1.1 initialized" -ForegroundColor Green
}

# ============================================================
# Data Access Functions
# ============================================================

function Get-Patterns {
    return Get-Content $script:patternsFile -Raw | ConvertFrom-Json
}

function Save-Patterns {
    param($patterns)
    $patterns.metadata.lastUpdated = (Get-Date -Format "o")
    $patterns | ConvertTo-Json -Depth 15 | Out-File -FilePath $script:patternsFile -Encoding utf8
}

function Get-UsageStats {
    return Get-Content $script:usageStatsFile -Raw | ConvertFrom-Json
}

function Save-UsageStats {
    param($stats)
    $stats | ConvertTo-Json -Depth 10 | Out-File -FilePath $script:usageStatsFile -Encoding utf8
}

function Get-SkillRegistry {
    return Get-Content $script:registryFile -Raw | ConvertFrom-Json
}

function Save-SkillRegistry {
    param($registry)
    $registry | ConvertTo-Json -Depth 10 | Out-File -FilePath $script:registryFile -Encoding utf8
}

# ============================================================
# Pattern Management
# ============================================================

function Register-Pattern {
    <#
    .SYNOPSIS
        Register a new execution pattern
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskType,
        
        [Parameter(Mandatory=$true)]
        [string[]]$agentRoles,
        
        [hashtable]$config = @{},
        
        [string]$description = ""
    )
    
    $patterns = Get-Patterns
    
    # Check if pattern exists
    $existing = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    if ($existing) {
        return @{
            success = $false
            error = "PATTERN_EXISTS"
            message = "Pattern $taskType already exists"
            pattern = $existing
        }
    }
    
    $pattern = @{
        type = $taskType
        description = $description
        successCount = 0
        failureCount = 0
        totalCount = 0
        createdAt = (Get-Date -Format "o")
        lastExecutionAt = $null
        lastSuccessAt = $null
        lastFailureAt = $null
        avgQualityScore = 0
        avgTokenUsage = 0
        avgDuration = 0
        avgUserSatisfaction = 0
        consistencyScore = 0
        isStable = $false
        isSolidified = $false
        solidifiedAt = $null
        version = "0.0.0"
        executions = @()
        agentRoles = $agentRoles
        config = $config
        evolutionHistory = @()
        qualityTrend = "unknown"  # improving, stable, declining
    }
    
    $patterns.patterns += $pattern
    Save-Patterns $patterns
    
    return @{
        success = $true
        message = "Pattern $taskType registered"
        pattern = $pattern
    }
}

function Record-TaskExecution {
    <#
    .SYNOPSIS
        Record a task execution result for pattern tracking
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskType,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("success", "failure")]
        [string]$result,
        
        [hashtable]$metrics = @{},
        
        [string[]]$agentRoles = @(),
        
        [hashtable]$config = @{},
        
        [string]$taskId = ""
    )
    
    $patterns = Get-Patterns
    
    # Find or create pattern
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (-not $pattern) {
        # Auto-register new pattern
        $pattern = @{
            type = $taskType
            description = ""
            successCount = 0
            failureCount = 0
            totalCount = 0
            createdAt = (Get-Date -Format "o")
            lastExecutionAt = $null
            lastSuccessAt = $null
            lastFailureAt = $null
            avgQualityScore = 0
            avgTokenUsage = 0
            avgDuration = 0
            avgUserSatisfaction = 0
            consistencyScore = 0
            isStable = $false
            isSolidified = $false
            solidifiedAt = $null
            version = "0.0.0"
            executions = @()
            agentRoles = $agentRoles
            config = $config
            evolutionHistory = @()
            qualityTrend = "unknown"
        }
        $patterns.patterns += $pattern
    }
    
    # Update counts
    $pattern.totalCount++
    $pattern.lastExecutionAt = (Get-Date -Format "o")
    
    if ($result -eq "success") {
        $pattern.successCount++
        $pattern.lastSuccessAt = (Get-Date -Format "o")
    } else {
        $pattern.failureCount++
        $pattern.lastFailureAt = (Get-Date -Format "o")
    }
    
    # Record execution details
    $execution = @{
        taskId = $taskId
        result = $result
        timestamp = (Get-Date -Format "o")
        qualityScore = if ($metrics.qualityScore) { $metrics.qualityScore } else { 0 }
        tokenUsage = if ($metrics.tokenUsage) { $metrics.tokenUsage } else { 0 }
        duration = if ($metrics.duration) { $metrics.duration } else { 0 }
        userSatisfaction = if ($metrics.userSatisfaction) { $metrics.userSatisfaction } else { 0 }
        agentRoles = $agentRoles
    }
    
    $pattern.executions += $execution
    
    # Keep only recent executions
    if ($pattern.executions.Count -gt $script:config.maxExecutionsHistory) {
        $pattern.executions = $pattern.executions | Select-Object -Last $script:config.maxExecutionsHistory
    }
    
    # Update averages
    $recentExecutions = $pattern.executions | Where-Object { $_.result -eq "success" }
    if ($recentExecutions.Count -gt 0) {
        $pattern.avgQualityScore = [math]::Round(($recentExecutions | Measure-Object -Property qualityScore -Average).Average, 2)
        $pattern.avgTokenUsage = [math]::Round(($recentExecutions | Measure-Object -Property tokenUsage -Average).Average, 0)
        $pattern.avgDuration = [math]::Round(($recentExecutions | Measure-Object -Property duration -Average).Average, 2)
        $pattern.avgUserSatisfaction = [math]::Round(($recentExecutions | Measure-Object -Property userSatisfaction -Average).Average, 2)
    }
    
    # Update consistency score
    $pattern.consistencyScore = Calculate-ConsistencyScore -pattern $pattern
    
    # Update quality trend
    $pattern.qualityTrend = Calculate-QualityTrend -pattern $pattern
    
    # Update agent roles if provided and consistent
    if ($agentRoles.Count -gt 0 -and $pattern.agentRoles.Count -eq 0) {
        $pattern.agentRoles = $agentRoles
    }
    
    # Check if pattern is stable
    $pattern.isStable = Check-PatternStability -pattern $pattern
    
    # Auto-detect solidification readiness
    if ($script:config.autoDetectEnabled -and -not $pattern.isSolidified) {
        $solidifyCheck = Check-SolidifyReadiness -taskType $taskType
        if ($solidifyCheck.ready) {
            Write-Host "📢 Pattern '$taskType' is ready for solidification! (Success count: $($pattern.successCount))" -ForegroundColor Magenta
        }
    }
    
    Save-Patterns $patterns
    
    return @{
        success = $true
        pattern = $pattern
        solidifyReady = $pattern.isStable -and $pattern.successCount -ge $script:config.solidificationThreshold
    }
}

function Calculate-ConsistencyScore {
    param([hashtable]$pattern)
    
    if ($pattern.executions.Count -lt 2) { return 0 }
    
    $recentExecs = $pattern.executions | Select-Object -Last $script:config.stabilityWindow
    
    # Check agent role consistency
    $roleSets = $recentExecs | ForEach-Object { ($_.agentRoles | Sort-Object) -join "," } | Select-Object -Unique
    $roleConsistency = $roleSets.Count / $recentExecs.Count
    
    # Check config consistency
    $configSets = $recentExecs | ForEach-Object { $_.config | ConvertTo-Json -Compress } | Select-Object -Unique
    $configConsistency = if ($configSets.Count -eq 1) { 1 } else { 0.5 }
    
    # Check duration variance
    $durations = $recentExecs | Where-Object { $_.duration -gt 0 } | ForEach-Object { $_.duration }
    $durationVariance = 0
    if ($durations.Count -gt 1) {
        $avg = ($durations | Measure-Object -Average).Average
        $variance = (($durations | ForEach-Object { [Math]::Pow($_ - $avg, 2) }) | Measure-Object -Average).Average
        $stdDev = [Math]::Sqrt($variance)
        $cv = $stdDev / $avg  # coefficient of variation
        $durationVariance = [Math]::Max(0, 1 - $cv)
    }
    
    return [math]::Round(($roleConsistency * 0.4 + $configConsistency * 0.3 + $durationVariance * 0.3) * 100, 1)
}

function Calculate-QualityTrend {
    param([hashtable]$pattern)
    
    $recentExecs = $pattern.executions | Where-Object { $_.result -eq "success" } | Select-Object -Last 5
    if ($recentExecs.Count -lt 3) { return "unknown" }
    
    $firstHalf = $recentExecs | Select-Object -First ([Math]::Floor($recentExecs.Count / 2))
    $secondHalf = $recentExecs | Select-Object -Last ([Math]::Ceiling($recentExecs.Count / 2))
    
    $firstAvg = ($firstHalf | Measure-Object -Property qualityScore -Average).Average
    $secondAvg = ($secondHalf | Measure-Object -Property qualityScore -Average).Average
    
    $diff = $secondAvg - $firstAvg
    
    if ($diff -gt 5) { return "improving" }
    elseif ($diff -lt -5) { return "declining" }
    else { return "stable" }
}

function Check-PatternStability {
    param([hashtable]$pattern)
    
    # Need minimum executions
    if ($pattern.successCount -lt 2) { return $false }
    
    # Consistency score threshold
    if ($pattern.consistencyScore -lt 70) { return $false }
    
    # Recent failures indicate instability
    $recentFailures = ($pattern.executions | Select-Object -Last 5 | Where-Object { $_.result -eq "failure" }).Count
    if ($recentFailures -gt 1) { return $false }
    
    return $true
}

function Get-PatternDetails {
    param([string]$taskType)
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (-not $pattern) {
        return $null
    }
    
    return @{
        type = $pattern.type
        description = $pattern.description
        stats = @{
            successCount = $pattern.successCount
            failureCount = $pattern.failureCount
            totalCount = $pattern.totalCount
            successRate = if ($pattern.totalCount -gt 0) { 
                [math]::Round($pattern.successCount / $pattern.totalCount * 100, 1) 
            } else { 0 }
        }
        averages = @{
            qualityScore = $pattern.avgQualityScore
            tokenUsage = $pattern.avgTokenUsage
            duration = $pattern.avgDuration
            userSatisfaction = $pattern.avgUserSatisfaction
        }
        indicators = @{
            consistencyScore = $pattern.consistencyScore
            isStable = $pattern.isStable
            qualityTrend = $pattern.qualityTrend
        }
        agentRoles = $pattern.agentRoles
        config = $pattern.config
        version = $pattern.version
        isSolidified = $pattern.isSolidified
        solidifiedAt = $pattern.solidifiedAt
        createdAt = $pattern.createdAt
        lastExecutionAt = $pattern.lastExecutionAt
    }
}

function Get-AllPatterns {
    $patterns = Get-Patterns
    
    return @{
        count = $patterns.patterns.Count
        patterns = $patterns.patterns | Select-Object type, successCount, avgQualityScore, isStable, isSolidified, consistencyScore
    }
}

# ============================================================
# Solidification Management
# ============================================================

function Check-SolidifyReadiness {
    <#
    .SYNOPSIS
        Check if a pattern is ready for solidification
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskType
    )
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (-not $pattern) {
        return @{
            ready = $false
            reason = "Pattern not found"
            requirements = @{
                minSuccessCount = $script:config.solidificationThreshold
                minQualityScore = $script:config.qualityThreshold
                minConsistency = 70
            }
        }
    }
    
    if ($pattern.isSolidified) {
        return @{
            ready = $false
            reason = "Already solidified"
            version = $pattern.version
        }
    }
    
    $checks = @{
        successCount = @{
            required = $script:config.solidificationThreshold
            actual = $pattern.successCount
            passed = $pattern.successCount -ge $script:config.solidificationThreshold
        }
        qualityScore = @{
            required = $script:config.qualityThreshold
            actual = $pattern.avgQualityScore
            passed = $pattern.avgQualityScore -ge $script:config.qualityThreshold
        }
        consistency = @{
            required = 70
            actual = $pattern.consistencyScore
            passed = $pattern.consistencyScore -ge 70
        }
        stability = @{
            required = $true
            actual = $pattern.isStable
            passed = $pattern.isStable
        }
    }
    
    $allPassed = ($checks.SuccessCount.passed -and $checks.QualityScore.passed -and 
                  $checks.Consistency.passed -and $checks.Stability.passed)
    
    $speedupEstimate = Estimate-Speedup -pattern $pattern
    
    return @{
        ready = $allPassed
        reason = if ($allPassed) { "All requirements met" } else { "Requirements not met" }
        checks = $checks
        estimatedSpeedup = $speedupEstimate
        confidence = if ($pattern.successCount -ge 5) { "High" } elseif ($pattern.successCount -ge 3) { "Medium" } else { "Low" }
    }
}

function Estimate-Speedup {
    param([hashtable]$pattern)
    
    # Estimate speedup based on pattern maturity
    if ($pattern.successCount -ge 5) {
        return "3-5x"
    } elseif ($pattern.successCount -ge 3) {
        return "2-3x"
    } else {
        return "1.5-2x"
    }
}

function Invoke-SolidifyPattern {
    <#
    .SYNOPSIS
        Solidify a pattern into a formal skill
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskType,
        
        [string]$skillName = "",
        
        [string]$version = "1.0.0",
        
        [switch]$Force
    )
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (-not $pattern) {
        return @{
            success = $false
            error = "PATTERN_NOT_FOUND"
            message = "Pattern $taskType not found"
        }
    }
    
    if ($pattern.isSolidified -and -not $Force) {
        return @{
            success = $false
            error = "ALREADY_SOLIDIFIED"
            message = "Pattern $taskType is already solidified as v$($pattern.version)"
        }
    }
    
    # Check readiness
    $readiness = Check-SolidifyReadiness -taskType $taskType
    if (-not $readiness.ready -and -not $Force) {
        return @{
            success = $false
            error = "NOT_READY"
            message = $readiness.reason
            checks = $readiness.checks
        }
    }
    
    # Generate skill name if not provided
    if (-not $skillName) {
        $skillName = $taskType -replace '-', '-' -replace '_', '-'
    }
    
    # Update pattern
    $pattern.isSolidified = $true
    $pattern.solidifiedAt = (Get-Date -Format "o")
    $pattern.version = $version
    
    # Add to evolution history
    $pattern.evolutionHistory += @{
        action = "solidified"
        timestamp = (Get-Date -Format "o")
        version = $version
        qualityScore = $pattern.avgQualityScore
        successCount = $pattern.successCount
    }
    
    Save-Patterns $patterns
    
    # Register in skill registry
    $registry = Get-SkillRegistry
    $skill = @{
        name = $skillName
        originalType = $taskType
        version = $version
        createdAt = (Get-Date -Format "o")
        solidifiedAt = (Get-Date -Format "o")
        agentRoles = $pattern.agentRoles
        config = $pattern.config
        stats = @{
            successCount = $pattern.successCount
            avgQualityScore = $pattern.avgQualityScore
            avgTokenUsage = $pattern.avgTokenUsage
            avgDuration = $pattern.avgDuration
        }
        estimatedSpeedup = $readiness.estimatedSpeedup
        usageCount = 0
        lastUsedAt = $null
    }
    
    $registry.skills += $skill
    $registry.metadata.totalSkills = $registry.skills.Count
    Save-SkillRegistry $registry
    
    return @{
        success = $true
        message = "Pattern $taskType solidified as skill '$skillName' v$version"
        skill = $skill
        estimatedSpeedup = $readiness.estimatedSpeedup
    }
}

function Get-SolidifiedSkills {
    $registry = Get-SkillRegistry
    
    return @{
        count = $registry.skills.Count
        skills = $registry.skills | Select-Object name, originalType, version, solidifiedAt, usageCount
    }
}

function Get-SkillFromRegistry {
    param(
        [string]$skillName,
        [string]$originalType
    )
    
    $registry = Get-SkillRegistry
    
    if ($skillName) {
        return $registry.skills | Where-Object { $_.name -eq $skillName }
    } elseif ($originalType) {
        return $registry.skills | Where-Object { $_.originalType -eq $originalType }
    }
    
    return $null
}

function Record-SkillUsage {
    <#
    .SYNOPSIS
        Record usage of a solidified skill
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$skillName,
        
        [hashtable]$metrics = @{}
    )
    
    $registry = Get-SkillRegistry
    $skill = $registry.skills | Where-Object { $_.name -eq $skillName }
    
    if (-not $skill) {
        return @{
            success = $false
            error = "SKILL_NOT_FOUND"
        }
    }
    
    $skill.usageCount++
    $skill.lastUsedAt = (Get-Date -Format "o")
    
    if ($metrics.tokenSaved) { $skill.stats.totalTokenSaved += $metrics.tokenSaved }
    if ($metrics.timeSaved) { $skill.stats.totalTimeSaved += $metrics.timeSaved }
    
    Save-SkillRegistry $registry
    
    return @{
        success = $true
        usageCount = $skill.usageCount
    }
}

# ============================================================
# Skill Template Generation
# ============================================================

function Export-SkillTemplate {
    <#
    .SYNOPSIS
        Generate a SKILL.md file for a solidified skill
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskType,
        
        [string]$outputPath = ""
    )
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (-not $pattern) {
        Write-Error "Pattern $taskType not found"
        return $false
    }
    
    if (-not $outputPath) {
        $outputPath = Join-Path $PSScriptRoot "..\skill-evolution\exports\$($taskType)-SKILL.md"
    }
    
    $template = @"
---
name: $('$taskType' -replace '-', '-')
description: 基于 $($pattern.successCount) 次成功执行固化的Skill，平均质量分数 $($pattern.avgQualityScore)
parent: dynamic-multi-agent-system
version: $($pattern.version)
---

# $($taskType) Skill

## 概述

此Skill基于 $($pattern.successCount) 次成功的 $($taskType) 任务执行经验固化而成。

### 性能指标

| 指标 | 值 |
|------|-----|
| 平均质量分数 | $($pattern.avgQualityScore) |
| 平均Token使用 | $($pattern.avgTokenUsage) |
| 平均执行时间 | $($pattern.avgDuration)s |
| 用户满意度 | $($pattern.avgUserSatisfaction)/5 |
| 预计加速比 | $( Estimate-Speedup -pattern $pattern ) |

## Agent角色

$( $pattern.agentRoles | ForEach-Object { "- $_" } )

## 配置

$( $pattern.config | ConvertTo-Json -Depth 5 )

## 使用方法

\`\`\`powershell
# 使用此Skill处理任务
Invoke-Skill -taskType "$taskType" -taskDescription "你的任务描述"
\`\`\`

## 执行流程

1. $( $pattern.agentRoles[0] )
$( 1..($pattern.agentRoles.Count - 1) | ForEach-Object { "$_'. ' + $pattern.agentRoles[$_]" } )

## 质量标准

- 质量分数目标：$($script:config.qualityThreshold)+
- 一致性分数：$($pattern.consistencyScore)+
- 稳定性：$( if ($pattern.isStable) { "已验证" } else { "待验证" } )

---

*固化时间：$($pattern.solidifiedAt)*
*来源：动态多Agent系统自动固化*
"@
    
    $dir = Split-Path $outputPath -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    
    $template | Out-File -FilePath $outputPath -Encoding utf8
    
    Write-Host "✅ Skill template exported to $outputPath" -ForegroundColor Green
    
    return $true
}

# ============================================================
# Analytics and Reporting
# ============================================================

function Get-SkillEvolutionReport {
    <#
    .SYNOPSIS
        Generate a comprehensive skill evolution report
    #>
    
    $patterns = Get-Patterns
    $registry = Get-SkillRegistry
    
    $patternStats = @{
        total = $patterns.patterns.Count
        solidified = ($patterns.patterns | Where-Object { $_.isSolidified }).Count
        inDevelopment = ($patterns.patterns | Where-Object { -not $_.isSolidified -and $_.successCount -gt 0 }).Count
        readyForSolidification = 0
        avgQuality = 0
        avgConsistency = 0
    }
    
    foreach ($p in $patterns.patterns) {
        if ((Check-SolidifyReadiness -taskType $p.type).ready) {
            $patternStats.readyForSolidification++
        }
        $patternStats.avgQuality += $p.avgQualityScore
        $patternStats.avgConsistency += $p.consistencyScore
    }
    
    if ($patterns.patterns.Count -gt 0) {
        $patternStats.avgQuality = [math]::Round($patternStats.avgQuality / $patterns.patterns.Count, 1)
        $patternStats.avgConsistency = [math]::Round($patternStats.avgConsistency / $patterns.patterns.Count, 1)
    }
    
    $registryStats = @{
        totalSkills = $registry.skills.Count
        totalUsages = ($registry.skills | Measure-Object -Property usageCount -Sum).Sum
        avgUsagePerSkill = if ($registry.skills.Count -gt 0) { 
            [math]::Round(($registry.skills | Measure-Object -Property usageCount -Average).Average, 1) 
        } else { 0 }
    }
    
    return @{
        generatedAt = (Get-Date -Format "o")
        patterns = $patternStats
        registry = $registryStats
        topPatterns = ($patterns.patterns | Sort-Object -Property successCount -Descending | Select-Object -First 5 | 
            Select-Object type, successCount, avgQualityScore, isStable)
        recentEvolutions = ($patterns.patterns | Where-Object { $_.evolutionHistory.Count -gt 0 } | 
            Select-Object -First 3 | ForEach-Object { $_.evolutionHistory | Select-Object -Last 1 })
    }
}

function Get-PatternTimeline {
    param([string]$taskType)
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (-not $pattern) {
        return $null
    }
    
    $timeline = @()
    
    foreach ($exec in $pattern.executions) {
        $timeline += @{
            date = $exec.timestamp
            event = if ($exec.result -eq "success") { "执行成功" } else { "执行失败" }
            qualityScore = $exec.qualityScore
            userSatisfaction = $exec.userSatisfaction
        }
    }
    
    foreach ($evo in $pattern.evolutionHistory) {
        $timeline += @{
            date = $evo.timestamp
            event = "演进: $($evo.action)"
            version = $evo.version
        }
    }
    
    return @{
        type = $taskType
        timeline = $timeline | Sort-Object date
        summary = @{
            firstExecution = if ($pattern.executions.Count -gt 0) { $pattern.executions[0].timestamp } else { $null }
            latestExecution = $pattern.lastExecutionAt
            totalEvolutions = $pattern.evolutionHistory.Count
            currentStatus = if ($pattern.isSolidified) { "已固化" } elseif ($pattern.isStable) { "稳定" } else { "发展中" }
        }
    }
}

# ============================================================
# Legacy Compatibility
# ============================================================

function Record-TaskSuccess {
    param([string]$taskType, [hashtable]$metrics)
    
    return Record-TaskExecution -taskType $taskType -result "success" -metrics $metrics `
        -agentRoles ($metrics.agentRoles -or @()) -config ($metrics.config -or @{}) `
        -taskId ($metrics.taskId -or "")
}

function Check-SolidifyRecommendation {
    param([string]$taskType)
    
    $readiness = Check-SolidifyReadiness -taskType $taskType
    
    return @{
        recommended = $readiness.ready
        reason = $readiness.reason
        estimatedSpeedup = $readiness.estimatedSpeedup
        confidence = $readiness.confidence
    }
}

function Get-QualityMetrics {
    param([string]$taskType)
    
    $details = Get-PatternDetails -taskType $taskType
    
    if (-not $details) { return $null }
    
    return @{
        taskType = $taskType
        avgQualityScore = $details.averages.qualityScore
        avgTokenUsage = $details.averages.tokenUsage
        avgDuration = $details.averages.duration
        avgUserSatisfaction = $details.averages.userSatisfaction
        qualityTrend = $details.indicators.qualityTrend
        consistencyScore = $details.indicators.consistencyScore
    }
}

function Record-SkillUsage-Legacy {
    param([string]$skillId, [string]$skillVersion, [hashtable]$metrics)
    
    return Record-SkillUsage -skillName $skillId -metrics $metrics
}

function Export-Skill-Legacy {
    param([string]$patternType, [string]$outputPath)
    
    return Export-SkillTemplate -taskType $patternType -outputPath $outputPath
}

# ============================================================
# Test Function
# ============================================================

function Test-SkillEvolution {
    Write-Host "`n=== Skill Evolution v1.1 Tests ===" -ForegroundColor Cyan
    
    Initialize-SkillEvolution
    
    Write-Host "`n[Test 1] Register Pattern" -ForegroundColor Yellow
    $result = Register-Pattern -taskType "test-pattern" -agentRoles @("role1", "role2") -description "Test pattern"
    if ($result.success) { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL: $($result.message)" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Record Execution (success)" -ForegroundColor Yellow
    $metrics = @{
        taskId = "test-001"
        qualityScore = 85
        tokenUsage = 5000
        duration = 120
        userSatisfaction = 4.5
    }
    $result = Record-TaskExecution -taskType "test-pattern" -result "success" -metrics $metrics -agentRoles @("role1", "role2")
    if ($result.success) { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 3] Record more executions" -ForegroundColor Yellow
    for ($i = 2; $i -le 3; $i++) {
        $metrics.taskId = "test-00$i"
        $metrics.qualityScore = 80 + ($i * 2)
        Record-TaskExecution -taskType "test-pattern" -result "success" -metrics $metrics -agentRoles @("role1", "role2")
    }
    Write-Host "✅ PASS (3 total)" -ForegroundColor Green
    
    Write-Host "`n[Test 4] Check Solidify Readiness" -ForegroundColor Yellow
    $check = Check-SolidifyReadiness -taskType "test-pattern"
    if ($check.ready) { Write-Host "✅ PASS (ready: $($check.ready))" -ForegroundColor Green } 
    else { Write-Host "⚠️ Not ready yet: $($check.reason)" -ForegroundColor Yellow }
    
    Write-Host "`n[Test 5] Solidify Pattern" -ForegroundColor Yellow
    $result = Invoke-SolidifyPattern -taskType "test-pattern" -skillName "test-skill" -version "1.0.0"
    if ($result.success) { Write-Host "✅ PASS (skill: $($result.skill.name))" -ForegroundColor Green } 
    else { Write-Host "❌ FAIL: $($result.message)" -ForegroundColor Red }
    
    Write-Host "`n[Test 6] Get Pattern Details" -ForegroundColor Yellow
    $details = Get-PatternDetails -taskType "test-pattern"
    if ($details.isSolidified) { Write-Host "✅ PASS (solidified as v$($details.version))" -ForegroundColor Green } 
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 7] Record Skill Usage" -ForegroundColor Yellow
    $result = Record-SkillUsage -skillName "test-skill" -metrics @{tokenSaved=1000; timeSaved=30}
    if ($result.success) { Write-Host "✅ PASS (usage count: $($result.usageCount))" -ForegroundColor Green } 
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 8] Get Evolution Report" -ForegroundColor Yellow
    $report = Get-SkillEvolutionReport
    if ($report.patterns.total -gt 0) { Write-Host "✅ PASS (total patterns: $($report.patterns.total))" -ForegroundColor Green } 
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

# Auto initialize
Initialize-SkillEvolution

# Export functions
Export-ModuleMember -Function `
    Initialize-SkillEvolution, `
    Register-Pattern, Record-TaskExecution, Get-PatternDetails, Get-AllPatterns, `
    Check-SolidifyReadiness, Invoke-SolidifyPattern, Get-SolidifiedSkills, Get-SkillFromRegistry, Record-SkillUsage, `
    Export-SkillTemplate, `
    Get-SkillEvolutionReport, Get-PatternTimeline, `
    Record-TaskSuccess, Check-SolidifyRecommendation, Get-QualityMetrics, `
    Record-SkillUsage-Legacy, Export-Skill-Legacy, `
    Test-SkillEvolution
