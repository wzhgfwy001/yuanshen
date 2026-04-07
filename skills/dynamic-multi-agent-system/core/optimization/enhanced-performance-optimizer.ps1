# Enhanced Performance Optimizer v1.3
# Cache mechanism + intelligent trimming

$script:cacheDir = Join-Path $PSScriptRoot "..\..\state\cache"
$script:resultCacheFile = Join-Path $script:cacheDir "result-cache.json"
$script:perfStatsFile = Join-Path $script:cacheDir "perf-stats.json"
$script:cacheEnabled = $true
$script:trimEnabled = $true
$script:compressionEnabled = $true

$script:PerfConfig = @{
    cache = @{ maxEntries = 500; defaultTTL = 3600; lruEvictPercent = 0.2; persistInterval = 60 }
    trim = @{ enabled = $true; maxContextLength = 8000; maxOutputLength = 5000; minContextPreserve = 2000; trimRatio = 0.3; aggressiveMode = $false }
    compression = @{ enabled = $true; thresholdBytes = 5000; method = "gzip" }
    stats = @{ trackHitRate = $true; trackLatency = $true; trackTokens = $true; historySize = 1000 }
}

function Init-ResultCache {
    if (!(Test-Path $script:cacheDir)) { New-Item -ItemType Directory -Force -Path $script:cacheDir | Out-Null }
    if (!(Test-Path $script:resultCacheFile)) {
        @{ entries = @(); stats = @{ hits = 0; misses = 0; lastCleanup = (Get-Date -Format "o") } } | ConvertTo-Json | Out-File -FilePath $script:resultCacheFile -Encoding utf8
    }
}

function Get-ResultCache {
    param([string]$key)
    if (-not $script:cacheEnabled) { return $null }
    Init-ResultCache
    $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json
    $entry = $cache.entries | Where-Object { $_.key -eq $key }
    if (-not $entry) { Update-CacheStats -miss; return $null }
    $createdAt = [DateTime]::Parse($entry.createdAt)
    $ttl = if ($entry.ttl) { $entry.ttl } else { $script:PerfConfig.cache.defaultTTL }
    if ((Get-Date) -gt $createdAt.AddSeconds($ttl)) { Remove-CacheEntry -key $key; Update-CacheStats -miss; return $null }
    Update-CacheStats -hit
    return $entry.value
}

function Set-ResultCache {
    param([string]$key, [object]$value, [int]$ttl = 0)
    if (-not $script:cacheEnabled) { return }
    Init-ResultCache
    $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json
    $existingIndex = -1
    for ($i = 0; $i -lt $cache.entries.Count; $i++) { if ($cache.entries[$i].key -eq $key) { $existingIndex = $i; break } }
    $newEntry = @{ key = $key; value = $value; createdAt = (Get-Date -Format "o"); ttl = $ttl; hits = if ($existingIndex -ge 0) { $cache.entries[$existingIndex].hits + 1 } else { 0 }; size = ($value | ConvertTo-Json -Depth 5 -Compress).Length }
    if ($existingIndex -ge 0) { $cache.entries[$existingIndex] = $newEntry } else {
        $cache.entries += $newEntry
        if ($cache.entries.Count -gt $script:PerfConfig.cache.maxEntries) { Evict-CacheLRU; $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json }
    }
    $cache | ConvertTo-Json | Out-File -FilePath $script:resultCacheFile -Encoding utf8
}

function Remove-CacheEntry {
    param([string]$key)
    Init-ResultCache
    $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json
    $cache.entries = @($cache.entries | Where-Object { $_.key -ne $key })
    $cache | ConvertTo-Json | Out-File -FilePath $script:resultCacheFile -Encoding utf8
}

function Evict-CacheLRU {
    Init-ResultCache
    $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json
    $evictCount = [int]($cache.entries.Count * $script:PerfConfig.cache.lruEvictPercent)
    $cache.entries = @($cache.entries | Sort-Object { [DateTime]::Parse($_.createdAt) } -Descending | Select-Object -Skip $evictCount)
    $cache.stats.lastCleanup = (Get-Date -Format "o")
    $cache | ConvertTo-Json | Out-File -FilePath $script:resultCacheFile -Encoding utf8
    Write-Host "Cache evicted $evictCount old entries" -ForegroundColor Yellow
}

function Update-CacheStats {
    param([switch]$hit, [switch]$miss)
    Init-ResultCache
    $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json
    if ($hit) { $cache.stats.hits++ }
    if ($miss) { $cache.stats.misses++ }
    $cache | ConvertTo-Json | Out-File -FilePath $script:resultCacheFile -Encoding utf8
}

