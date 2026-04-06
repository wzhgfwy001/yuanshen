# Visual Monitor Enhancer - P2 可视化增强
# 执行进度可视化增强模块

$script:dashboardFile = Join-Path $PSScriptRoot "..\core\multi-task-queue\dashboard-simple.html"
$script:realtimeDataFile = Join-Path $PSScriptRoot "..\..\state\realtime-monitor.json"

function Initialize-RealtimeMonitor {
    if (!(Test-Path $realtimeDataFile)) {
        $data = @{
            timestamp = (Get-Date -Format "o")
            tasks = @{
                running = 0
                waiting = 0
                completed = 0
            }
            agents = @{
                total = 0
                active = 0
                idle = 0
            }
            progress = @()
            alerts = @()
        }
        $data | ConvertTo-Json | Out-File -FilePath $realtimeDataFile -Encoding utf8
    }
}

function Update-TaskProgress {
    param(
        [string]$taskId,
        [int]$percent,
        [string]$status,
        [string]$currentAgent
    )
    
    $data = Get-Content $realtimeDataFile -Raw | ConvertFrom-Json
    
    # 更新或添加进度
    $existing = $data.progress | Where-Object { $_.taskId -eq $taskId }
    
    if ($existing) {
        $existing.percent = $percent
        $existing.status = $status
        $existing.currentAgent = $currentAgent
        $existing.updatedAt = (Get-Date -Format "o")
    } else {
        $data.progress += @{
            taskId = $taskId
            percent = $percent
            status = $status
            currentAgent = $currentAgent
            createdAt = (Get-Date -Format "o")
            updatedAt = (Get-Date -Format "o")
        }
    }
    
    # 限制进度记录数量
    if ($data.progress.Count -gt 20) {
        $data.progress = $data.progress | Select-Object -Last 20
    }
    
    $data.timestamp = (Get-Date -Format "o")
    $data | ConvertTo-Json | Out-File -FilePath $realtimeDataFile -Encoding utf8
}

function Add-Alert {
    param(
        [string]$message,
        [string]$level = "info"
    )
    
    $data = Get-Content $realtimeDataFile -Raw | ConvertFrom-Json
    
    $alert = @{
        id = "alert-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        message = $message
        level = $level
        createdAt = (Get-Date -Format "o")
        acknowledged = $false
    }
    
    $data.alerts += $alert
    
    # 限制告警数量
    if ($data.alerts.Count -gt 50) {
        $data.alerts = $data.alerts | Select-Object -Last 50
    }
    
    $data | ConvertTo-Json | Out-File -FilePath $realtimeDataFile -Encoding utf8
    Write-Host "[$level.ToUpper()] $message" -ForegroundColor $(if ($level -eq "error") { "Red" } elseif ($level -eq "warning") { "Yellow" } else { "Green" })
}

function Get-MonitorData {
    if (!(Test-Path $realtimeDataFile)) {
        Initialize-RealtimeMonitor
    }
    return Get-Content $realtimeDataFile -Raw | ConvertFrom-Json
}

function Update-Dashboard {
    param(
        [hashtable]$taskData,
        [hashtable]$agentData
    )
    
    $data = Get-Content $realtimeDataFile -Raw | ConvertFrom-Json
    
    # 更新任务统计
    $data.tasks.running = $taskData.running
    $data.tasks.waiting = $taskData.waiting
    $data.tasks.completed = $taskData.completed
    
    # 更新 Agent 统计
    $data.agents.total = $agentData.total
    $data.agents.active = $agentData.active
    $data.agents.idle = $agentData.idle
    
    $data.timestamp = (Get-Date -Format "o")
    $data | ConvertTo-Json | Out-File -FilePath $realtimeDataFile -Encoding utf8
}

function Get-Alerts {
    param(
        [string]$level,
        [int]$limit = 10
    )
    
    $data = Get-Content $realtimeDataFile -Raw | ConvertFrom-Json
    
    if ($level) {
        $alerts = $data.alerts | Where-Object { $_.level -eq $level }
    } else {
        $alerts = $data.alerts
    }
    
    return $alerts | Select-Object -Last $limit
}

function Acknowledge-Alert {
    param([string]$alertId)
    
    $data = Get-Content $realtimeDataFile -Raw | ConvertFrom-Json
    
    $alert = $data.alerts | Where-Object { $_.id -eq $alertId }
    if ($alert) {
        $alert.acknowledged = $true
        $data | ConvertTo-Json | Out-File -FilePath $realtimeDataFile -Encoding utf8
        return $true
    }
    
    return $false
}

function Clear-OldAlerts {
    param([int]$days = 1)
    
    $data = Get-Content $realtimeDataFile -Raw | ConvertFrom-Json
    $cutoff = (Get-Date).AddDays(-$days)
    
    $data.alerts = $data.alerts | Where-Object {
        [DateTime]::Parse($_.createdAt) -gt $cutoff
    }
    
    $data | ConvertTo-Json | Out-File -FilePath $realtimeDataFile -Encoding utf8
}

function Start-RealtimeServer {
    param([int]$port = 5001)
    
    Write-Host "Starting realtime monitor server on port $port..." -ForegroundColor Cyan
    
    # 注意：PowerShell 原生不支持 HTTP 服务器，需要使用 .NET 或第三方库
    # 这里提供简化方案：定时更新 JSON 文件，前端轮询
    
    Write-Host "Realtime monitor initialized" -ForegroundColor Green
    Write-Host "Frontend should poll $realtimeDataFile every 2 seconds" -ForegroundColor Yellow
}

function Test-VisualMonitor {
    Write-Host "=== Visual Monitor Enhancer Tests ===" -ForegroundColor Cyan
    
    Initialize-RealtimeMonitor
    
    Write-Host "`n[Test 1] Update Task Progress" -ForegroundColor Yellow
    Update-TaskProgress -taskId "test-001" -percent 50 -status "running" -currentAgent "agent-01"
    $data = Get-MonitorData
    if ($data.progress.Count -gt 0) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Add Alert" -ForegroundColor Yellow
    Add-Alert -message "Test alert" -level "info"
    $alerts = Get-Alerts -limit 10
    if ($alerts.Count -gt 0) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 3] Update Dashboard Data" -ForegroundColor Yellow
    Update-Dashboard -taskData @{running=2; waiting=1; completed=5} -agentData @{total=12; active=8; idle=4}
    $data = Get-MonitorData
    if ($data.tasks.running -eq 2) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 4] Get Alerts by Level" -ForegroundColor Yellow
    Add-Alert -message "Warning alert" -level "warning"
    $warnings = Get-Alerts -level "warning"
    if ($warnings.Count -gt 0) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 5] Acknowledge Alert" -ForegroundColor Yellow
    $alert = (Get-Alerts -limit 1)[0]
    $result = Acknowledge-Alert -alertId $alert.id
    if ($result) { Write-Host "PASS" -ForegroundColor Green }
    else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
}

Initialize-RealtimeMonitor
