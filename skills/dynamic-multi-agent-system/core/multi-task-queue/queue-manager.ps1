# Multi-Task Queue Manager v1.1 - Enhanced Implementation
# 多任务队列管理器 v1.1 - 增强实现
#
# Features:
# - Task dependencies and grouping
# - Enhanced progress tracking
# - Event system for notifications
# - Batch operations
# - Dynamic resource allocation
# - Priority inheritance

$script:queueFile = Join-Path $PSScriptRoot "..\..\state\multi-task-queue.json"
$script:schedulerRunning = $false
$script:schedulerJob = $null

# Default Configuration
$script:config = @{
    limits = @{
        maxConcurrentTasks = 3
        maxTotalAgents = 12
        maxAgentsPerTask = 6
        maxTaskTimeout = 3600        # 1 hour
        maxSubagentTimeout = 300     # 5 minutes
        maxRetries = 3
        maxQueueSize = 100
    }
    priorities = @{
        P0 = @{ weight = 5; maxAgents = 8;  timeoutMultiplier = 2.0; description = "紧急" }
        P1 = @{ weight = 4; maxAgents = 6;  timeoutMultiplier = 1.5; description = "高" }
        P2 = @{ weight = 3; maxAgents = 4;  timeoutMultiplier = 1.0; description = "中" }
        P3 = @{ weight = 2; maxAgents = 2;  timeoutMultiplier = 0.8; description = "低" }
        P4 = @{ weight = 1; maxAgents = 1;  timeoutMultiplier = 0.5; description = "空闲" }
    }
    scheduler = @{
        intervalSeconds = 5
        enablePreemption = $true
        starvationPrevention = $true   # 防止低优先级任务饥饿
    }
}

# Event handlers storage
$script:eventHandlers = @{
    onTaskStarted = @()
    onTaskCompleted = @()
    onTaskFailed = @()
    onTaskPaused = @()
    onTaskResumed = @()
    onQueueFull = @()
    onResourceAlert = @()
}

# ============================================================
# Configuration Functions
# ============================================================

function Get-QueueConfig {
    return $script:config
}

function Set-QueueConfig {
    param(
        [string]$limitName,
        $value
    )
    
    if ($script:config.limits.PSObject.Properties.Name -contains $limitName) {
        $script:config.limits.$limitName = $value
        Save-QueueToFile
        return $true
    }
    return $false
}

function Register-EventHandler {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet("onTaskStarted", "onTaskCompleted", "onTaskFailed", 
                     "onTaskPaused", "onTaskResumed", "onQueueFull", "onResourceAlert")]
        [string]$event,
        
        [scriptblock]$handler
    )
    
    $script:eventHandlers[$event] += $handler
    return $true
}

function Invoke-Event {
    param(
        [Parameter(Mandatory=$true)]
        [string]$event,
        
        [hashtable]$data = @{}
    )
    
    foreach ($handler in $script:eventHandlers[$event]) {
        try {
            & $handler $data
        }
        catch {
            Write-Warning "Event handler error: $_"
        }
    }
}

# ============================================================
# Core Queue Functions
# ============================================================

function Initialize-Queue {
    param([switch]$Force)
    
    if (!(Test-Path $script:queueFile) -or $Force) {
        $queue = @{
            version = "1.1"
            queue = @{
                running = @()
                waiting = @()
                completed = @()
                failed = @()
                suspended = @()
                blocked = @()    # 等待依赖的任务
            }
            limits = $script:config.limits.Clone()
            config = @{
                schedulerInterval = $script:config.scheduler.intervalSeconds
                enablePreemption = $script:config.scheduler.enablePreemption
            }
            scheduler = @{
                running = $false
                lastRun = $null
                totalScheduled = 0
            }
            stats = @{
                totalSubmitted = 0
                totalCompleted = 0
                totalFailed = 0
                avgWaitTime = 0
                peakRunning = 0
            }
        }
        $queue | ConvertTo-Json -Depth 15 | Out-File -FilePath $script:queueFile -Encoding utf8
        Write-Host "✅ Queue initialized (v1.1)" -ForegroundColor Green
    }
}

function Get-QueueFromFile {
    if (!(Test-Path $script:queueFile)) {
        Initialize-Queue
    }
    return Get-Content $script:queueFile -Raw | ConvertFrom-Json
}

function Save-QueueToFile {
    param([object]$queue)
    
    if ($null -eq $queue) {
        $queue = Get-QueueFromFile
    }
    
    $queue | ConvertTo-Json -Depth 15 | Out-File -FilePath $script:queueFile -Encoding utf8
}

