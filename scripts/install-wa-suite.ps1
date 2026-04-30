$logFile = 'C:\Users\DELL\.openclaw\workspace\scripts\install-wa-suite.txt'
$maxRetries = 20
$waitSeconds = 300

for ($i = 1; $i -le $maxRetries; $i++) {
    Write-Host "Attempt $i of $maxRetries..."
    $output = npx openclaw skills install web-automation-suite 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        $successMsg = "SUCCESS: web-automation-suite installed on attempt $i"
        Write-Host $successMsg
        Add-Content -Path $logFile -Value "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) - $successMsg"
        Add-Content -Path $logFile -Value "Output: $output"
        exit 0
    }
    
    $isRateLimit = $output -match 'HTTP 429|rate.limit|Rate limit|429'
    if ($isRateLimit) {
        $retryMsg = "Attempt $i failed with rate limit. Waiting $waitSeconds seconds..."
        Write-Host $retryMsg
        Add-Content -Path $logFile -Value "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) - $retryMsg"
        Add-Content -Path $logFile -Value "Output: $output"
        Start-Sleep -Seconds $waitSeconds
    } else {
        $failMsg = "FATAL: Attempt $i failed with non-429 error"
        Write-Host $failMsg
        Write-Host "Output: $output"
        Add-Content -Path $logFile -Value "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) - Attempt $i failed:"
        Add-Content -Path $logFile -Value "Output: $output"
        exit 1
    }
}

Write-Host "FATAL: Failed after 20 attempts"
Add-Content -Path $logFile -Value "$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) - FATAL: Failed after 20 attempts"
exit 1