# MiniMax Token Plan Quota Monitor

$apiKey = "sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o"

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

try {
    $result = Invoke-RestMethod -Uri "https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains" -Headers $headers
    $alerts = @()
    
    foreach ($model in $result.model_remains) {
        $total = $model.current_interval_total_count
        $used = $model.current_interval_usage_count
        
        if ($total -gt 0) {
            $percent = [math]::Round(($used / $total) * 100, 1)
            
            if ($percent -ge 80) {
                $remaining = $total - $used
                $alerts += "[WARN] $($model.model_name): $used/$total ($percent%) - left:$remaining"
            }
        }
    }
    
    if ($alerts.Count -gt 0) {
        Write-Host "[ALERT] Token Plan Quota Warning"
        foreach ($a in $alerts) { Write-Host $a }
        exit 1
    } else {
        Write-Host "[OK] Token Plan Quota Sufficient"
        exit 0
    }
} catch {
    Write-Host "[ERROR] Query failed: $_"
    exit 2
}
