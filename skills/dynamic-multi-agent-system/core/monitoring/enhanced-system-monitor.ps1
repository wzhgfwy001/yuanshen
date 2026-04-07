# Enhanced System Monitor v1.3
# Improved monitoring metrics and alert rules

$script:AlertConfig = @{
    system = @{ cpuWarning = 70; cpuCritical = 85; memoryWarning = 75; memoryCritical = 90; diskWarning = 80; diskCritical = 90; diskPaths = @("C:", "D:") }
    application = @{ errorRateWarning = 5; errorRateCritical = 10; latencyP99Warning = 3000; latencyP99Critical = 5000; cacheHitRateWarning = 30; cacheHitRateCritical = 20; queueDepthWarning = 50; queueDepthCritical = 100; activeAgentsWarning = 10; activeAgentsCritical = 15 }
    openclaw = @{ gatewayDownWarning = 30; gatewayDownCritical = 60; skillHubUnreachable = $false; taskTimeoutWarning = 5; taskTimeoutCritical = 10 }
    notification = @{ enabled = $true; channels = @("log"); minSeverity = "warning"; dedupMinutes = 15 }
}

$script:alertHistory = @()
$script:alertStats = @{ total = 0; bySeverity = @{ info = 0; warning = 0; error = 0; critical = 0 }; lastAlertTime = $null }
$script:AlertLevels = @{ "info" = @{ level = 0; icon = "[i]"; color = "White" }; "warning" = @{ level = 1; icon = "[!]"; color = "Yellow" }; "error" = @{ level = 2; icon = "[X]"; color = "Red" }; "critical" = @{ level = 3; icon = "[!!]"; color = "Magenta" } }

function Get-SystemMetrics {
    $metrics = @{ timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; system = @{}; application = @{}; openclaw = @{} }
    try {
        $cpuLoad = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
        $metrics.system.cpu = @{ usage = [math]::Round($cpuLoad, 1); cores = (Get-CimInstance Win32_Processor).Count; status = Get-ResourceStatus -value $cpuLoad -warning $script:AlertConfig.system.cpuWarning -critical $script:AlertConfig.system.cpuCritical }
    } catch { $metrics.system.cpu = @{ usage = 0; error = $_.Exception.Message } }
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $totalRam = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
        $freeRam = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
        $usedRam = $totalRam - $freeRam
        $ramUsage = [math]::Round(($usedRam / $totalRam) * 100, 1)
        $metrics.system.memory = @{ totalGB = $totalRam; usedGB = $usedRam; freeGB = $freeRam; usage = $ramUsage; status = Get-ResourceStatus -value $ramUsage -warning $script:AlertConfig.system.memoryWarning -critical $script:AlertConfig.system.memoryCritical }
    } catch { $metrics.system.memory = @{ usage = 0; error = $_.Exception.Message } }
    $metrics.system.disks = @()
    foreach ($drive in $script:AlertConfig.system.diskPaths) {
        try {
            $disk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "$drive\" }
            if ($disk) {
                $totalGB = [math]::Round($disk.Size / 1GB, 1)
                $freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
                $usage = [math]::Round((($totalGB - $freeGB) / $totalGB) * 100, 1)
                $metrics.system.disks += @{ drive = $drive; totalGB = $totalGB; freeGB = $freeGB; usage = $usage; status = Get-ResourceStatus -value $usage -warning $script:AlertConfig.system.diskWarning -critical $script:AlertConfig.system.diskCritical }
            }
        } catch { }
    }
    try {
        $gatewayStatus = Test-OpenClawGateway
        $metrics.openclaw.gateway = @{ running = $gatewayStatus; status = if ($gatewayStatus) { "ok" } else { "down" } }
    } catch { $metrics.openclaw.gateway = @{ running = $false; error = $_.Exception.Message } }
    return $metrics
}