function Get-QueueStatus {
    $queue = Get-QueueFromFile
    
    $currentAgents = 0
    foreach ($task in $queue.queue.running) {
        $currentAgents += $task.allocatedAgents
    }
    
    $waitingByPriority = @{}
    foreach ($priority in $script:config.priorities.Keys) {
        $waitingByPriority[$priority] = (@($queue.queue.waiting) | Where-Object { $_.priority -eq $priority }).Count
    }
    
    return @{
        version = $queue.version
        running = @{
            count = $queue.queue.running.Count
            tasks = $queue.queue.running | Select-Object taskId, priority, allocatedAgents, progress, startedAt
            peak = $queue.stats.peakRunning
        }
        waiting = @{
            count = $queue.queue.waiting.Count
            byPriority = $waitingByPriority
            tasks = $queue.queue.waiting | Select-Object taskId, priority, allocatedAgents, createdAt, dependencies
        }
        blocked = @{
            count = $queue.queue.blocked.Count
            tasks = $queue.queue.blocked | Select-Object taskId, dependencies, blockedSince
        }
        completed = @{
            count = $queue.queue.completed.Count
            today = @($queue.queue.completed | Where-Object { 
                $_.completedAt -and (Get-Date $_.completedAt) -gt (Get-Date).Date 
            }).Count
        }
        failed = @{
            count = $queue.queue.failed.Count
        }
        suspended = @{
            count = $queue.queue.suspended.Count
        }
        limits = @{
            maxConcurrentTasks = $queue.limits.maxConcurrentTasks
            maxTotalAgents = $queue.limits.maxTotalAgents
            maxAgentsPerTask = $queue.limits.maxAgentsPerTask
            currentAgents = $currentAgents
            availableAgents = ($queue.limits.maxTotalAgents - $currentAgents)
        }
        scheduler = $queue.scheduler
        stats = $queue.stats
    }
}

# ============================================================
# Task Management Functions
# ============================================================

function Add-TaskToQueue {
    <#
    .SYNOPSIS
        Add a task to the queue
    .DESCRIPTION
        Enhanced task submission with dependencies, grouping, and priority support
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$taskId,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("P0", "P1", "P2", "P3", "P4")]
        [string]$priority,
        
        [Parameter(Mandatory=$true)]
        [string]$taskType,
        
        [int]$estimatedAgents,
        
        [hashtable]$payload = @{},
        
        [string[]]$dependsOn = @(),     # 依赖的任务 ID 列表
        
        [string]$groupId = $null,        # 任务组 ID
        
        [int]$maxExecutionTime = 0,      # 0 = 使用默认值
        
        [string]$description = ""
    )
    
    $queue = Get-QueueFromFile
    
    # 检查队列是否已满
    if ($queue.queue.waiting.Count -ge $queue.limits.maxQueueSize) {
        Invoke-Event -event "onQueueFull" -data @{taskId=$taskId; queueSize=$queue.limits.maxQueueSize}
        return @{
            success = $false
            error = "QUEUE_FULL"
            message = "Queue is full (max $($queue.limits.maxQueueSize))"
        }
    }
    
    # 检查任务是否已存在
    $existingTask = Find-Task -taskId $taskId
    if ($null -ne $existingTask) {
        return @{
            success = $false
            error = "TASK_EXISTS"
            message = "Task $taskId already exists"
        }
    }
    
    # 计算分配 agents（考虑优先级）
    $priorityConfig = $script:config.priorities[$priority]
    if ($estimatedAgents -eq 0 -or $estimatedAgents -gt $priorityConfig.maxAgents) {
        $allocatedAgents = $priorityConfig.maxAgents
    } else {
        $allocatedAgents = $estimatedAgents
    }
    
    # 计算超时
    $timeout = if ($maxExecutionTime -gt 0) { 
        $maxExecutionTime 
    } else { 
        $queue.limits.maxTaskTimeout * $priorityConfig.timeoutMultiplier 
    }
    
    $task = @{
        taskId = $taskId
        priority = $priority
        taskType = $taskType
        allocatedAgents = $allocatedAgents
        maxAgents = $priorityConfig.maxAgents
        timeout = $timeout
        createdAt = (Get-Date -Format "o")
        status = "waiting"
        retryCount = 0
        maxRetries = $queue.limits.maxRetries
        payload = $payload
        description = $description
        groupId = $groupId
        dependencies = $dependsOn
        progress = 0
        currentStage = ""
        stages = @()
    }
    
    # 检查是否有未满足的依赖
    if ($dependsOn.Count -gt 0) {
        $unmetDeps = @()
        foreach ($depId in $dependsOn) {
            $depTask = Find-Task -taskId $depId
            if ($null -eq $depTask -or $depTask.status -ne "completed") {
                $unmetDeps += $depId
            }
        }
        
        if ($unmetDeps.Count -gt 0) {
            # 加入 blocked 队列
            $task.status = "blocked"
            $task.blockedSince = (Get-Date -Format "o")
            $task.unmetDependencies = $unmetDeps
            $queue.queue.blocked += $task
        } else {
            $queue.queue.waiting += $task
        }
    } else {
        $queue.queue.waiting += $task
    }
    
    $queue.stats.totalSubmitted++
    Save-QueueToFile $queue
    
    $position = ($queue.queue.waiting | Where-Object { $_.taskId -eq $taskId }).Count
    
    return @{
        success = $true
        taskId = $taskId
        status = $task.status
        priority = $priority
        allocatedAgents = $allocatedAgents
        queuePosition = $position
        createdAt = $task.createdAt
    }
}

