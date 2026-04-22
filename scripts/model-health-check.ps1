param(
    [switch]$ForceSwitch,
    [switch]$DryRun
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
    Write-Log "Testing model: $Model"
    $testPrompt = "Hi"
    $timeout = 15
    try {
        $result = openclaw chat --model $Model --think false -- "$testPrompt" 2>&1
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) {
            Write-Log "Model $Model is responsive" "INFO"
            return $true
        } else {
            Write-Log "Model $Model not responsive (exit: $exitCode)" "WARN"
            return $false
        }
    } catch {
        Write-Log "Model $Model test failed: $_" "WARN"
        return $false
    }
}

function Update-ModelConfig {
    param([string]$NewModel)
    Write-Log "Updating config to: $NewModel"
    if ($DryRun) {
        Write-Log "[DryRun] Skipping actual config update" "INFO"
        return $true
    }
    try {
        openclaw config set agents.defaults.model $NewModel 2>&1 | Out-Null
        openclaw config set agents.list[0].model.primary $NewModel 2>&1 | Out-Null
        openclaw gateway restart 2>&1 | Out-Null
        Write-Log "Config updated and Gateway restarted" "INFO"
        return $true
    } catch {
        Write-Log "Config update failed: $_" "ERROR"
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

Write-Log "========== Model Health Check Started ==========" "INFO"

$currentModel = Get-CurrentModel
$fallbacks = Get-Fallbacks

Write-Log "Current model: $currentModel" "INFO"
Write-Log "Fallback models: $($fallbacks -join ', ')" "INFO"

$currentResponsive = Test-ModelResponsive -Model $currentModel

if ($currentResponsive) {
    Write-Log "Current model $currentModel is available, no switch needed" "INFO"
    Set-ModelBackup -Model $currentModel -Action "healthy"
    exit 0
}

Write-Log "Current model $currentModel is unavailable, starting switch..." "WARN"

if ($ForceSwitch) {
    Write-Log "Force switch mode, skipping test" "INFO"
    if ($fallbacks.Count -gt 0) {
        $newModel = $fallbacks[0]
        Update-ModelConfig -NewModel $newModel
        Set-ModelBackup -Model $newModel -Action "record_switch"
    } else {
        Write-Log "No fallback models available" "ERROR"
        exit 1
    }
} else {
    $switched = $false
    foreach ($model in $fallbacks) {
        Write-Log "Trying fallback model: $model" "INFO"
        if (Test-ModelResponsive -Model $model) {
            Write-Log "Fallback model $model is available, switching" "INFO"
            Update-ModelConfig -NewModel $model
            Set-ModelBackup -Model $model -Action "record_switch"
            $switched = $true
            break
        }
    }
    if (-not $switched) {
        Write-Log "All models are unavailable, cannot switch" "ERROR"
        Set-ModelBackup -Model $null -Action "all_failed"
        exit 1
    }
}

Write-Log "========== Model Health Check Completed ==========" "INFO"
exit 0
