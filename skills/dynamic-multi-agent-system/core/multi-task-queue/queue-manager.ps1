# Multi-Task Queue Manager - Pure PowerShell Implementation
# 多任务队列管理器 - 纯 PowerShell 脚本（简化版）

$script:queueFile = Join-Path $PSScriptRoot "..\..\state\multi-task-queue.json"
$script:schedulerRunning = $false

# 配置
$maxRunningTasks = 3
$maxTotalAgents = 12

function Initialize-Queue {
    if (!(Test-Path $queueFile)) {
        $queue = @{
            queue = @{
                running = @()
                waiting = @()
                completed = @()
                failed = @()
                suspended = @()
            }
            limits = @{
                maxRunningTasks = $maxRunningTasks
                maxTotalAgents = $maxTotalAgents
            }
            scheduler = @{
                running = $false
                interval = 5
                lastRun = $null
            }
        }
        $queue | ConvertTo-Json -Depth 10 | Out-File -FilePath $queueFile -Encoding utf8
        Write-Host "✅ Queue initialized" -ForegroundColor Green
    }
}

function Get-Queue {
    if (!(Test-Path $queueFile)) {
        Initialize-Queue
    }
    return Get-Content $queueFile -Raw | ConvertFrom-Json
}

function Save-Queue {
    param($queue)
    $queue | ConvertTo-Json -Depth 10 | Out-File -FilePath $queueFile -Encoding utf8
}

function Add-TaskToQueue {
    param([hashtable]$task)
    
    $queue = Get-Queue
    
    $taskObj = @{
        taskId = $task.taskId
        priority = $task.priority
        type = $task.type
        estimatedAgents = $task.estimatedAgents
        createdAt = (Get-Date -Format "o")
        status = "waiting"
        retryCount = 0
        payload = $task.payload
    }
    
    $queue.queue.waiting += $taskObj
    Save-Queue $queue
    
    Write-Host "✅ Task $($task.taskId) added to queue (Priority: $($task.priority))" -ForegroundColor Green
    return $true
}

function Get-QueueStatus {
    $queue = Get-Queue
    
    $currentAgents = 0
    foreach ($task in $queue.queue.running) {
        $currentAgents += $task.estimatedAgents
    }
    
    return @{
        running = $queue.queue.running
        waiting = $queue.queue.waiting
        completed = $queue.queue.completed
        failed = $queue.queue.failed
        suspended = $queue.queue.suspended
        limits = @{
            maxRunningTasks = $queue.limits.maxRunningTasks
            maxTotalAgents = $queue.limits.maxTotalAgents
            currentAgents = $currentAgents
            availableAgents = ($queue.limits.maxTotalAgents - $currentAgents)
        }
        scheduler = $queue.scheduler
    }
}

function Update-TaskPriority {
    param(
        [string]$taskId,
        [string]$priority
    )
    
    $queue = Get-Queue
    
    $task = $queue.queue.waiting | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        $task.priority = $priority
        Save-Queue $queue
        Write-Host "✅ Task $taskId priority updated to $priority" -ForegroundColor Green
        return $true
    }
    
    Write-Warning "Task $taskId not found in waiting queue"
    return $false
}

function Suspend-Task {
    param([string]$taskId)
    
    $queue = Get-Queue
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        $queue.queue.running = $queue.queue.running | Where-Object { $_.taskId -ne $taskId }
        $task.status = "suspended"
        $queue.queue.suspended += $task
        Save-Queue $queue
        Write-Host "✅ Task $taskId suspended" -ForegroundColor Green
        return $true
    }
    
    Write-Warning "Task $taskId not found in running queue"
    return $false
}

function Resume-Task {
    param([string]$taskId)
    
    $queue = Get-Queue
    
    $task = $queue.queue.suspended | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        $queue.queue.suspended = $queue.queue.suspended | Where-Object { $_.taskId -ne $taskId }
        $task.status = "waiting"
        $queue.queue.waiting += $task
        Save-Queue $queue
        Write-Host "✅ Task $taskId resumed" -ForegroundColor Green
        return $true
    }
    
    Write-Warning "Task $taskId not found in suspended queue"
    return $false
}