function Find-Task {
    param([string]$taskId)
    
    $queue = Get-QueueFromFile
    
    $searchIn = @($queue.queue.running, $queue.queue.waiting, $queue.queue.completed, 
                  $queue.queue.failed, $queue.queue.suspended, $queue.queue.blocked)
    
    foreach ($list in $searchIn) {
        $found = $list | Where-Object { $_.taskId -eq $taskId }
        if ($found) { return $found }
    }
    
    return $null
}

function Get-TaskStatus {
    param([string]$taskId)
    
    $task = Find-Task $taskId
    if ($null -eq $task) {
        return @{
            success = $false
            error = "TASK_NOT_FOUND"
            message = "Task $taskId not found"
        }
    }
    
    $queue = Get-QueueFromFile
    $availableAgents = $queue.limits.maxTotalAgents - ($queue.queue.running | Measure-Object -Property allocatedAgents -Sum).Sum
    
    return @{
        success = $true
        task = $task
        queuePosition = if ($task.status -eq "waiting") { 
            (@($queue.queue.waiting) | Where-Object { $_.taskId -eq $taskId }).Count 
        } else { $null }
        availableAgents = $availableAgents
    }
}

function Update-TaskPriority {
    param(
        [string]$taskId,
        [string]$priority
    )
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.waiting | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        $task.priority = $priority
        $priorityConfig = $script:config.priorities[$priority]
        $task.allocatedAgents = [Math]::Min($task.allocatedAgents, $priorityConfig.maxAgents)
        Save-QueueToFile $queue
        return $true
    }
    
    return $false
}

function Update-TaskProgress {
    param(
        [string]$taskId,
        [double]$progress,
        [string]$currentStage = ""
    )
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        $task.progress = $progress
        if ($currentStage) { $task.currentStage = $currentStage }
        Save-QueueToFile $queue
        return $true
    }
    
    return $false
}

function Add-TaskStage {
    param(
        [string]$taskId,
        [hashtable]$stage
    )
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        if (-not $task.stages) { $task.stages = @() }
        $stage.startedAt = (Get-Date -Format "o")
        $task.stages += $stage
        $task.currentStage = $stage.name
        Save-QueueToFile $queue
        return $true
    }
    
    return $false
}

function Complete-TaskStage {
    param(
        [string]$taskId,
        [string]$stageName,
        [hashtable]$result = @{}
    )
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if ($task -and $task.stages) {
        $stage = $task.stages | Where-Object { $_.name -eq $stageName }
        if ($stage) {
            $stage.completedAt = (Get-Date -Format "o")
            if ($result.Count -gt 0) { $stage.result = $result }
            Save-QueueToFile $queue
            return $true
        }
    }
    
    return $false
}

# ============================================================
# Task Lifecycle Functions
# ============================================================

function Start-Task {
    param(
        [string]$taskId,
        [string]$startedBy = "scheduler"
    )
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.waiting | Where-Object { $_.taskId -eq $taskId }
    if (-not $task) { return $false }
    
    # 移动到 running
    $queue.queue.waiting = $queue.queue.waiting | Where-Object { $_.taskId -ne $taskId }
    $task.status = "running"
    $task.startedAt = (Get-Date -Format "o")
    $task.startedBy = $startedBy
    $queue.queue.running += $task
    
    # 更新峰值
    if ($queue.queue.running.Count -gt $queue.stats.peakRunning) {
        $queue.stats.peakRunning = $queue.queue.running.Count
    }
    
    Save-QueueToFile $queue
    
    # 触发事件
    Invoke-Event -event "onTaskStarted" -data @{
        taskId = $taskId
        priority = $task.priority
        allocatedAgents = $task.allocatedAgents
    }
    
    return $true
}