function Invoke-IntelligentTrim {
    param([Parameter(Mandatory=$true)][string]$text, [Parameter(Mandatory=$false)][int]$maxLength = 0, [Parameter(Mandatory=$false)][string]$mode = "auto")
    if (-not $script:trimEnabled) { return $text }
    if ($maxLength -eq 0) { $maxLength = $script:PerfConfig.trim.maxContextLength }
    if ($text.Length -le $maxLength) { return $text }
    switch ($mode) {
        "aggressive" { return Trim-Aggressive -text $text -maxLength $maxLength }
        "preserve" { return Trim-PreserveStructure -text $text -maxLength $maxLength }
        "auto" { if ($text -match "^```|^#|^1\.|^\|") { return Trim-PreserveStructure -text $text -maxLength $maxLength } else { return Trim-Smart -text $text -maxLength $maxLength } }
    }
}

function Trim-Smart {
    param([string]$text, [int]$maxLength)
    $trimRatio = $script:PerfConfig.trim.trimRatio
    $targetLength = [int]($maxLength * (1 - $trimRatio))
    if ($text.Length -le $targetLength) { return $text.Substring(0, [Math]::Min($text.Length, $maxLength)) }
    $sentences = [regex]::Split($text, '(?<=[.!?。！？])\s+')
    $result = [System.Text.StringBuilder]::new()
    foreach ($sentence in $sentences) { if (($result.Length + $sentence.Length) -lt $targetLength) { $result.Append($sentence) | Out-Null } else { break } }
    $trimmed = $result.ToString()
    if ($trimmed.Length -lt $text.Length) { $trimmed += "`n`n... [Truncated, original length: $($text.Length) chars]" }
    return $trimmed
}

function Trim-Aggressive {
    param([string]$text, [int]$maxLength)
    $trimmed = $text.Substring(0, [Math]::Min($text.Length, $maxLength))
    if ($trimmed.Length -lt $text.Length) { $trimmed += "... [Truncated]" }
    return $trimmed
}

function Trim-PreserveStructure {
    param([string]$text, [int]$maxLength)
    if ($text.Length -le $maxLength) { return $text }
    $result = ""; $remaining = $maxLength
    $codePattern = '```[\s\S]*?```'
    $matches = [regex]::Matches($text, $codePattern)
    foreach ($match in $matches) { if ($match.Index -lt $maxLength) { $result += $match.Value + "`n"; $remaining -= ($match.Value.Length + 1) } }
    if ($remaining -gt 0) {
        $plainText = $text -replace '```[\s\S]*?```', ''
        $result += $plainText.Substring(0, [Math]::Min($plainText.Length, $remaining))
    }
    if ($result.Length -lt $text.Length) { $result += "`n`n... [Content truncated, code blocks preserved]" }
    return $result
}

function Compress-Result {
    param([string]$text)
    if (-not $script:compressionEnabled) { return $text }
    if ($text.Length -lt $script:PerfConfig.compression.thresholdBytes) { return $text }
    try { $bytes = [System.Text.Encoding]::UTF8.GetBytes($text); $compressed = [System.IO.Compression.GZip]::Compress($bytes); return [Convert]::ToBase64String($compressed) } catch { return $text }
}

function Decompress-Result {
    param([string]$data)
    try { $bytes = [Convert]::FromBase64String($data); $decompressed = [System.IO.Compression.GZip]::Decompress($bytes); return [System.Text.Encoding]::UTF8.GetString($decompressed) } catch { return $data }
}

function Get-PerfStats {
    Init-ResultCache
    $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json
    $total = $cache.stats.hits + $cache.stats.misses
    $hitRate = if ($total -gt 0) { [math]::Round($cache.stats.hits / $total * 100, 1) } else { 0 }
    return @{ cacheEnabled = $script:cacheEnabled; trimEnabled = $script:trimEnabled; compressionEnabled = $script:compressionEnabled; cache = @{ entries = $cache.entries.Count; maxEntries = $script:PerfConfig.cache.maxEntries; hits = $cache.stats.hits; misses = $cache.stats.misses; hitRate = "$hitRate%"; totalRequests = $total }; trim = @{ maxContextLength = $script:PerfConfig.trim.maxContextLength; maxOutputLength = $script:PerfConfig.trim.maxOutputLength; mode = $script:PerfConfig.trim.trimRatio } }
}