function Get-ApplicationMetrics {
    $metrics = @{ timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; cache = @{}; tasks = @{}; agents = @{} }
    $cacheFile = Join-Path $PSScriptRoot "..\..\state\cache\result-cache.json"
    if (Test-Path $cacheFile) {
        try {
            $cache = Get-Content $cacheFile -Raw | ConvertFrom-Json
            $total = $cache.stats.hits + $cache.stats.misses
            $hitRate = if ($total -gt 0) { [math]::Round($cache.stats.hits / $total * 100, 1) } else { 0 }
            $metrics.cache = @{ entries = $cache.entries.Count; hits = $cache.stats.hits; misses = $cache.stats.misses; hitRate = $hitRate; status = Get-ResourceStatus -value (100 - $hitRate) -warning (100 - $script:AlertConfig.application.cacheHitRateWarning) -critical (100 - $script:AlertConfig.application.cacheHitRateCritical) }
        } catch { }
    }
    $queueFile = Join-Path $PSScriptRoot "..\..\state\multi-task-queue.json"
    if (Test-Path $queueFile) {
        try {
            $queue = Get-Content $queueFile -Raw | ConvertFrom-Json
            $metrics.tasks = @{ queueDepth = $queue.Count; pending = ($queue | Where-Object { $_.status -eq "pending" }).Count; running = ($queue | Where-Object { $_.status -eq "running" }).Count; completed = ($queue | Where-Object { $_.status -eq "completed" }).Count; failed = ($queue | Where-Object { $_.status -eq "failed" }).Count; status = Get-ResourceStatus -value $queue.Count -warning $script:AlertConfig.application.queueDepthWarning -critical $script:AlertConfig.application.queueDepthCritical }
        } catch { }
    }
    $skillStatsFile = Join-Path $PSScriptRoot "..\..\state\skill-counters.json"
    if (Test-Path $skillStatsFile) {
        try {
            $stats = Get-Content $skillStatsFile -Raw | ConvertFrom-Json
            $metrics.agents = @{ activeTasks = $stats.activeTasks; totalExecutions = $stats.totalExecutions; status = Get-ResourceStatus -value $stats.activeTasks -warning $script:AlertConfig.application.activeAgentsWarning -critical $script:AlertConfig.application.activeAgentsCritical }
        } catch { }
    }
    return $metrics
}

function Test-OpenClawGateway {
    try { $null = Get-Process -Name "openclaw" -ErrorAction SilentlyContinue; return $true } catch { return $false }
}

function Get-ResourceStatus {
    param([double]$value, [double]$warning, [double]$critical)
    if ($value -ge $critical) { return "critical" }
    if ($value -ge $warning) { return "warning" }
    return "ok"
}

function Invoke-AlertEvaluation {
    param([hashtable]$systemMetrics, [hashtable]$appMetrics)
    $alerts = @()
    if ($systemMetrics.system.cpu.status -ne "ok") {
        $alerts += @{ severity = if ($systemMetrics.system.cpu.status -eq "critical") { "critical" } else { "warning" }; category = "system"; source = "cpu"; message = "CPU Usage: $($systemMetrics.system.cpu.usage)%"; value = $systemMetrics.system.cpu.usage; threshold = if ($systemMetrics.system.cpu.status -eq "critical") { $script:AlertConfig.system.cpuCritical } else { $script:AlertConfig.system.cpuWarning } }
    }
    if ($systemMetrics.system.memory.status -ne "ok") {
        $alerts += @{ severity = if ($systemMetrics.system.memory.status -eq "critical") { "critical" } else { "warning" }; category = "system"; source = "memory"; message = "Memory Usage: $($systemMetrics.system.memory.usage)%"; value = $systemMetrics.system.memory.usage; threshold = if ($systemMetrics.system.memory.status -eq "critical") { $script:AlertConfig.system.memoryCritical } else { $script:AlertConfig.system.memoryWarning } }
    }
    foreach ($disk in $systemMetrics.system.disks) {
        if ($disk.status -ne "ok") {
            $alerts += @{ severity = if ($disk.status -eq "critical") { "critical" } else { "warning" }; category = "system"; source = "disk:$($disk.drive)"; message = "Disk $($disk.drive) Usage: $($disk.usage)%"; value = $disk.usage; threshold = if ($disk.status -eq "critical") { $script:AlertConfig.system.diskCritical } else { $script:AlertConfig.system.diskWarning } }
        }
    }
    if (-not $systemMetrics.openclaw.gateway.running) {
        $alerts += @{ severity = "critical"; category = "openclaw"; source = "gateway"; message = "OpenClaw Gateway is down"; value = 0; threshold = 1 }
    }
    if ($appMetrics.cache -and $appMetrics.cache.status -ne "ok") {
        $alerts += @{ severity = if ($appMetrics.cache.status -eq "critical") { "critical" } else { "warning" }; category = "application"; source = "cacheHitRate"; message = "Cache hit rate too low: $($appMetrics.cache.hitRate)%"; value = $appMetrics.cache.hitRate; threshold = if ($appMetrics.cache.status -eq "critical") { $script:AlertConfig.application.cacheHitRateCritical } else { $script:AlertConfig.application.cacheHitRateWarning } }
    }
    if ($appMetrics.tasks -and $appMetrics.tasks.status -ne "ok") {
        $alerts += @{ severity = if ($appMetrics.tasks.status -eq "critical") { "critical" } else { "warning" }; category = "application"; source = "queueDepth"; message = "Task queue backlog: $($appMetrics.tasks.queueDepth) tasks"; value = $appMetrics.tasks.queueDepth; threshold = if ($appMetrics.tasks.status -eq "critical") { $script:AlertConfig.application.queueDepthCritical } else { $script:AlertConfig.application.queueDepthWarning } }
    }
    if ($appMetrics.agents -and $appMetrics.agents.status -ne "ok") {
        $alerts += @{ severity = if ($appMetrics.agents.status -eq "critical") { "critical" } else { "warning" }; category = "application"; source = "activeAgents"; message = "Too many active agents: $($appMetrics.agents.activeTasks)"; value = $appMetrics.agents.activeTasks; threshold = if ($appMetrics.agents.status -eq "critical") { $script:AlertConfig.application.activeAgentsCritical } else { $script:AlertConfig.application.activeAgentsWarning } }
    }
    return $alerts
}