function Complete-Task {
    param(
        [string]$taskId,
        [hashtable]$result = @{}
    )
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if (-not $task) { return $false }
    
    # 移动到 completed
    $queue.queue.running = $queue.queue.running | Where-Object { $_.taskId -ne $taskId }
    $task.status = "completed"
    $task.completedAt = (Get-Date -Format "o")
    $task.progress = 1.0
    $task.result = $result
    
    # 计算等待时间
    $waitTime = ((Get-Date $task.completedAt) - (Get-Date $task.createdAt)).TotalSeconds
    $queue.stats.avgWaitTime = ($queue.stats.avgWaitTime * $queue.stats.totalCompleted + $waitTime) / ($queue.stats.totalCompleted + 1)
    $queue.stats.totalCompleted++
    
    $queue.queue.completed += $task
    
    # 保留最近 100 个完成任务
    if ($queue.queue.completed.Count -gt 100) {
        $queue.queue.completed = $queue.queue.completed | Select-Object -Last 100
    }
    
    Save-QueueToFile $queue
    
    # 触发 blocked 任务检查
    Check-BlockedTasks
    
    # 触发事件
    Invoke-Event -event "onTaskCompleted" -data @{
        taskId = $taskId
        priority = $task.priority
        duration = $waitTime
        result = $result
    }
    
    return $true
}

function Fail-Task {
    param(
        [string]$taskId,
        [string]$error,
        [string]$reason = "execution_error"
    )
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if (-not $task) { return $false }
    
    $queue.queue.running = $queue.queue.running | Where-Object { $_.taskId -ne $taskId }
    
    if ($task.retryCount -lt $task.maxRetries) {
        # 重试
        $task.retryCount++
        $task.status = "waiting"
        $task.lastError = $error
        $task.lastErrorAt = (Get-Date -Format "o")
        $queue.queue.waiting += $task
        Write-Warning "Task $taskId failed (attempt $($task.retryCount)), requeued"
    } else {
        # 永久失败
        $task.status = "failed"
        $task.failedAt = (Get-Date -Format "o")
        $task.error = $error
        $task.reason = $reason
        $queue.queue.failed += $task
        $queue.stats.totalFailed++
        Write-Error "Task $taskId failed permanently after $($task.maxRetries) retries: $error"
        
        # 触发事件
        Invoke-Event -event "onTaskFailed" -data @{
            taskId = $taskId
            error = $error
            reason = $reason
            retryCount = $task.retryCount
        }
    }
    
    Save-QueueToFile $queue
    return $true
}

function Suspend-Task {
    param([string]$taskId)
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if (-not $task) { return $false }
    
    $queue.queue.running = $queue.queue.running | Where-Object { $_.taskId -ne $taskId }
    $task.status = "suspended"
    $task.suspendedAt = (Get-Date -Format "o")
    $queue.queue.suspended += $task
    
    Save-QueueToFile $queue
    
    Invoke-Event -event "onTaskPaused" -data @{taskId=$taskId}
    
    return $true
}

function Resume-Task {
    param([string]$taskId)
    
    $queue = Get-QueueFromFile
    
    $task = $queue.queue.suspended | Where-Object { $_.taskId -eq $taskId }
    if (-not $task) { return $false }
    
    $queue.queue.suspended = $queue.queue.suspended | Where-Object { $_.taskId -ne $taskId }
    $task.status = "waiting"
    $task.resumedAt = (Get-Date -Format "o")
    $queue.queue.waiting += $task
    
    Save-QueueToFile $queue
    
    Invoke-Event -event "onTaskResumed" -data @{taskId=$taskId}
    
    return $true
}

function Cancel-Task {
    param([string]$taskId)
    
    $queue = Get-QueueFromFile
    
    $searchIn = @("running", "waiting", "suspended", "blocked")
    $found = $false
    
    foreach ($listName in $searchIn) {
        $task = $queue.queue.$listName | Where-Object { $_.taskId -eq $taskId }
        if ($task) {
            $queue.queue.$listName = $queue.queue.$listName | Where-Object { $_.taskId -ne $taskId }
            $task.status = "cancelled"
            $task.cancelledAt = (Get-Date -Format "o")
            $queue.queue.completed += $task
            $found = $true
            break
        }
    }
    
    if ($found) {
        Save-QueueToFile $queue
        return $true
    }
    
    return $false
}

# ============================================================
# Dependency Management
# ============================================================

