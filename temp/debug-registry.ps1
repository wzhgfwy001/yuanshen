# Debug registry path test
$ErrorActionPreference = "Continue"

Write-Host "Testing registry path..."

# Test 1: Direct path check
$path1 = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-registry\registry.json"
Write-Host "Path 1: $path1"
Write-Host "Exists: $(Test-Path $path1)"

# Test 2: Load and parse
$json = Get-Content $path1 -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "Agents count: $($json.agents.PSObject.Properties.Count)"

# Test 3: Show first 3 agent names and keywords
$agents = $json.agents
$counter = 0
foreach ($prop in $agents.PSObject.Properties | Select-Object -First 6) {
    $agent = $prop.Value
    $name = if ($agent.name_zh) { $agent.name_zh } else { $agent.name }
    $keywords = if ($agent.trigger_keywords) { $agent.trigger_keywords -join ", " } else { "none" }
    Write-Host "  [$($prop.Name)] $name | keywords: $keywords"
    $counter++
}

Write-Host "`nTest complete!"