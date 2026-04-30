$ErrorActionPreference = "Continue"
$logFile = "C:\Users\DELL\.openclaw\workspace\scripts\install-result.txt"
$skills = @("web-automation", "google-workspace-integration", "web-automation-suite")

function Write-Log {
    param($message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

function Test-IsRateLimitError {
    param($outputString)
    return ($outputString -match "429" -or $outputString -match "rate.*limit" -or $outputString -match "Too Many Requests")
}

function Test-IsAlreadyInstalled {
    param($outputString)
    return ($outputString -match "already exists" -or $outputString -match "already installed")
}

foreach ($skill in $skills) {
    $success = $false
    $attempts = 0
    $maxAttempts = 3

    while (-not $success -and $attempts -lt $maxAttempts) {
        $attempts++
        Write-Log "Attempting to install skill: $skill (attempt $attempts of $maxAttempts)"

        try {
            $output = npx openclaw skills install $skill 2>&1
            $exitCode = $LASTEXITCODE
            $outputString = $output | Out-String

            Write-Log "Output: $outputString"

            if ($exitCode -eq 0) {
                Write-Log "[$skill] SUCCESS"
                $success = $true
            } elseif (Test-IsAlreadyInstalled $outputString) {
                Write-Log "[$skill] SUCCESS (already installed)"
                $success = $true
            } elseif (Test-IsRateLimitError $outputString) {
                if ($attempts -lt $maxAttempts) {
                    Write-Log "Rate limit detected (429). Waiting 5 minutes before retry..."
                    Start-Sleep -Seconds 300
                } else {
                    Write-Log "[$skill] FAILED after 3 attempts, moving on"
                }
            } else {
                if ($attempts -ge $maxAttempts) {
                    Write-Log "[$skill] FAILED after 3 attempts, moving on"
                }
            }
        } catch {
            Write-Log "Exception: $_"
            if ($attempts -ge $maxAttempts) {
                Write-Log "[$skill] FAILED after 3 attempts, moving on"
            }
        }
    }
}

Write-Log "=== ALL DONE ==="
