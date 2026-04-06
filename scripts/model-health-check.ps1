# 模型健康检查与自动切换脚本
# Model Health Check & Auto-Switch Script
# 用途：心跳时检测模型可用性，自动切换到可用模型

param(
    [switch]$ForceSwitch,    # 强制切换（不测试当前模型）
    [switch]$DryRun         # 仅测试，不实际切换
)

$ErrorActionPreference = "Continue"
$ScriptDir = "C:\Users\DELL\.openclaw\workspace\scripts"
$BackupFile = "$ScriptDir\model-backup.json"
$LogFile = "$ScriptDir\model-switch.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry -Encoding UTF8
}

function Get-CurrentModel {
    $config = Get-Content "$env:USERPROFILE\.openclaw\openclaw.json" | ConvertFrom-Json
    return $config.agents.list[0].model.primary
}

function Get-Fallbacks {
    $config = Get-Content "$env:USERPROFILE\.openclaw\openclaw.json" | ConvertFrom-Json
    $fallbacks = $config.agents.list[0].model.fallbacks
    if ($null -eq $fallbacks) {
        return @()
    }
    return @($fallbacks)
}

function Test-ModelResponsive {
    param([string]$Model)
    
    Write-Log "测试模型: $Model"
    
    # 简单测试：用模型做一次简单推理
    $testPrompt = "Hi"
    $timeout = 15  # 秒
    
    try {
        $result = openclaw chat --model $Model --think false -- "$testPrompt" 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Log "模型 $Model 响应正常" "INFO"
            return $true
        } else {
            Write-Log "模型 $Model 无响应 (exit: $exitCode)" "WARN"
            return $false
        }
    }
    catch {
        Write-Log "模型 $Model 测试失败: $_" "WARN"
        return $false
    }
}

function Update-ModelConfig {
    param([string]$NewModel)
    
    Write-Log "更新配置为: $NewModel"
    
    if ($DryRun) {
        Write-Log "[DryRun] 跳过实际配置更新" "INFO"
        return $true
    }
    
    try {
        openclaw config set agents.defaults.model $NewModel 2>&1 | Out-Null
        openclaw config set agents.list[0].model.primary $NewModel 2>&1 | Out-Null
        openclaw gateway restart 2>&1 | Out-Null
        Write-Log "配置已更新并重启 Gateway" "INFO"
        return $true
    }
    catch {
        Write-Log "配置更新失败: $_" "ERROR"
        return $false
    }
}

function Set-ModelBackup {
    param([string]$Model, [string]$Action)
    
    $backup = Get-Content $BackupFile | ConvertFrom-Json
    
    if ($Action -eq "record_switch") {
        $backup.lastSwitchAt = (Get-Date -Format "o")
        $backup.switchHistory += @{
            at = (Get-Date -Format "o")
            from = $backup.originalModel
            to = $Model
        }
    }
    
    $backup.lastHealthCheck = (Get-Date -Format "o")
    
    $backup | ConvertTo-Json -Depth 10 | Set-Content $BackupFile -Encoding UTF8
}

# ========== 主逻辑 ==========

Write-Log "========== 模型健康检查开始 ==========" "INFO"

$currentModel = Get-CurrentModel
$fallbacks = Get-Fallbacks

Write-Log "当前模型: $currentModel" "INFO"
Write-Log "备选模型: $($fallbacks -join ', ')" "INFO"

# 检查当前模型是否可用
$currentResponsive = Test-ModelResponsive -Model $currentModel

if ($currentResponsive) {
    Write-Log "当前模型 $currentModel 可用，无需切换" "INFO"
    Set-ModelBackup -Model $currentModel -Action "healthy"
    exit 0
}

# 当前模型不可用，尝试切换
Write-Log "当前模型 $currentModel 不可用，开始切换..." "WARN"

if ($ForceSwitch) {
    Write-Log "强制切换模式，跳过测试直接切换" "INFO"
    if ($fallbacks.Count -gt 0) {
        $newModel = $fallbacks[0]
        Update-ModelConfig -NewModel $newModel
        Set-ModelBackup -Model $newModel -Action "record_switch"
    } else {
        Write-Log "没有可用的备选模型" "ERROR"
        exit 1
    }
} else {
    # 尝试每个备选模型
    $switched = $false
    foreach ($model in $fallbacks) {
        Write-Log "尝试备选模型: $model" "INFO"
        if (Test-ModelResponsive -Model $model) {
            Write-Log "备选模型 $model 可用，执行切换" "INFO"
            Update-ModelConfig -NewModel $model
            Set-ModelBackup -Model $model -Action "record_switch"
            $switched = $true
            break
        }
    }
    
    if (-not $switched) {
        Write-Log "所有模型都不可用，无法切换" "ERROR"
        Set-ModelBackup -Model $null -Action "all_failed"
        exit 1
    }
}

Write-Log "========== 模型健康检查完成 ==========" "INFO"
exit 0