function Check-BlockedTasks {
    <#
    .SYNOPSIS
        Check blocked tasks and unblock those with satisfied dependencies
    #>
    
    $queue = Get-QueueFromFile
    
    $stillBlocked = @()
    
    foreach ($task in $queue.queue.blocked) {
        $allMet = $true
        $unmetDeps = @()
        
        foreach ($depId in $task.dependencies) {
            $depTask = Find-Task -taskId $depId
            if ($null -eq $depTask -or $depTask.status -ne "completed") {
                $allMet = $false
                $unmetDeps += $depId
            }
        }
        
        if ($allMet) {
            # 依赖已满足，移到 waiting
            $task.status = "waiting"
            $task.unblockedAt = (Get-Date -Format "o")
            $queue.queue.waiting += $task
            Write-Host "✅ Task $($task.taskId) unblocked (dependencies satisfied)" -ForegroundColor Green
        } else {
            $task.unmetDependencies = $unmetDeps
            $stillBlocked += $task
        }
    }
    
    $queue.queue.blocked = $stillBlocked
    Save-QueueToFile $queue
}

function Get-TaskDependencies {
    param([string]$taskId)
    
    $task = Find-Task $taskId
    if ($null -eq $task) { return $null }
    
    $depStatus = @()
    foreach ($depId in $task.dependencies) {
        $depTask = Find-Task $taskId $depId
        $depStatus += @{
            taskId = $depId
            status = if ($depTask) { $depTask.status } else { "not_found" }
        }
    }
    
    return @{
        taskId = $taskId
        dependencies = $depStatus
        allSatisfied = ($depStatus | Where-Object { $_.status -ne "completed" }).Count -eq 0
    }
}

# ============================================================
# Batch Operations
# ============================================================

function Add-TaskBatch {
    <#
    .SYNOPSIS
        Add multiple tasks at once
    #>
    param(
        [Parameter(Mandatory=$true)]
        [hashtable[]]$tasks
    )
    
    $results = @()
    
    foreach ($t in $tasks) {
        $result = Add-TaskToQueue `
            -taskId $t.taskId `
            -priority ($t.priority -or "P2") `
            -taskType $t.taskType `
            -estimatedAgents $t.estimatedAgents `
            -payload ($t.payload -or @{}) `
            -dependsOn ($t.dependsOn -or @()) `
            -groupId ($t.groupId -or $null) `
            -description ($t.description -or "")
        
        $results += $result
    }
    
    return @{
        submitted = ($results | Where-Object { $_.success }).Count
        failed = ($results | Where-Object { -not $_.success }).Count
        results = $results
    }
}

function Cancel-TaskGroup {
    <#
    .SYNOPSIS
        Cancel all tasks in a group
    #>
    param([string]$groupId)
    
    $queue = Get-QueueFromFile
    $cancelled = @()
    
    foreach ($listName in @("running", "waiting", "suspended", "blocked")) {
        $tasks = $queue.queue.$listName | Where-Object { $_.groupId -eq $groupId }
        foreach ($task in $tasks) {
            $task.status = "cancelled"
            $task.cancelledAt = (Get-Date -Format "o")
            $queue.queue.completed += $task
            $cancelled += $task.taskId
        }
        $queue.queue.$listName = $queue.queue.$listName | Where-Object { $_.groupId -ne $groupId }
    }
    
    Save-QueueToFile $queue
    
    return @{
        cancelled = $cancelled.Count
        taskIds = $cancelled
    }
}

function Get-TaskGroup {
    param([string]$groupId)
    
    $queue = Get-QueueFromFile
    
    $allTasks = @($queue.queue.running) + @($queue.queue.waiting) + 
                @($queue.queue.completed) + @($queue.queue.failed) + 
                @($queue.queue.suspended) + @($queue.queue.blocked)
    
    $groupTasks = $allTasks | Where-Object { $_.groupId -eq $groupId }
    
    $statusCounts = @{
        running = ($groupTasks | Where-Object { $_.status -eq "running" }).Count
        waiting = ($groupTasks | Where-Object { $_.status -eq "waiting" }).Count
        completed = ($groupTasks | Where-Object { $_.status -eq "completed" }).Count
        failed = ($groupTasks | Where-Object { $_.status -eq "failed" }).Count
        blocked = ($groupTasks | Where-Object { $_.status -eq "blocked" }).Count
    }
    
    return @{
        groupId = $groupId
        total = $groupTasks.Count
        statusCounts = $statusCounts
        tasks = $groupTasks | Select-Object taskId, priority, status, progress, createdAt
    }
}

# ============================================================
# Scheduler
# ============================================================

