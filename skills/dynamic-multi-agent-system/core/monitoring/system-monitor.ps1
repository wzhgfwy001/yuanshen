# System Monitor - Simplified English Version

function Get-SystemStatus {
    $status = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        cpu = @{}
        memory = @{}
        disk = @()
        processes = @()
        recommendations = @()
    }
    
    # CPU
    $cpu = Get-CimInstance Win32_Processor
    $cpuLoad = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
    $status.cpu = @{
        model = $cpu[0].Name
        cores = $cpu[0].NumberOfCores
        load = [math]::Round($cpuLoad, 2)
    }
    
    # Memory
    $os = Get-CimInstance Win32_OperatingSystem
    $totalRam = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $freeRam = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedRam = $totalRam - $freeRam
    $ramUsage = [math]::Round(($usedRam / $totalRam) * 100, 2)
    $status.memory = @{
        total = $totalRam
        used = $usedRam
        free = $freeRam
        usage = $ramUsage
    }
    
    # Disk
    $disks = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    foreach ($disk in $disks) {
        $total = [math]::Round($disk.Size / 1GB, 2)
        $free = [math]::Round($disk.FreeSpace / 1GB, 2)
        $status.disk += @{
            drive = $disk.DeviceID
            total = $total
            free = $free
            usage = [math]::Round((($total - $free) / $total) * 100, 2)
        }
    }
    
    # Processes
    $status.processes = (Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 | ForEach-Object {
        @{name = $_.ProcessName; cpu = [math]::Round($_.CPU, 2); memory = [math]::Round($_.WorkingSet / 1MB, 2)}
    })
    
    # Recommendations
    if ($cpuLoad -gt 80) { $status.recommendations += "High CPU usage ($cpuLoad%) - Close unnecessary programs" }
    if ($ramUsage -gt 80) { $status.recommendations += "High memory usage ($ramUsage%) - Free up memory" }
    foreach ($d in $status.disk) { if ($d.usage -gt 90) { $status.recommendations += "Low disk space on $($d.drive) ($($d.usage)%) - Clean up" } }
    
    return $status
}

function Show-SystemStatus {
    $s = Get-SystemStatus
    Write-Host "`n=== System Monitor ===" -ForegroundColor Cyan
    Write-Host "Time: $($s.timestamp)"
    Write-Host "`nCPU: $($s.cpu.model)"
    Write-Host "  Cores: $($s.cpu.cores) | Load: $($s.cpu.load)%" -ForegroundColor $(if ($s.cpu.load -gt 80) {"Red"} elseif ($s.cpu.load -gt 50) {"Yellow"} else {"Green"})
    Write-Host "`nMemory: $($s.memory.total)GB Total | $($s.memory.used)GB Used ($($s.memory.usage)%)" -ForegroundColor $(if ($s.memory.usage -gt 80) {"Red"} elseif ($s.memory.usage -gt 50) {"Yellow"} else {"Green"})
    Write-Host "`nDisk:"
    foreach ($d in $s.disk) { Write-Host "  $($d.drive): $($d.free)GB free of $($d.total)GB ($($d.usage)%)" -ForegroundColor $(if ($d.usage -gt 90) {"Red"} elseif ($d.usage -gt 80) {"Yellow"} else {"Green"}) }
    Write-Host "`nTop Processes:"
    for ($i = 0; $i -lt $s.processes.Count; $i++) { Write-Host "  $($i+1). $($s.processes[$i].name) - CPU: $($s.processes[$i].cpu)% Mem: $($s.processes[$i].memory)MB" }
    if ($s.recommendations.Count -gt 0) { Write-Host "`nRecommendations:" -ForegroundColor Yellow; foreach ($r in $s.recommendations) { Write-Host "  ! $r" -ForegroundColor Yellow } }
    else { Write-Host "`nSystem OK" -ForegroundColor Green }
    Write-Host "`n=====================`n" -ForegroundColor Cyan
}

function Save-SystemReport {
    param([string]$outputPath)
    Get-SystemStatus | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: Report saved to $outputPath" -ForegroundColor Green
}

function Test-Monitor {
    Write-Host "=== System Monitor Test ===" -ForegroundColor Cyan
    Show-SystemStatus
    Write-Host "Test Complete" -ForegroundColor Green
}
