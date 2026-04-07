# Multi-Level Cache Manager v1.3
# L1 Memory / L2 Disk / L3 Semantic three-level cache

$script:cacheBaseDir = Join-Path $PSScriptRoot "..\..\state\cache"
$script:l1Cache = @{}
$script:l2CacheDir = $null
$script:l3CacheDir = $null
$script:cacheStats = @{ l1Hits = 0; l2Hits = 0; l3Hits = 0; misses = 0; totalRequests = 0; startTime = Get-Date }

$script:CacheConfig = @{
    l1 = @{ enabled = $true; maxEntries = 500; defaultTTL = 300; evictionPolicy = "LRU" }
    l2 = @{ enabled = $true; maxEntries = 5000; defaultTTL = 3600; compression = $true; evictionPolicy = "LRU" }
    l3 = @{ enabled = $true; maxEntries = 2000; defaultTTL = 86400; similarityThreshold = 0.85; embeddingModel = "local" }
    global = @{ persistOnUpdate = $true; asyncWrite = $true; statsInterval = 100 }
}

function Initialize-MultiLevelCache {
    param([string]$baseDir = "", [switch]$clearExisting)
    if ($baseDir) { $script:cacheBaseDir = $baseDir }
    $script:l2CacheDir = Join-Path $script:cacheBaseDir "l2-disk"
    $script:l3CacheDir = Join-Path $script:cacheBaseDir "l3-semantic"
    if (!(Test-Path $script:cacheBaseDir)) { New-Item -ItemType Directory -Force -Path $script:cacheBaseDir | Out-Null }
    if (!(Test-Path $script:l2CacheDir)) { New-Item -ItemType Directory -Force -Path $script:l2CacheDir | Out-Null }
    if (!(Test-Path $script:l3CacheDir)) { New-Item -ItemType Directory -Force -Path $script:l3CacheDir | Out-Null }
    if (-not $clearExisting) { Load-L2FromDisk; Load-L3FromDisk }
    $script:cacheStats = @{ l1Hits = 0; l2Hits = 0; l3Hits = 0; misses = 0; totalRequests = 0; startTime = Get-Date }
    Write-Host "OK: Multi-level cache initialized" -ForegroundColor Green
    Write-Host "    L1 (Memory): $($script:CacheConfig.l1.maxEntries) entries max" -ForegroundColor Cyan
    Write-Host "    L2 (Disk): $($script:CacheConfig.l2.maxEntries) entries max" -ForegroundColor Cyan
    Write-Host "    L3 (Semantic): $($script:CacheConfig.l3.maxEntries) entries max" -ForegroundColor Cyan
}

function Get-L1 {
    param([string]$key)
    if (-not $script:CacheConfig.l1.enabled) { return $null }
    $entry = $script:l1Cache[$key]
    if (-not $entry) { return $null }
    if ($entry.expiresAt -and (Get-Date) -gt $entry.expiresAt) { Remove-L1Entry -key $key; return $null }
    $entry.lastAccess = Get-Date
    return $entry.value
}

function Set-L1 {
    param([string]$key, [object]$value, [int]$ttl = 0)
    if (-not $script:CacheConfig.l1.enabled) { return }
    $actualTTL = if ($ttl -gt 0) { $ttl } else { $script:CacheConfig.l1.defaultTTL }
    $expiresAt = (Get-Date).AddSeconds($actualTTL)
    if ($script:l1Cache.Count -ge $script:CacheConfig.l1.maxEntries) { Evict-L1LRU }
    $script:l1Cache[$key] = @{ key = $key; value = $value; createdAt = Get-Date; lastAccess = Get-Date; expiresAt = $expiresAt; ttl = $ttl }
}

function Remove-L1Entry { param([string]$key); $script:l1Cache.Remove($key) | Out-Null }

function Evict-L1LRU {
    $oldest = $null; $oldestKey = $null
    foreach ($key in $script:l1Cache.Keys) {
        $entry = $script:l1Cache[$key]
        if (-not $oldest -or $entry.lastAccess -lt $oldest) { $oldest = $entry.lastAccess; $oldestKey = $key }
    }
    if ($oldestKey) { Remove-L1Entry -key $oldestKey }
}

function Get-L1Stats { return @{ count = $script:l1Cache.Count; max = $script:CacheConfig.l1.maxEntries; usage = [math]::Round($script:l1Cache.Count / $script:CacheConfig.l1.maxEntries * 100, 1) } }