function Start-TaskScheduler {
    <#
    .SYNOPSIS
        Start the background task scheduler
    #>
    param(
        [int]$intervalSeconds = 5
    )
    
    if ($script:schedulerRunning) {
        Write-Warning "Scheduler is already running"
        return $false
    }
    
    $script:schedulerRunning = $true
    $queue = Get-QueueFromFile
    $queue.scheduler.running = $true
    $queue.config.schedulerInterval = $intervalSeconds
    Save-QueueToFile $queue
    
    Write-Host "🚀 Task scheduler started (interval: ${intervalSeconds}s)" -ForegroundColor Green
    
    # 在后台运行调度循环
    $script:schedulerJob = Start-Job -ScriptBlock {
        param($queueFile, $intervalSeconds, $config)
        
        $script:config = $config
        
        function Get-Queue {
            if (!(Test-Path $queueFile)) { return $null }
            return Get-Content $queueFile -Raw | ConvertFrom-Json
        }
        
        function Save-Queue {
            param($queue)
            $queue | ConvertTo-Json -Depth 15 | Out-File -FilePath $queueFile -Encoding utf8
        }
        
        while ($true) {
            try {
                $queue = Get-Queue
                if ($null -eq $queue) { break }
                
                $currentAgents = 0
                foreach ($task in $queue.queue.running) {
                    $currentAgents += $task.allocatedAgents
                }
                $availableAgents = $queue.limits.maxTotalAgents - $currentAgents
                
                # 按优先级排序等待队列
                $sorted = $queue.queue.waiting | Sort-Object { 
                    $priorityWeight = $script:config.priorities[$_.priority].weight
                    # 考虑等待时间，防止饥饿
                    $waitMinutes = ((Get-Date) - (Get-Date $_.createdAt)).TotalMinutes
                    $priorityWeight + ($waitMinutes / 60) * 0.1
                } -Descending
                
                $started = 0
                foreach ($task in $sorted) {
                    # 检查任务槽位
                    if ($queue.queue.running.Count -ge $queue.limits.maxConcurrentTasks) { break }
                    
                    # 检查 Agent 资源
                    if ($task.allocatedAgents -le $availableAgents) {
                        # 启动任务
                        $queue.queue.waiting = $queue.queue.waiting | Where-Object { $_.taskId -ne $task.taskId }
                        $task.status = "running"
                        $task.startedAt = (Get-Date -Format "o")
                        $task.startedBy = "scheduler"
                        $queue.queue.running += $task
                        
                        $availableAgents -= $task.allocatedAgents
                        $queue.scheduler.totalScheduled++
                        $started++
                    }
                }
                
                $queue.scheduler.lastRun = (Get-Date -Format "o")
                Save-Queue $queue
                
                if ($started -gt 0) {
                    Write-Host "📋 Scheduler: started $started task(s)" -ForegroundColor Cyan
                }
            }
            catch {
                Write-Warning "Scheduler error: $_"
            }
            
            Start-Sleep -Seconds $intervalSeconds
        }
    } -ArgumentList $script:queueFile, $intervalSeconds, $script:config
    
    return $true
}

function Stop-TaskScheduler {
    <#
    .SYNOPSIS
        Stop the background task scheduler
    #>
    
    if (-not $script:schedulerRunning) {
        Write-Warning "Scheduler is not running"
        return $false
    }
    
    $script:schedulerRunning = $false
    
    if ($script:schedulerJob) {
        Stop-Job -Job $script:schedulerJob -ErrorAction SilentlyContinue
        Remove-Job -Job $script:schedulerJob -Force -ErrorAction SilentlyContinue
        $script:schedulerJob = $null
    }
    
    $queue = Get-QueueFromFile
    $queue.scheduler.running = $false
    Save-QueueToFile $queue
    
    Write-Host "⏹️ Task scheduler stopped" -ForegroundColor Yellow
    
    return $true
}

function Invoke-SchedulerTick {
    <#
    .SYNOPSIS
        Manually trigger a scheduler tick (for testing)
    #>
    
    $queue = Get-QueueFromFile
    
    $currentAgents = 0
    foreach ($task in $queue.queue.running) {
        $currentAgents += $task.allocatedAgents
    }
    $availableAgents = $queue.limits.maxTotalAgents - $currentAgents
    
    # 按优先级排序
    $sorted = $queue.queue.waiting | Sort-Object { 
        $script:config.priorities[$_.priority].weight
    } -Descending
    
    $started = 0
    foreach ($task in $sorted) {
        if ($queue.queue.running.Count -ge $queue.limits.maxConcurrentTasks) { break }
        if ($task.allocatedAgents -le $availableAgents) {
            Start-Task -taskId $task.taskId -startedBy "manual"
            $availableAgents -= $task.allocatedAgents
            $started++
        }
    }
    
    return @{
        started = $started
        runningNow = $queue.queue.running.Count
        availableAgents = $availableAgents
    }
}

# ============================================================
# Timeout and Cleanup
# ============================================================

