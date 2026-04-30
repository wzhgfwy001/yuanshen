$log = "C:\Users\DELL\.openclaw\workspace\scripts\install-result2.txt"
$maxRetries = 10

function log {
    param($msg)
    "$msg (Attempt $(($script:attempt)))" | Out-File -FilePath $log -Append
}

# google-workspace-integration
$skill = "google-workspace-integration"
$script:attempt = 0
$success = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    $script:attempt = $i
    log "[SKILL] Installing $skill (attempt $i/$maxRetries)"
    $output = & npx openclaw skills install $skill 2>&1
    $exitCode = $LASTEXITCODE
    log "[SKILL] Exit code: $exitCode"
    if ($exitCode -eq 0) {
        log "[SKILL] SUCCESS: $skill"
        $success = $true
        break
    }
    log "[SKILL] Failed (429?), waiting 5 min..."
    Start-Sleep -Seconds 300
}

if (-not $success) {
    log "[SKILL] FAILED after $maxRetries attempts: $skill"
}

# web-automation-suite
$skill2 = "web-automation-suite"
$script:attempt = 0
$success2 = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    $script:attempt = $i
    log "[SKILL] Installing $skill2 (attempt $i/$maxRetries)"
    $output = & npx openclaw skills install $skill2 2>&1
    $exitCode = $LASTEXITCODE
    log "[SKILL] Exit code: $exitCode"
    if ($exitCode -eq 0) {
        log "[SKILL] SUCCESS: $skill2"
        $success2 = $true
        break
    }
    log "[SKILL] Failed (429?), waiting 5 min..."
    Start-Sleep -Seconds 300
}

if (-not $success2) {
    log "[SKILL] FAILED after $maxRetries attempts: $skill2"
}

"=== COMPLETE ===" | Out-File -FilePath $log -Append