function Get-L2 {
    param([string]$key)
    if (-not $script:CacheConfig.l2.enabled) { return $null }
    $hashKey = Get-StringHash -input $key
    $filePath = Join-Path $script:l2CacheDir "$hashKey.json"
    if (-not (Test-Path $filePath)) { return $null }
    try {
        $entry = Get-Content $filePath -Raw | ConvertFrom-Json
        $expiresAt = [DateTime]::Parse($entry.expiresAt)
        if ((Get-Date) -gt $expiresAt) { Remove-Item $filePath -Force -ErrorAction SilentlyContinue; return $null }
        return $entry.value
    } catch { return $null }
}

function Set-L2 {
    param([string]$key, [object]$value, [int]$ttl = 0)
    if (-not $script:CacheConfig.l2.enabled) { return }
    $hashKey = Get-StringHash -input $key
    $filePath = Join-Path $script:l2CacheDir "$hashKey.json"
    $actualTTL = if ($ttl -gt 0) { $ttl } else { $script:CacheConfig.l2.defaultTTL }
    $expiresAt = (Get-Date).AddSeconds($actualTTL)
    $entry = @{ originalKey = $key; value = $value; createdAt = (Get-Date).ToString("o"); expiresAt = $expiresAt.ToString("o"); ttl = $ttl; compressed = $false; size = ($value | ConvertTo-Json -Depth 10).Length }
    $entry | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    $l2Count = (Get-ChildItem $script:l2CacheDir -File).Count
    if ($l2Count -ge $script:CacheConfig.l2.maxEntries) { Evict-L2LRU }
}

function Load-L2FromDisk {
    if (-not (Test-Path $script:l2CacheDir)) { return }
    $files = Get-ChildItem $script:l2CacheDir -File -Filter "*.json"
    $now = Get-Date
    foreach ($file in $files) {
        try {
            $entry = Get-Content $file.FullName -Raw | ConvertFrom-Json
            $expiresAt = [DateTime]::Parse($entry.expiresAt)
            if ($now -gt $expiresAt) { Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue }
        } catch { Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue }
    }
}

function Evict-L2LRU {
    $files = Get-ChildItem $script:l2CacheDir -File | Sort-Object LastWriteTime
    $toDelete = $files | Select-Object -First ([int]($files.Count * 0.2))
    foreach ($file in $toDelete) { Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue }
}

function Get-L2Stats {
    $files = Get-ChildItem $script:l2CacheDir -File -ErrorAction SilentlyContinue
    $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
    return @{ count = $files.Count; max = $script:CacheConfig.l2.maxEntries; usage = [math]::Round($files.Count / $script:CacheConfig.l2.maxEntries * 100, 1); totalSizeMB = [math]::Round($totalSize / 1MB, 2) }
}

function Get-L3 {
    param([string]$query, [double]$minSimilarity = 0)
    if (-not $script:CacheConfig.l3.enabled) { return $null }
    if ($minSimilarity -eq 0) { $minSimilarity = $script:CacheConfig.l3.similarityThreshold }
    $queryHash = Get-StringHash -input $query
    $exactFile = Join-Path $script:l3CacheDir "$queryHash.json"
    if (Test-Path $exactFile) {
        try { $entry = Get-Content $exactFile -Raw | ConvertFrom-Json; return @{ value = $entry.value; similarity = 1.0; matchedBy = "exact" } } catch { }
    }
    $bestMatch = $null; $bestSimilarity = 0
    $files = Get-ChildItem $script:l3CacheDir -File -Filter "*.json"
    foreach ($file in $files) {
        if ($file.Name -eq "$queryHash.json") { continue }
        try {
            $entry = Get-Content $file.FullName -Raw | ConvertFrom-Json
            $expiresAt = [DateTime]::Parse($entry.expiresAt)
            if ((Get-Date) -gt $expiresAt) { Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue; continue }
            $similarity = Calculate-StringSimilarity -str1 $query -str2 $entry.query
            if ($similarity -gt $bestSimilarity -and $similarity -ge $minSimilarity) { $bestSimilarity = $similarity; $bestMatch = $entry }
        } catch { }
    }
    if ($bestMatch) { return @{ value = $bestMatch.value; similarity = $bestSimilarity; matchedBy = "semantic"; originalQuery = $bestMatch.query } }
    return $null
}

