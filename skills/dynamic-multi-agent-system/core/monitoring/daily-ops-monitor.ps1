# Daily Ops Monitor - Simplified English Version

$script:opsReportDir = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\reports"
if (!(Test-Path $opsReportDir)) { New-Item -ItemType Directory -Force -Path $opsReportDir | Out-Null }

function Get-SystemHealth {
    $health = @{timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; score = 100; issues = @()}
    
    $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
    if ($cpu -gt 80) { $health.issues += "High CPU: $cpu%"; $health.score -= 20 }
    
    $os = Get-CimInstance Win32_OperatingSystem
    $ram = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 2)
    if ($ram -gt 80) { $health.issues += "High RAM: $ram%"; $health.score -= 20 }
    
    $cDisk = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
    $cUsage = [math]::Round((($cDisk.Size - $cDisk.FreeSpace) / $cDisk.Size) * 100, 2)
    if ($cUsage -gt 90) { $health.issues += "Low C: $cUsage%"; $health.score -= 30 }
    
    try { openclaw status -ErrorAction Stop | Out-Null; $health.gateway = "Running" }
    catch { $health.issues += "Gateway Stopped"; $health.score -= 30; $health.gateway = "Stopped" }
    
    $health.status = if ($health.score -ge 80) { "OK" } elseif ($health.score -ge 60) { "Warning" } else { "Critical" }
    return $health
}

function Get-SkillHubStatus {
    return @{
        submitted = "2026-04-06 11:35"
        version = "v1.2.0"
        stage = "Under Review"
        estimated = "2026-04-10 ~ 04-11"
    }
}

function Get-TaskList {
    return @{
        p0 = @(@{name = "SkillHub Review Tracking"; status = "In Progress"; due = "2026-04-10"})
        p1 = @(@{name = "Browser Control Config"; status = "Pending"; due = "2026-04-07"}, @{name = "API Multi-Model Config"; status = "Pending"; due = "2026-04-07"})
        p2 = @(@{name = "User Review Guide"; status = "Pending"; due = "2026-04-11"})
    }
}

function Show-OpsStatus {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Daily Operations Monitor" -ForegroundColor Cyan
    Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    $h = Get-SystemHealth
    Write-Host "[SYSTEM HEALTH]" -ForegroundColor Yellow
    $c = if ($h.status -eq "OK") { "Green" } elseif ($h.status -eq "Warning") { "Yellow" } else { "Red" }
    Write-Host "  Status: $($h.status) (Score: $($h.score)/100) " -NoNewline -ForegroundColor $c
    Write-Host "| Gateway: $($h.gateway)"
    if ($h.issues.Count -gt 0) { foreach ($i in $h.issues) { Write-Host "  ! $i" -ForegroundColor Red } }
    
    $s = Get-SkillHubStatus
    Write-Host "`n[SKILLHUB REVIEW]" -ForegroundColor Yellow
    Write-Host "  Version: $($s.version) | Submitted: $($s.submitted)"
    Write-Host "  Stage: $($s.stage) | Estimated: $($s.estimated)" -ForegroundColor Cyan
    
    $t = Get-TaskList
    Write-Host "`n[TASKS]" -ForegroundColor Yellow
    Write-Host "  P0 ($($t.p0.Count)):" -ForegroundColor Red; foreach ($i in $t.p0) { Write-Host "    - $($i.name) ($($i.status))" }
    Write-Host "  P1 ($($t.p1.Count)):" -ForegroundColor Yellow; foreach ($i in $t.p1) { Write-Host "    - $($i.name) ($($i.status))" }
    Write-Host "  P2 ($($t.p2.Count)):" -ForegroundColor Cyan; foreach ($i in $t.p2) { Write-Host "    - $($i.name) ($($i.status))" }
    
    Write-Host "`n========================================`n" -ForegroundColor Cyan
}

function Save-OpsReport {
    $date = Get-Date -Format "yyyy-MM-dd"
    $report = @{
        date = $date
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        system = Get-SystemHealth
        skillhub = Get-SkillHubStatus
        tasks = Get-TaskList
    }
    $path = Join-Path $opsReportDir "ops-report-$date.json"
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $path -Encoding utf8
    Write-Host "OK: Report saved to $path" -ForegroundColor Green
}

function Start-DailyCheck {
    Write-Host "`nRunning Daily Ops Check..." -ForegroundColor Cyan
    Show-OpsStatus
    Save-OpsReport
    Write-Host "Daily Check Complete`n" -ForegroundColor Green
}

function Test-Ops {
    Write-Host "=== Ops Monitor Test ===" -ForegroundColor Cyan
    Start-DailyCheck
    Write-Host "Test Complete" -ForegroundColor Green
}