function Check-TaskTimeouts {
    <#
    .SYNOPSIS
        Check and handle task timeouts
    #>
    
    $queue = Get-QueueFromFile
    $timedOut = @()
    
    foreach ($task in $queue.queue.running) {
        $elapsed = ((Get-Date) - (Get-Date $task.startedAt)).TotalSeconds
        
        if ($elapsed -gt $task.timeout) {
            $timedOut += $task.taskId
            Fail-Task -taskId $task.taskId -error "Task timeout after $elapsed seconds" -reason "timeout"
        }
    }
    
    # 检查 blocked 任务是否阻塞太久
    foreach ($task in $queue.queue.blocked) {
        if ($task.blockedSince) {
            $blockedMinutes = ((Get-Date) - (Get-Date $task.blockedSince)).TotalMinutes
            if ($blockedMinutes -gt 60) {
                # 依赖可能永远无法满足，取消任务
                $task.status = "cancelled"
                $task.cancelledAt = (Get-Date -Format "o")
                $task.cancelReason = "dependency_timeout"
                $queue.queue.blocked = $queue.queue.blocked | Where-Object { $_.taskId -ne $task.taskId }
                $queue.queue.completed += $task
            }
        }
    }
    
    Save-QueueToFile $queue
    
    if ($timedOut.Count -gt 0) {
        Write-Warning "Timed out tasks: $($timedOut -join ', ')"
    }
    
    return $timedOut
}

function Get-QueueStats {
    <#
    .SYNOPSIS
        Get detailed queue statistics
    #>
    
    $queue = Get-QueueFromFile
    
    $today = Get-Date
    $todayCompleted = @($queue.queue.completed | Where-Object { 
        $_.completedAt -and (Get-Date $_.completedAt) -gt $today.Date 
    })
    
    $avgDuration = 0
    if ($todayCompleted.Count -gt 0) {
        $totalDuration = 0
        foreach ($t in $todayCompleted) {
            if ($t.startedAt -and $t.completedAt) {
                $totalDuration += ((Get-Date $t.completedAt) - (Get-Date $t.startedAt)).TotalSeconds
            }
        }
        $avgDuration = $totalDuration / $todayCompleted.Count
    }
    
    $priorityBreakdown = @{}
    foreach ($p in $script:config.priorities.Keys) {
        $priorityBreakdown[$p] = @{
            waiting = @($queue.queue.waiting | Where-Object { $_.priority -eq $p }).Count
            running = @($queue.queue.running | Where-Object { $_.priority -eq $p }).Count
        }
    }
    
    return @{
        timestamp = (Get-Date -Format "o")
        total = @{
            submitted = $queue.stats.totalSubmitted
            completed = $queue.stats.totalCompleted
            failed = $queue.stats.totalFailed
            successRate = if ($queue.stats.totalCompleted + $queue.stats.totalFailed -gt 0) { 
                $queue.stats.totalCompleted / ($queue.stats.totalCompleted + $queue.stats.totalFailed) 
            } else { 0 }
        }
        today = @{
            completed = $todayCompleted.Count
            avgDurationSeconds = $avgDuration
        }
        resources = @{
            peakConcurrentTasks = $queue.stats.peakRunning
            maxConcurrentTasks = $queue.limits.maxConcurrentTasks
            utilizationPercent = if ($queue.stats.peakRunning -gt 0) { 
                ($queue.stats.peakRunning / $queue.limits.maxConcurrentTasks) * 100 
            } else { 0 }
        }
        byPriority = $priorityBreakdown
        avgWaitTimeSeconds = $queue.stats.avgWaitTime
    }
}

function Clear-CompletedTasks {
    param([int]$keepLast = 20)
    
    $queue = Get-QueueFromFile
    
    if ($queue.queue.completed.Count -gt $keepLast) {
        $queue.queue.completed = $queue.queue.completed | Select-Object -Last $keepLast
    }
    
    if ($queue.queue.failed.Count -gt $keepLast) {
        $queue.queue.failed = $queue.queue.failed | Select-Object -Last $keepLast
    }
    
    Save-QueueToFile $queue
    
    return @{
        cleared = $true
        completedKept = [Math]::Min($keepLast, $queue.queue.completed.Count)
        failedKept = [Math]::Min($keepLast, $queue.queue.failed.Count)
    }
}

# ============================================================
# Legacy Compatibility Functions
# ============================================================

function Add-TaskToQueue-Legacy {
    param([hashtable]$task)
    return Add-TaskToQueue -taskId $task.taskId -priority $task.priority -taskType $task.type `
        -estimatedAgents $task.estimatedAgents -payload ($task.payload -or @{}) `
        -description ($task.payload.description -or "")
}

function Get-Task {
    param([string]$taskId)
    return Find-Task $taskId
}

