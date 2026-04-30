$proc = Start-Process -FilePath 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--remote-debugging-port=9222' -PassThru
Start-Sleep -Seconds 3
if (-not $proc.HasExited) {
    Write-Host "Edge started successfully with PID: $($proc.Id)"
} else {
    Write-Host "Edge exited immediately with code: $($proc.ExitCode)"
}