function Show-PerfStats {
    $stats = Get-PerfStats
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Performance Optimizer Stats v1.3" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[Cache]" -ForegroundColor Yellow
    Write-Host "  Status: $(if($stats.cacheEnabled){'Enabled'}else{'Disabled'})" -ForegroundColor White
    Write-Host "  Entries: $($stats.cache.entries)/$($stats.cache.maxEntries)" -ForegroundColor White
    Write-Host "  Hit Rate: $($stats.cache.hitRate) (hit: $($stats.cache.hits), miss: $($stats.cache.misses))" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[Trim]" -ForegroundColor Yellow
    Write-Host "  Status: $(if($stats.trimEnabled){'Enabled'}else{'Disabled'})" -ForegroundColor White
    Write-Host "  Max Context: $($stats.trim.maxContextLength) chars" -ForegroundColor White
    Write-Host "  Trim Ratio: $($stats.trim.mode)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[Compression]" -ForegroundColor Yellow
    Write-Host "  Status: $(if($stats.compressionEnabled){'Enabled'}else{'Disabled'})" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Clear-PerfCache {
    Init-ResultCache
    $cache = Get-Content $script:resultCacheFile -Raw | ConvertFrom-Json
    $cache.entries = @()
    $cache.stats = @{ hits = 0; misses = 0; lastCleanup = (Get-Date -Format "o") }
    $cache | ConvertTo-Json | Out-File -FilePath $script:resultCacheFile -Encoding utf8
    Write-Host "Performance cache cleared" -ForegroundColor Green
}

function Optimize-CacheConfig {
    param([int]$maxEntries = 0, [int]$ttl = 0, [int]$maxContextLength = 0)
    if ($maxEntries -gt 0) { $script:PerfConfig.cache.maxEntries = $maxEntries; Write-Host "Updated: maxEntries = $maxEntries" -ForegroundColor Green }
    if ($ttl -gt 0) { $script:PerfConfig.cache.defaultTTL = $ttl; Write-Host "Updated: defaultTTL = $ttl" -ForegroundColor Green }
    if ($maxContextLength -gt 0) { $script:PerfConfig.trim.maxContextLength = $maxContextLength; Write-Host "Updated: maxContextLength = $maxContextLength" -ForegroundColor Green }
}

function Invoke-CachedExecution {
    param([Parameter(Mandatory=$true)][string]$cacheKey, [Parameter(Mandatory=$false)][int]$ttl = 0, [Parameter(Mandatory=$false)][scriptblock]$executeScript)
    $cached = Get-ResultCache -key $cacheKey
    if ($null -ne $cached) { return @{ fromCache = $true; value = $cached } }
    if ($executeScript) {
        $result = & $executeScript
        Set-ResultCache -key $cacheKey -value $result -ttl $ttl
        return @{ fromCache = $false; value = $result }
    }
    return @{ fromCache = $false; value = $null }
}

function Test-PerformanceOptimizer {
    Write-Host "=== Enhanced Performance Optimizer Tests ===" -ForegroundColor Cyan
    Init-ResultCache
    Clear-PerfCache
    Write-Host ""
    Write-Host "[Test 1] Result Cache Set/Get" -ForegroundColor Yellow
    Set-ResultCache -key "test1" -value "hello world"
    $val = Get-ResultCache -key "test1"
    if ($val -eq "hello world") { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    Write-Host ""
    Write-Host "[Test 2] Cache Hit Rate" -ForegroundColor Yellow
    $stats = Get-PerfStats
    Write-Host "Hits: $($stats.cache.hits), Misses: $($stats.cache.misses)" -ForegroundColor Green
    Write-Host ""
    Write-Host "[Test 3] Intelligent Trim - Smart Mode" -ForegroundColor Yellow
    $longText = "This is sentence one. This is sentence two. This is sentence three. " * 50
    $trimmed = Invoke-IntelligentTrim -text $longText -maxLength 500 -mode "auto"
    if ($trimmed.Length -lt $longText.Length) { Write-Host "PASS (Original: $($longText.Length), Trimmed: $($trimmed.Length))" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    Write-Host ""
    Write-Host "[Test 4] Cached Execution" -ForegroundColor Yellow
    $result1 = Invoke-CachedExecution -cacheKey "exec1" -ttl 60 -executeScript { return "computed value" }
    $result2 = Invoke-CachedExecution -cacheKey "exec1" -ttl 60
    if ($result1.fromCache -eq $false -and $result2.fromCache -eq $true -and $result2.value -eq "computed value") { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    Write-Host ""
    Write-Host "[Test 5] Stats Display" -ForegroundColor Yellow
    Show-PerfStats
    Write-Host ""
    Write-Host "[Test 6] Clear Cache" -ForegroundColor Yellow
    Clear-PerfCache
    $stats = Get-PerfStats
    if ($stats.cache.entries -eq 0) { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    Write-Host ""
    Write-Host "=== All Tests Complete ===" -ForegroundColor Green
}

Init-ResultCache

if ($MyInvocation.InvocationName -ne ".") {
    Test-PerformanceOptimizer
}
