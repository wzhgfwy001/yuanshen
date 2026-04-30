# Debug matchAgents in detail
$ErrorActionPreference = "Continue"

$path1 = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-registry\registry.json"
$json = Get-Content $path1 -Raw -Encoding UTF8 | ConvertFrom-Json

$agents = $json.agents
$taskLower = "生成一首关于春天的歌曲"

# Test keyword matching
$matched = @()
foreach ($prop in $agents.PSObject.Properties) {
    $agent = $prop.Value
    $keywords = $agent.trigger_keywords
    if ($keywords -and $keywords.Count -gt 0) {
        $score = 0
        foreach ($kw in $keywords) {
            if ($taskLower.Contains($kw)) {
                $score++
            }
        }
        if ($score -gt 0) {
            $matched += [PSCustomObject]@{
                id = $prop.Name
                name = $prop.Name  # Use ID since name is garbled
                score = $score
                matchedKw = ($keywords | Where-Object { $taskLower.Contains($_) } -Join ", ")
            }
        }
    }
}

Write-Host "Matched by keyword: $($matched.Count)"
$matched | Sort-Object -Property score -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  [$($_.score)] $($_.id) | matched: $($_.matchedKw)"
}

# Show all unique keywords in registry
$allKw = @{}
foreach ($prop in $agents.PSObject.Properties) {
    $agent = $prop.Value
    if ($agent.trigger_keywords) {
        foreach ($kw in $agent.trigger_keywords) {
            $allKw[$kw] = $true
        }
    }
}
$kwList = $allKw.Keys | Sort-Object
Write-Host "`nAll unique keywords (first 50):"
$kwList | Select-Object -First 50 | ForEach-Object { Write-Host "  $_" }