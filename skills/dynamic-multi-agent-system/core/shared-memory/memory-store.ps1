# Shared Memory Store - Pure PowerShell Implementation
# 共享记忆存储实现 - 纯 PowerShell 脚本

function Get-MemoryFilePath {
    param([string]$taskId)
    
    $basePath = Join-Path $PSScriptRoot "..\..\state\shared-memories"
    if (!(Test-Path $basePath)) {
        New-Item -ItemType Directory -Force -Path $basePath | Out-Null
    }
    
    return Join-Path $basePath "$taskId.json"
}

function Initialize-Memory {
    param(
        [string]$taskId,
        [hashtable]$metadata = @{}
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (Test-Path $filePath) {
        Write-Warning "Memory for task $taskId already exists"
        return $false
    }
    
    $memory = @{
        taskId = $taskId
        metadata = @{
            createdAt = (Get-Date -Format "o")
            taskType = $metadata.taskType
            status = "running"
        }
        memory = @{
            settings = @{}
            outline = @{}
            characters = @()
            keyPoints = @()
            custom = @{}
        }
        accessLog = @()
        lock = @{
            type = "none"
            holder = $null
            acquiredAt = $null
        }
    }
    
    $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    Write-Host "✅ Memory initialized for task: $taskId" -ForegroundColor Green
    return $true
}

function Write-SharedMemory {
    param(
        [string]$taskId,
        [string]$section,
        [hashtable]$data,
        [string]$agent
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        Write-Error "Memory for task $taskId not found"
        return $false
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    if ($memory.lock.type -eq "write" -and $memory.lock.holder -ne $agent) {
        Write-Error "Memory is locked by $($memory.lock.holder)"
        return $false
    }
    
    $memory.memory.$section = $data
    
    $logEntry = @{
        agent = $agent
        action = "write"
        section = $section
        timestamp = (Get-Date -Format "o")
    }
    $memory.accessLog += $logEntry
    
    $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    Write-Debug "Memory written by $agent for task $taskId"
    return $true
}

function Read-SharedMemory {
    param(
        [string]$taskId,
        [string]$agent,
        [string]$section
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        Write-Warning "Memory for task $taskId not found"
        return $null
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    if ($agent) {
        $logEntry = @{
            agent = $agent
            action = "read"
            section = $section
            timestamp = (Get-Date -Format "o")
        }
        $memory.accessLog += $logEntry
        $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    }
    
    if ($section) {
        return $memory.memory.$section
    } else {
        return $memory.memory
    }
}

function Update-SharedMemory {
    param(
        [string]$taskId,
        [string]$section,
        [hashtable]$data,
        [string]$agent
    )
    return Write-SharedMemory -taskId $taskId -section $section -data $data -agent $agent
}

function Remove-SharedMemory {
    param([string]$taskId)
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Write-Host "✅ Memory removed for task: $taskId" -ForegroundColor Green
        return $true
    } else {
        Write-Warning "Memory for task $taskId not found"
        return $false
    }
}

function Get-MemoryAccessLog {
    param(
        [string]$taskId,
        [int]$limit = 10
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return @()
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    return $memory.accessLog | Select-Object -Last $limit
}

function Acquire-WriteLock {
    param(
        [string]$taskId,
        [string]$agent,
        [int]$timeoutMs = 5000
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        Write-Error "Memory for task $taskId not found"
        return $false
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    if ($memory.lock.type -eq "write") {
        $lockTime = [DateTime]::Parse($memory.lock.acquiredAt)
        $elapsed = (Get-Date) - $lockTime
        
        if ($elapsed.TotalMinutes -gt 5) {
            Write-Warning "Lock timeout, forcing release"
            $memory.lock.type = "none"
            $memory.lock.holder = $null
            $memory.lock.acquiredAt = $null
        } else {
            Write-Warning "Memory is locked by $($memory.lock.holder)"
            return $false
        }
    }
    
    $memory.lock.type = "write"
    $memory.lock.holder = $agent
    $memory.lock.acquiredAt = (Get-Date -Format "o")
    
    $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    Write-Debug "Write lock acquired by $agent for task $taskId"
    return $true
}

function Release-WriteLock {
    param(
        [string]$taskId,
        [string]$agent
    )
    
    $filePath = Get-MemoryFilePath $taskId
    
    if (!(Test-Path $filePath)) {
        return $false
    }
    
    $memory = Get-Content $filePath -Raw | ConvertFrom-Json
    
    if ($memory.lock.holder -ne $agent) {
        Write-Warning "Cannot release lock: not the holder"
        return $false
    }
    
    $memory.lock.type = "none"
    $memory.lock.holder = $null
    $memory.lock.acquiredAt = $null
    
    $memory | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    Write-Debug "Write lock released by $agent for task $taskId"
    return $true
}

function Test-SharedMemory-Store {
    Write-Host "=== Shared Memory Store Tests ===" -ForegroundColor Cyan
    
    $testTaskId = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    Write-Host "`n[Test 1] Initialize Memory" -ForegroundColor Yellow
    $result = Initialize-Memory -taskId $testTaskId -metadata @{taskType = "test"}
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Write Memory" -ForegroundColor Yellow
    $result = Write-SharedMemory -taskId $testTaskId -section "settings" -data @{key = "value"} -agent "test-agent"
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 3] Read Memory" -ForegroundColor Yellow
    $data = Read-SharedMemory -taskId $testTaskId -agent "test-agent"
    if ($data.settings.key -eq "value") { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 4] Acquire Lock" -ForegroundColor Yellow
    $result = Acquire-WriteLock -taskId $testTaskId -agent "test-agent"
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 5] Release Lock" -ForegroundColor Yellow
    $result = Release-WriteLock -taskId $testTaskId -agent "test-agent"
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 6] Remove Memory" -ForegroundColor Yellow
    $result = Remove-SharedMemory -taskId $testTaskId
    if ($result) { Write-Host "✅ PASS" -ForegroundColor Green }
    else { Write-Host "❌ FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

# Export functions
Export-ModuleMember -Function Initialize-Memory, Write-SharedMemory, Read-SharedMemory, Update-SharedMemory, Remove-SharedMemory, Get-MemoryAccessLog, Acquire-WriteLock, Release-WriteLock, Test-SharedMemory-Store
