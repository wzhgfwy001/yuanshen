# Debug registry - find agents with non-empty trigger_keywords
$ErrorActionPreference = "Continue"

$path1 = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-registry\registry.json"
$json = Get-Content $path1 -Raw -Encoding UTF8 | ConvertFrom-Json

$agents = $json.agents

Write-Host "Total agents: $($agents.PSObject.Properties.Count)"

# Find agents with trigger_keywords
$matched = @()
foreach ($prop in $agents.PSObject.Properties) {
    $agent = $prop.Value
    if ($agent.trigger_keywords -and $agent.trigger_keywords.Count -gt 0) {
        $name = if ($agent.name_zh) { $agent.name_zh } else { $agent.name }
        $keywords = $agent.trigger_keywords -join ", "
        $matched += [PSCustomObject]@{
            id = $prop.Name
            name = $name
            keywords = $keywords
        }
    }
}

Write-Host "`nAgents with trigger_keywords: $($matched.Count)"
Write-Host "`nFirst 10 matched:"
$matched | Select-Object -First 10 | ForEach-Object {
    Write-Host "  [$($_.id)] $($_.name) | keywords: $($_.keywords)"
}

# Test keyword matching for "歌曲"
Write-Host "`n`nTest matching for '生成一首关于春天的歌曲':"
$taskLower = "生成一首关于春天的歌曲"

$matched | Where-Object { $_.keywords -like "*歌曲*" -or $_.keywords -like "*生成*" } | Select-Object -First 10 | ForEach-Object {
    Write-Host "  Match: [$($_.id)] $($_.name)"
}