function Cancel-Task {
    param([string]$taskId)
    
    $queue = Get-Queue
    
    $found = $false
    
    $queue.queue.waiting = $queue.queue.waiting | Where-Object {
        if ($_.taskId -eq $taskId) { $found = $true; return $false }
        return $true
    }
    
    $queue.queue.running = $queue.queue.running | Where-Object {
        if ($_.taskId -eq $taskId) { $found = $true; return $false }
        return $true
    }
    
    $queue.queue.suspended = $queue.queue.suspended | Where-Object {
        if ($_.taskId -eq $taskId) { $found = $true; return $false }
        return $true
    }
    
    if ($found) {
        Save-Queue $queue
        Write-Host "✅ Task $taskId cancelled" -ForegroundColor Green
        return $true
    }
    
    Write-Warning "Task $taskId not found"
    return $false
}

function Get-Task {
    param([string]$taskId)
    
    $queue = Get-Queue
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if ($task) { return $task }
    
    $task = $queue.queue.waiting | Where-Object { $_.taskId -eq $taskId }
    if ($task) { return $task }
    
    $task = $queue.queue.suspended | Where-Object { $_.taskId -eq $taskId }
    if ($task) { return $task }
    
    $task = $queue.queue.completed | Where-Object { $_.taskId -eq $taskId }
    if ($task) { return $task }
    
    $task = $queue.queue.failed | Where-Object { $_.taskId -eq $taskId }
    if ($task) { return $task }
    
    return $null
}

function Complete-Task {
    param(
        [string]$taskId,
        [hashtable]$result
    )
    
    $queue = Get-Queue
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        $queue.queue.running = $queue.queue.running | Where-Object { $_.taskId -ne $taskId }
        $task.status = "completed"
        $task.completedAt = (Get-Date -Format "o")
        $task.result = $result
        $queue.queue.completed += $task
        
        if ($queue.queue.completed.Count -gt 50) {
            $queue.queue.completed = $queue.queue.completed | Select-Object -Last 50
        }
        
        Save-Queue $queue
        Write-Host "✅ Task $taskId completed" -ForegroundColor Green
        return $true
    }
    
    return $false
}

function Fail-Task {
    param(
        [string]$taskId,
        [string]$error
    )
    
    $queue = Get-Queue
    
    $task = $queue.queue.running | Where-Object { $_.taskId -eq $taskId }
    if ($task) {
        $queue.queue.running = $queue.queue.running | Where-Object { $_.taskId -ne $taskId }
        
        if ($task.retryCount -lt 1) {
            $task.retryCount++
            $task.status = "waiting"
            $task.error = $error
            $queue.queue.waiting += $task
            Write-Host "⚠️ Task $taskId failed, retrying (attempt $($task.retryCount))..." -ForegroundColor Yellow
        } else {
            $task.status = "failed"
            $task.failedAt = (Get-Date -Format "o")
            $task.error = $error
            $queue.queue.failed += $task
            Write-Error "Task $taskId failed after 1 retry: $error"
        }
        
        Save-Queue $queue
        return $true
    }
    
    return $false
}

function Test-MultiTaskQueue {
    Write-Host "=== Multi-Task Queue Tests ===" -ForegroundColor Cyan
    
    Initialize-Queue
    
    Write-Host "`n[Test 1] Add Task" -ForegroundColor Yellow
    $task = @{
        taskId = "test-001"
        priority = "P2"
        type = "test"
        estimatedAgents = 2
    }
    $result = Add-TaskToQueue -task $task
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Get Queue Status" -ForegroundColor Yellow
    $status = Get-QueueStatus
    if ($status.waiting.Count -gt 0) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 3] Update Priority" -ForegroundColor Yellow
    Update-TaskPriority -taskId "test-001" -priority "P0"
    $task = Get-Task "test-001"
    if ($task.priority -eq "P0") { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 4] Cancel Task" -ForegroundColor Yellow
    $result = Cancel-Task -taskId "test-001"
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

# 自动初始化
Initialize-Queue
