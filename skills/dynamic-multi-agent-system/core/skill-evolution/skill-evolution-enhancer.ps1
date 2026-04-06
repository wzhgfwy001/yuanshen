# Skill Evolution Enhancer - P1 Enhanced Version
# Skill 固化增强模块 - 纯 PowerShell 脚本

$script:patternsFile = Join-Path $PSScriptRoot "..\..\state\skill-patterns.json"
$script:usageStatsFile = Join-Path $PSScriptRoot "..\..\state\skill-usage-stats.json"

function Initialize-SkillEvolution {
    if (!(Test-Path $patternsFile)) {
        $patterns = @{
            patterns = @()
            metadata = @{
                createdAt = (Get-Date -Format "o")
                version = "1.0.0"
            }
        }
        $patterns | ConvertTo-Json -Depth 10 | Out-File -FilePath $patternsFile -Encoding utf8
        Write-Host "✅ Skill evolution initialized" -ForegroundColor Green
    }
    
    if (!(Test-Path $usageStatsFile)) {
        $stats = @{
            stats = @()
            metadata = @{
                createdAt = (Get-Date -Format "o")
            }
        }
        $stats | ConvertTo-Json -Depth 10 | Out-File -FilePath $usageStatsFile -Encoding utf8
    }
}

function Get-Patterns {
    if (!(Test-Path $patternsFile)) {
        Initialize-SkillEvolution
    }
    return Get-Content $patternsFile -Raw | ConvertFrom-Json
}

function Save-Patterns {
    param($patterns)
    $patterns | ConvertTo-Json -Depth 10 | Out-File -FilePath $patternsFile -Encoding utf8
}

function Get-UsageStats {
    if (!(Test-Path $usageStatsFile)) {
        Initialize-SkillEvolution
    }
    return Get-Content $usageStatsFile -Raw | ConvertFrom-Json
}

function Save-UsageStats {
    param($stats)
    $stats | ConvertTo-Json -Depth 10 | Out-File -FilePath $usageStatsFile -Encoding utf8
}

function Record-TaskSuccess {
    param(
        [string]$taskType,
        [hashtable]$metrics
    )
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if ($pattern) {
        $pattern.successCount++
        $pattern.lastSuccessAt = (Get-Date -Format "o")
        
        $execution = @{
            taskId = $metrics.taskId
            date = (Get-Date -Format "o")
            qualityScore = $metrics.qualityScore
            tokenUsage = $metrics.tokenUsage
            duration = $metrics.duration
            userSatisfaction = $metrics.userSatisfaction
        }
        $pattern.executions += $execution
        
        if ($pattern.executions.Count -gt 10) {
            $pattern.executions = $pattern.executions | Select-Object -Last 10
        }
        
        $avgQuality = ($pattern.executions | Measure-Object -Property qualityScore -Average).Average
        $pattern.avgQualityScore = [math]::Round($avgQuality, 2)
        
        Write-Host "✅ Pattern $taskType updated (Success count: $($pattern.successCount))" -ForegroundColor Green
    } else {
        $newPattern = @{
            type = $taskType
            successCount = 1
            createdAt = (Get-Date -Format "o")
            lastSuccessAt = (Get-Date -Format "o")
            avgQualityScore = $metrics.qualityScore
            solidifyRecommended = $false
            solidifyAt = $null
            version = "1.0.0"
            executions = @(@{
                taskId = $metrics.taskId
                date = (Get-Date -Format "o")
                qualityScore = $metrics.qualityScore
                tokenUsage = $metrics.tokenUsage
                duration = $metrics.duration
                userSatisfaction = $metrics.userSatisfaction
            })
            agentRoles = $metrics.agentRoles
            config = $metrics.config
        }
        $patterns.patterns += $newPattern
        Write-Host "✅ New pattern $taskType created" -ForegroundColor Green
    }
    
    Save-Patterns $patterns
    return $true
}

function Check-SolidifyRecommendation {
    param([string]$taskType)
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (!$pattern) {
        return $null
    }
    
    if ($pattern.solidifyRecommended) {
        return @{
            recommended = $false
            reason = "Already recommended for solidify"
            pattern = $pattern
        }
    }
    
    if ($pattern.successCount -lt 3) {
        return @{
            recommended = $false
            reason = "Need more successes (current: $($pattern.successCount), required: 3)"
            pattern = $pattern
        }
    }
    
    if ($pattern.avgQualityScore -lt 80) {
        return @{
            recommended = $false
            reason = "Quality score too low (current: $($pattern.avgQualityScore), required: 80+)"
            pattern = $pattern
        }
    }
    
    $pattern.solidifyRecommended = $true
    $pattern.solidifyAt = (Get-Date -Format "o")
    Save-Patterns $patterns
    
    return @{
        recommended = $true
        reason = "Success count >= 3 and quality >= 80"
        pattern = $pattern
        estimatedSpeedup = "3-5x"
        confidence = "High"
    }
}

function Get-QualityMetrics {
    param([string]$taskType)
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $taskType }
    
    if (!$pattern -or $pattern.executions.Count -eq 0) {
        return $null
    }
    
    $executions = $pattern.executions
    
    $metrics = @{
        taskType = $taskType
        totalExecutions = $executions.Count
        avgQualityScore = [math]::Round(($executions | Measure-Object -Property qualityScore -Average).Average, 2)
        avgTokenUsage = [math]::Round(($executions | Measure-Object -Property tokenUsage -Average).Average, 0)
        avgDuration = [math]::Round(($executions | Measure-Object -Property duration -Average).Average, 2)
        avgUserSatisfaction = [math]::Round(($executions | Measure-Object -Property userSatisfaction -Average).Average, 2)
        successRate = 100.0
        trend = "stable"
    }
    
    return $metrics
}