# ============================================================
# Test Function
# ============================================================

function Test-MultiTaskQueue {
    Write-Host "`n=== Multi-Task Queue v1.1 Tests ===" -ForegroundColor Cyan
    
    Initialize-Queue -Force
    
    # Test 1: Add single task
    Write-Host "`n[Test 1] Add Single Task" -ForegroundColor Yellow
    $result = Add-TaskToQueue -taskId "test-001" -priority "P2" -taskType "test" -estimatedAgents 2
    if ($result.success) { Write-Host "✅ PASS" -ForegroundColor Green } else { Write-Host "❌ FAIL: $($result.message)" -ForegroundColor Red }
    
    # Test 2: Add task with dependencies
    Write-Host "`n[Test 2] Add Task with Dependencies" -ForegroundColor Yellow
    $result = Add-TaskToQueue -taskId "test-002" -priority "P1" -taskType "test" -dependsOn @("test-001")
    if ($result.success -and $result.status -eq "blocked") { Write-Host "✅ PASS (blocked)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 3: Complete dependency task
    Write-Host "`n[Test 3] Complete Dependency Task" -ForegroundColor Yellow
    $queue = Get-QueueFromFile
    $task = $queue.queue.waiting | Where-Object { $_.taskId -eq "test-001" }
    $queue.queue.waiting = $queue.queue.waiting | Where-Object { $_.taskId -ne "test-001" }
    $task.status = "completed"
    $task.completedAt = (Get-Date -Format "o")
    $queue.queue.completed += $task
    Save-QueueToFile $queue
    Check-BlockedTasks
    $queue = Get-QueueFromFile
    $unblocked = $queue.queue.waiting | Where-Object { $_.taskId -eq "test-002" }
    if ($unblocked) { Write-Host "✅ PASS (test-002 unblocked)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 4: Batch add
    Write-Host "`n[Test 4] Batch Add Tasks" -ForegroundColor Yellow
    $batch = @(
        @{taskId="batch-001"; priority="P3"; taskType="test"; estimatedAgents=1},
        @{taskId="batch-002"; priority="P0"; taskType="test"; estimatedAgents=2}
    )
    $result = Add-TaskBatch -tasks $batch
    if ($result.submitted -eq 2) { Write-Host "✅ PASS ($($result.submitted) tasks)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 5: Queue status
    Write-Host "`n[Test 5] Get Queue Status" -ForegroundColor Yellow
    $status = Get-QueueStatus
    if ($status.waiting.count -ge 2) { Write-Host "✅ PASS ($($status.waiting.count) waiting)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 6: Scheduler tick
    Write-Host "`n[Test 6] Scheduler Tick" -ForegroundColor Yellow
    $result = Invoke-SchedulerTick
    if ($result.started -gt 0) { Write-Host "✅ PASS (started $($result.started))" -ForegroundColor Green } else { Write-Host "⚠️ No tasks started (resources?)" -ForegroundColor Yellow }
    
    # Test 7: Task group
    Write-Host "`n[Test 7] Task Group" -ForegroundColor Yellow
    $groupId = "group-test"
    Add-TaskToQueue -taskId "grp-001" -priority "P2" -taskType "test" -groupId $groupId
    Add-TaskToQueue -taskId "grp-002" -priority "P2" -taskType "test" -groupId $groupId
    $group = Get-TaskGroup -groupId $groupId
    if ($group.total -eq 2) { Write-Host "✅ PASS (group has 2 tasks)" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    # Test 8: Stats
    Write-Host "`n[Test 8] Queue Statistics" -ForegroundColor Yellow
    $stats = Get-QueueStats
    if ($stats.total.submitted -gt 0) { Write-Host "✅ PASS (submitted: $($stats.total.submitted))" -ForegroundColor Green } else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

# Auto-initialize
Initialize-Queue

# Export functions
Export-ModuleMember -Function `
    Initialize-Queue, Get-QueueStatus, Get-QueueConfig, Set-QueueConfig, `
    Add-TaskToQueue, Find-Task, Get-TaskStatus, Update-TaskPriority, Update-TaskProgress, `
    Add-TaskStage, Complete-TaskStage, `
    Start-Task, Complete-Task, Fail-Task, Suspend-Task, Resume-Task, Cancel-Task, `
    Check-BlockedTasks, Get-TaskDependencies, `
    Add-TaskBatch, Cancel-TaskGroup, Get-TaskGroup, `
    Start-TaskScheduler, Stop-TaskScheduler, Invoke-SchedulerTick, `
    Check-TaskTimeouts, Get-QueueStats, Clear-CompletedTasks, `
    Register-EventHandler, `
    Test-MultiTaskQueue