function Set-L3 {
    param([string]$query, [object]$value, [int]$ttl = 0)
    if (-not $script:CacheConfig.l3.enabled) { return }
    $queryHash = Get-StringHash -input $query
    $filePath = Join-Path $script:l3CacheDir "$queryHash.json"
    $actualTTL = if ($ttl -gt 0) { $ttl } else { $script:CacheConfig.l3.defaultTTL }
    $expiresAt = (Get-Date).AddSeconds($actualTTL)
    $entry = @{ query = $query; queryHash = $queryHash; value = $value; createdAt = (Get-Date).ToString("o"); expiresAt = $expiresAt.ToString("o"); ttl = $ttl; similarity = 1.0 }
    $entry | ConvertTo-Json -Depth 10 | Out-File -FilePath $filePath -Encoding utf8
    $l3Count = (Get-ChildItem $script:l3CacheDir -File).Count
    if ($l3Count -ge $script:CacheConfig.l3.maxEntries) { Evict-L3LRU }
}

function Evict-L3LRU {
    $files = Get-ChildItem $script:l3CacheDir -File | Sort-Object LastWriteTime
    $toDelete = $files | Select-Object -First ([int]($files.Count * 0.2))
    foreach ($file in $toDelete) { Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue }
}

function Load-L3FromDisk { Load-L2FromDisk }

function Get-L3Stats {
    $files = Get-ChildItem $script:l3CacheDir -File -ErrorAction SilentlyContinue
    return @{ count = $files.Count; max = $script:CacheConfig.l3.maxEntries; usage = [math]::Round($files.Count / $script:CacheConfig.l3.maxEntries * 100, 1); similarityThreshold = $script:CacheConfig.l3.similarityThreshold }
}

function Get-Cache {
    param([Parameter(Mandatory=$true)][string]$key, [Parameter(Mandatory=$false)][string]$level = "all")
    $script:cacheStats.totalRequests++
    if ($level -eq "all" -or $level -eq "l1") {
        $result = Get-L1 -key $key
        if ($null -ne $result) { $script:cacheStats.l1Hits++; return @{ value = $result; level = "L1"; source = "memory" } }
    }
    if ($level -eq "all" -or $level -eq "l2") {
        $result = Get-L2 -key $key
        if ($null -ne $result) { $script:cacheStats.l2Hits++; Set-L1 -key $key -value $result; return @{ value = $result; level = "L2"; source = "disk" } }
    }
    if ($level -eq "all" -or $level -eq "l3") {
        $result = Get-L3 -query $key
        if ($null -ne $result) { $script:cacheStats.l3Hits++; return @{ value = $result.value; level = "L3"; source = "semantic"; similarity = $result.similarity } }
    }
    $script:cacheStats.misses++; return $null
}

function Set-Cache {
    param([string]$key, [object]$value, [int]$ttl = 0, [string]$level = "all")
    if ($level -eq "all" -or $level -eq "l1") { Set-L1 -key $key -value $value -ttl $ttl }
    if ($level -eq "all" -or $level -eq "l2") { Set-L2 -key $key -value $value -ttl $ttl }
    if ($level -eq "all" -or $level -eq "l3") { Set-L3 -query $key -value $value -ttl $ttl }
}

function Remove-Cache {
    param([string]$key, [string]$level = "all")
    if ($level -eq "all" -or $level -eq "l1") { Remove-L1Entry -key $key }
    if ($level -eq "all" -or $level -eq "l2") { $hashKey = Get-StringHash -input $key; $fp = Join-Path $script:l2CacheDir "$hashKey.json"; if (Test-Path $fp) { Remove-Item $fp -Force } }
    if ($level -eq "all" -or $level -eq "l3") { $hashKey = Get-StringHash -input $key; $fp = Join-Path $script:l3CacheDir "$hashKey.json"; if (Test-Path $fp) { Remove-Item $fp -Force } }
}

function Clear-Cache {
    param([string]$level = "all")
    if ($level -eq "all" -or $level -eq "l1") { $script:l1Cache = @{}; Write-Host "L1 cache cleared" -ForegroundColor Green }
    if ($level -eq "all" -or $level -eq "l2") { Get-ChildItem $script:l2CacheDir -File | Remove-Item -Force; Write-Host "L2 cache cleared" -ForegroundColor Green }
    if ($level -eq "all" -or $level -eq "l3") { Get-ChildItem $script:l3CacheDir -File | Remove-Item -Force; Write-Host "L3 cache cleared" -ForegroundColor Green }
}

function Get-CacheStats {
    $total = $script:cacheStats.totalRequests
    $hits = $script:cacheStats.l1Hits + $script:cacheStats.l2Hits + $script:cacheStats.l3Hits
    $hitRate = if ($total -gt 0) { [math]::Round($hits / $total * 100, 1) } else { 0 }
    $uptime = (Get-Date) - $script:cacheStats.startTime
    return @{ totalRequests = $total; hits = $hits; misses = $script:cacheStats.misses; hitRate = "$hitRate%"; l1 = Get-L1Stats; l2 = Get-L2Stats; l3 = Get-L3Stats; breakdown = @{ l1Hits = $script:cacheStats.l1Hits; l2Hits = $script:cacheStats.l2Hits; l3Hits = $script:cacheStats.l3Hits }; uptime = "$([int]$uptime.TotalMinutes)m" }
}