function Send-Alert {
    param([hashtable]$alert)
    $config = $script:AlertConfig.notification
    if (-not $config.enabled) { return }
    foreach ($recent in $script:alertHistory | Select-Object -Last 10) {
        if ($recent.source -eq $alert.source -and $recent.severity -eq $alert.severity) {
            $timeDiff = (Get-Date) - [DateTime]::Parse($recent.timestamp)
            if ($timeDiff.TotalMinutes -lt $config.dedupMinutes) { return }
        }
    }
    $script:alertStats.total++
    $script:alertStats.bySeverity[$alert.severity]++
    $script:alertStats.lastAlertTime = Get-Date -Format "o"
    $alert.timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $script:alertHistory += $alert
    if ($script:alertHistory.Count -gt 100) { $script:alertHistory = $script:alertHistory | Select-Object -Last 100 }
    $levelInfo = $script:AlertLevels[$alert.severity]
    if ($config.channels -contains "console") {
        Write-Host "$($levelInfo.icon) [$($alert.severity.ToUpper())] [$($alert.category)] $($alert.message)" -ForegroundColor $levelInfo.color
    }
    if ($config.channels -contains "log") {
        $logFile = Join-Path $PSScriptRoot "..\..\state\alerts.json"
        $script:alertHistory | ConvertTo-Json -Depth 10 | Out-File -FilePath $logFile -Encoding utf8
    }
}