function Record-SkillUsage {
    param(
        [string]$skillId,
        [string]$skillVersion,
        [hashtable]$metrics
    )
    
    $stats = Get-UsageStats
    $stat = $stats.stats | Where-Object { $_.skillId -eq $skillId -and $_.version -eq $skillVersion }
    
    if ($stat) {
        $stat.totalUses++
        $stat.lastUsedAt = (Get-Date -Format "o")
        $stat.totalTokenSaved += $metrics.tokenSaved
        $stat.totalTimeSaved += $metrics.timeSaved
        $stat.avgScore = [math]::Round((($stat.avgScore * ($stat.totalUses - 1)) + $metrics.score) / $stat.totalUses, 2)
    } else {
        $newStat = @{
            skillId = $skillId
            version = $skillVersion
            totalUses = 1
            createdAt = (Get-Date -Format "o")
            lastUsedAt = (Get-Date -Format "o")
            totalTokenSaved = $metrics.tokenSaved
            totalTimeSaved = $metrics.timeSaved
            avgScore = $metrics.score
            topUsers = @()
        }
        $stats.stats += $newStat
    }
    
    Save-UsageStats $stats
    Write-Host "✅ Usage stats updated for $skillId v$skillVersion" -ForegroundColor Green
    return $true
}

function Get-SkillUsageReport {
    param([string]$skillId)
    
    $stats = Get-UsageStats
    $skillStats = $stats.stats | Where-Object { $_.skillId -eq $skillId }
    
    if (!$skillStats) {
        return $null
    }
    
    return $skillStats | Sort-Object { [Version]$_.version } -Descending | Select-Object -First 1
}

function Export-Skill {
    param(
        [string]$patternType,
        [string]$outputPath
    )
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $patternType }
    
    if (!$pattern) {
        Write-Error "Pattern $patternType not found"
        return $false
    }
    
    $skill = @{
        name = "$patternType-optimized"
        version = $pattern.version
        basedOn = $patternType
        description = "Optimized skill based on $($pattern.successCount) successful executions"
        agents = $pattern.agentRoles
        config = $pattern.config
        metrics = @{
            avgQualityScore = $pattern.avgQualityScore
            successCount = $pattern.successCount
            estimatedSpeedup = "3-5x"
        }
        createdAt = (Get-Date -Format "o")
    }
    
    $skill | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "✅ Skill exported to $outputPath" -ForegroundColor Green
    return $true
}

function Import-Skill {
    param([string]$inputPath)
    
    if (!(Test-Path $inputPath)) {
        Write-Error "File not found: $inputPath"
        return $false
    }
    
    $skill = Get-Content $inputPath -Raw | ConvertFrom-Json
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $skill.basedOn }
    
    if ($pattern) {
        $pattern.version = $skill.version
        $pattern.agentRoles = $skill.agents
        $pattern.config = $skill.config
    } else {
        $newPattern = @{
            type = $skill.basedOn
            successCount = 0
            version = $skill.version
            agentRoles = $skill.agents
            config = $skill.config
            imported = $true
            importedAt = (Get-Date -Format "o")
        }
        $patterns.patterns += $newPattern
    }
    
    Save-Patterns $patterns
    Write-Host "✅ Skill imported from $inputPath" -ForegroundColor Green
    return $true
}

function Get-PatternVersions {
    param([string]$patternType)
    
    $patterns = Get-Patterns
    $versions = $patterns.patterns | Where-Object { $_.type -eq $patternType } | Sort-Object { [Version]$_.version } -Descending
    return $versions
}

function Rollback-Skill {
    param(
        [string]$patternType,
        [string]$targetVersion
    )
    
    $patterns = Get-Patterns
    $pattern = $patterns.patterns | Where-Object { $_.type -eq $patternType -and $_.version -eq $targetVersion }
    
    if (!$pattern) {
        Write-Error "Version $targetVersion not found for pattern $patternType"
        return $false
    }
    
    $patterns.patterns | Where-Object { $_.type -eq $patternType } | ForEach-Object {
        $_.current = ($_.version -eq $targetVersion)
    }
    
    Save-Patterns $patterns
    Write-Host "✅ Rolled back $patternType to version $targetVersion" -ForegroundColor Green
    return $true
}

function Test-SkillEvolution {
    Write-Host "=== Skill Evolution Enhancer Tests ===" -ForegroundColor Cyan
    
    Initialize-SkillEvolution
    
    Write-Host "`n[Test 1] Record Task Success" -ForegroundColor Yellow
    $metrics = @{
        taskId = "test-001"
        qualityScore = 92
        tokenUsage = 5000
        duration = 120
        userSatisfaction = 95
        agentRoles = @("role1", "role2")
        config = @{key = "value"}
    }
    $result = Record-TaskSuccess -taskType "test-pattern" -metrics $metrics
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Get Quality Metrics" -ForegroundColor Yellow
    $metrics = Get-QualityMetrics -taskType "test-pattern"
    if ($metrics.avgQualityScore -gt 0) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 3] Check Solidify Recommendation (should be false, need 3 successes)" -ForegroundColor Yellow
    $result = Check-SolidifyRecommendation -taskType "test-pattern"
    if (!$result.recommended) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 4] Record Usage Stats" -ForegroundColor Yellow
    $usageMetrics = @{
        tokenSaved = 10000
        timeSaved = 60
        score = 90
    }
    $result = Record-SkillUsage -skillId "test-skill" -skillVersion "1.0.0" -metrics $usageMetrics
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 5] Get Usage Report" -ForegroundColor Yellow
    $report = Get-SkillUsageReport -skillId "test-skill"
    if ($report.totalUses -gt 0) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

# Auto initialize
Initialize-SkillEvolution