function Show-CacheStats {
    $stats = Get-CacheStats
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Multi-Level Cache Stats" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[Overall]" -ForegroundColor Yellow
    Write-Host "  Total: $($stats.totalRequests) | Hits: $($stats.hits) | Misses: $($stats.misses)" -ForegroundColor White
    Write-Host "  Hit Rate: $($stats.hitRate) | Uptime: $($stats.uptime)" -ForegroundColor White
    Write-Host ""
    Write-Host "[L1 Memory Cache]" -ForegroundColor Yellow
    Write-Host "  Hits: $($stats.breakdown.l1Hits) | Usage: $($stats.l1.usage)%" -ForegroundColor Cyan
    Write-Host "  Entries: $($stats.l1.count)/$($stats.l1.max)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[L2 Disk Cache]" -ForegroundColor Yellow
    Write-Host "  Hits: $($stats.breakdown.l2Hits) | Usage: $($stats.l2.usage)%" -ForegroundColor Cyan
    Write-Host "  Entries: $($stats.l2.count)/$($stats.l2.max) | Size: $($stats.l2.totalSizeMB) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[L3 Semantic Cache]" -ForegroundColor Yellow
    Write-Host "  Hits: $($stats.breakdown.l3Hits) | Usage: $($stats.l3.usage)%" -ForegroundColor Cyan
    Write-Host "  Entries: $($stats.l3.count)/$($stats.l3.max) | Threshold: $($stats.l3.similarityThreshold)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Get-StringHash {
    param([string]$input)
    $hash = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($input)
    $hashBytes = $hash.ComputeHash($bytes)
    return [System.BitConverter]::ToString($hashBytes) -replace '-', ''
}

function Calculate-StringSimilarity {
    param([string]$str1, [string]$str2)
    if ($str1 -eq $str2) { return 1.0 }
    if ([string]::IsNullOrEmpty($str1) -or [string]::IsNullOrEmpty($str2)) { return 0.0 }
    $chars1 = $str1.ToCharArray(); $chars2 = $str2.ToCharArray()
    $common = 0; foreach ($c in $chars1) { if ($chars2 -contains $c) { $common++ } }
    $maxLen = [Math]::Max($chars1.Length, $chars2.Length)
    return [math]::Round($common / $maxLen, 2)
}

function Test-MultiLevelCache {
    Write-Host "=== Multi-Level Cache Tests ===" -ForegroundColor Cyan
    Initialize-MultiLevelCache -clearExisting
    Write-Host ""
    Write-Host "[Test 1] L1 Set/Get" -ForegroundColor Yellow
    Set-L1 -key "test1" -value "L1 value" -ttl 60
    $v = Get-L1 -key "test1"
    if ($v -eq "L1 value") { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL: got $v" -ForegroundColor Red }
    Write-Host ""
    Write-Host "[Test 2] L2 Set/Get" -ForegroundColor Yellow
    Set-L2 -key "test2" -value "L2 value" -ttl 60
    $v = Get-L2 -key "test2"
    if ($v -eq "L2 value") { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL: got $v" -ForegroundColor Red }
    Write-Host ""
    Write-Host "[Test 3] L3 Semantic Set/Get" -ForegroundColor Yellow
    Set-L3 -query "AI development" -value "AI content"
    $result = Get-L3 -query "AI progress"
    if ($null -ne $result) { Write-Host "PASS (similarity: $($result.similarity))" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    Write-Host ""
    Write-Host "[Test 4] Multi-level Get (L1 hit)" -ForegroundColor Yellow
    Set-L1 -key "multi" -value "from L1"
    $r = Get-Cache -key "multi"
    if ($r.level -eq "L1") { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL: got level $($r.level)" -ForegroundColor Red }
    Write-Host ""
    Write-Host "[Test 5] Stats" -ForegroundColor Yellow
    Show-CacheStats
    Write-Host ""
    Write-Host "[Test 6] Clear" -ForegroundColor Yellow
    Clear-Cache -level "all"
    $stats = Get-CacheStats
    Write-Host "After clear - L1: $($stats.l1.count), L2: $($stats.l2.count), L3: $($stats.l3.count)"
    Write-Host ""
    Write-Host "=== All Tests Complete ===" -ForegroundColor Green
}

Initialize-MultiLevelCache

if ($MyInvocation.InvocationName -ne ".") {
    Test-MultiLevelCache
}