function Show-SystemMonitor {
    param([switch]$alertsOnly)
    $sysMetrics = Get-SystemMetrics
    $appMetrics = Get-ApplicationMetrics
    $alerts = Invoke-AlertEvaluation -systemMetrics $sysMetrics -appMetrics $appMetrics
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Enhanced System Monitor v1.3" -ForegroundColor Cyan
    Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[System Resources]" -ForegroundColor Yellow
    $cpuColor = Get-StatusColor $sysMetrics.system.cpu.status
    Write-Host "  CPU: $($sysMetrics.system.cpu.usage)% " -NoNewline -ForegroundColor White
    Write-Host "[$($sysMetrics.system.cpu.status)]" -ForegroundColor $cpuColor
    $memColor = Get-StatusColor $sysMetrics.system.memory.status
    Write-Host "  Memory: $($sysMetrics.system.memory.usage)% " -NoNewline -ForegroundColor White
    Write-Host "[$($sysMetrics.system.memory.status)]" -ForegroundColor $memColor
    foreach ($disk in $sysMetrics.system.disks) {
        $diskColor = Get-StatusColor $disk.status
        Write-Host "  Disk $($disk.drive): $($disk.usage)% " -NoNewline -ForegroundColor White
        Write-Host "[$($disk.status)]" -ForegroundColor $diskColor
    }
    Write-Host ""
    Write-Host "[OpenClaw]" -ForegroundColor Yellow
    $gwColor = if ($sysMetrics.openclaw.gateway.running) { "Green" } else { "Red" }
    Write-Host "  Gateway: " -NoNewline -ForegroundColor White
    Write-Host "$($sysMetrics.openclaw.gateway.running)" -ForegroundColor $gwColor
    Write-Host ""
    Write-Host "[Application Metrics]" -ForegroundColor Yellow
    if ($appMetrics.cache) {
        $cacheColor = Get-StatusColor $appMetrics.cache.status
        Write-Host "  Cache: $($appMetrics.cache.hitRate)% hit " -NoNewline -ForegroundColor White
        Write-Host "[$($appMetrics.cache.status)]" -ForegroundColor $cacheColor
        Write-Host "    Entries: $($appMetrics.cache.entries) | Hits: $($appMetrics.cache.hits) | Misses: $($appMetrics.cache.misses)" -ForegroundColor Gray
    }
    if ($appMetrics.tasks) {
        $queueColor = Get-StatusColor $appMetrics.tasks.status
        Write-Host "  Queue: $($appMetrics.tasks.queueDepth) tasks " -NoNewline -ForegroundColor White
        Write-Host "[$($appMetrics.tasks.status)]" -ForegroundColor $queueColor
        Write-Host "    Pending: $($appMetrics.tasks.pending) | Running: $($appMetrics.tasks.running) | Completed: $($appMetrics.tasks.completed) | Failed: $($appMetrics.tasks.failed)" -ForegroundColor Gray
    }
    if ($appMetrics.agents) {
        $agentColor = Get-StatusColor $appMetrics.agents.status
        Write-Host "  Agents: $($appMetrics.agents.activeTasks) active " -NoNewline -ForegroundColor White
        Write-Host "[$($appMetrics.agents.status)]" -ForegroundColor $agentColor
    }
    if ($alerts.Count -gt 0) {
        Write-Host ""
        Write-Host "[Alert ($($alerts.Count))]" -ForegroundColor Magenta
        foreach ($alert in $alerts) { Send-Alert -alert $alert }
    } elseif (-not $alertsOnly) {
        Write-Host ""
        Write-Host "[OK - No Alerts]" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "[Alert Stats]" -ForegroundColor Yellow
    Write-Host "  Total: $($script:alertStats.total) | " -NoNewline -ForegroundColor White
    Write-Host "Warnings: $($script:alertStats.bySeverity.warning)" -ForegroundColor Yellow
    Write-Host "  Errors: $($script:alertStats.bySeverity.error)" -ForegroundColor Red
    Write-Host "  Critical: $($script:alertStats.bySeverity.critical)" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-AlertHistory {
    param([int]$limit = 20)
    $recent = $script:alertHistory | Select-Object -Last $limit
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Alert History (Last $limit)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    foreach ($alert in $recent) {
        $levelInfo = $script:AlertLevels[$alert.severity]
        Write-Host "$($alert.timestamp) " -NoNewline -ForegroundColor Gray
        Write-Host "$($levelInfo.icon) [$($alert.severity.ToUpper())] " -NoNewline -ForegroundColor $levelInfo.color
        Write-Host "[$($alert.category)] $($alert.message)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Get-StatusColor {
    param([string]$status)
    switch ($status) {
        "ok" { return "Green" }
        "warning" { return "Yellow" }
        "critical" { return "Red" }
        default { return "White" }
    }
}

function Test-SystemHealth {
    $sysMetrics = Get-SystemMetrics
    $appMetrics = Get-ApplicationMetrics
    $alerts = Invoke-AlertEvaluation -systemMetrics $sysMetrics -appMetrics $appMetrics
    $critical = $alerts | Where-Object { $_.severity -eq "critical" }
    $warning = $alerts | Where-Object { $_.severity -eq "warning" }
    $healthScore = 100
    $healthScore -= ($critical.Count * 30)
    $healthScore -= ($warning.Count * 10)
    $healthScore = [Math]::Max(0, $healthScore)
    $status = "healthy"
    if ($critical.Count -gt 0) { $status = "critical" }
    elseif ($warning.Count -gt 0) { $status = "degraded" }
    return @{ status = $status; score = $healthScore; criticalCount = $critical.Count; warningCount = $warning.Count; alerts = $alerts }
}

function Show-HealthCheck {
    $health = Test-SystemHealth
    $statusColor = switch ($health.status) {
        "healthy" { "Green" }
        "degraded" { "Yellow" }
        "critical" { "Red" }
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Health Check" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Status: " -NoNewline
    Write-Host "$($health.status.ToUpper()) " -NoNewline -ForegroundColor $statusColor
    Write-Host "(score: $($health.score)/100)" -ForegroundColor Gray
    Write-Host "  Critical: $($health.criticalCount)" -ForegroundColor $(if($health.criticalCount -gt 0){"Red"}else{"Gray"})
    Write-Host "  Warnings: $($health.warningCount)" -ForegroundColor $(if($health.warningCount -gt 0){"Yellow"}else{"Gray"})
    if ($health.alerts.Count -gt 0) {
        Write-Host ""
        Write-Host "  Alert Details:" -ForegroundColor White
        foreach ($alert in $health.alerts) {
            $levelInfo = $script:AlertLevels[$alert.severity]
            Write-Host "    $($levelInfo.icon) [$($alert.category)] $($alert.message)" -ForegroundColor $levelInfo.color
        }
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    return $health
}

function Get-AlertConfig { return $script:AlertConfig }

function Show-AlertConfig {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Alert Configuration" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[System Thresholds]" -ForegroundColor Yellow
    Write-Host "  CPU: Warning > $($script:AlertConfig.system.cpuWarning)%, Critical > $($script:AlertConfig.system.cpuCritical)%" -ForegroundColor White
    Write-Host "  Memory: Warning > $($script:AlertConfig.system.memoryWarning)%, Critical > $($script:AlertConfig.system.memoryCritical)%" -ForegroundColor White
    Write-Host "  Disk: Warning > $($script:AlertConfig.system.diskWarning)%, Critical > $($script:AlertConfig.system.diskCritical)%" -ForegroundColor White
    Write-Host ""
    Write-Host "[Application Thresholds]" -ForegroundColor Yellow
    Write-Host "  Cache Hit Rate: Warning < $($script:AlertConfig.application.cacheHitRateWarning)%, Critical < $($script:AlertConfig.application.cacheHitRateCritical)%" -ForegroundColor White
    Write-Host "  Queue Depth: Warning > $($script:AlertConfig.application.queueDepthWarning), Critical > $($script:AlertConfig.application.queueDepthCritical)" -ForegroundColor White
    Write-Host "  Active Agents: Warning > $($script:AlertConfig.application.activeAgentsWarning), Critical > $($script:AlertConfig.application.activeAgentsCritical)" -ForegroundColor White
    Write-Host ""
    Write-Host "[Notification]" -ForegroundColor Yellow
    Write-Host "  Enabled: $($script:AlertConfig.notification.enabled)" -ForegroundColor White
    Write-Host "  Channels: $($script:AlertConfig.notification.channels -join ', ')" -ForegroundColor White
    Write-Host "  Min Severity: $($script:AlertConfig.notification.minSeverity)" -ForegroundColor White
    Write-Host "  Dedup Interval: $($script:AlertConfig.notification.dedupMinutes) minutes" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-EnhancedMonitor {
    Write-Host "=== Enhanced Monitor Tests ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[Test 1] System Metrics" -ForegroundColor Yellow
    $metrics = Get-SystemMetrics
    Write-Host "CPU: $($metrics.system.cpu.usage)%, Memory: $($metrics.system.memory.usage)%" -ForegroundColor Green
    Write-Host "Gateway: $($metrics.openclaw.gateway.running)" -ForegroundColor Green
    Write-Host ""
    Write-Host "[Test 2] Application Metrics" -ForegroundColor Yellow
    $appMetrics = Get-ApplicationMetrics
    if ($appMetrics.cache) { Write-Host "Cache: $($appMetrics.cache.hitRate)% hit rate" -ForegroundColor Green }
    Write-Host ""
    Write-Host "[Test 3] Health Check" -ForegroundColor Yellow
    $health = Show-HealthCheck
    Write-Host ""
    Write-Host "[Test 4] Alert Evaluation" -ForegroundColor Yellow
    $alerts = Invoke-AlertEvaluation -systemMetrics $metrics -appMetrics $appMetrics
    Write-Host "Alerts found: $($alerts.Count)" -ForegroundColor $(if($alerts.Count -gt 0){"Yellow"}else{"Green"})
    Write-Host ""
    Write-Host "[Test 5] Full Monitor Display" -ForegroundColor Yellow
    Show-SystemMonitor
    Write-Host ""
    Write-Host "[Test 6] Alert Config" -ForegroundColor Yellow
    Show-AlertConfig
    Write-Host ""
    Write-Host "=== All Tests Complete ===" -ForegroundColor Green
}

if ($MyInvocation.InvocationName -ne ".") {
    Test-EnhancedMonitor
}
