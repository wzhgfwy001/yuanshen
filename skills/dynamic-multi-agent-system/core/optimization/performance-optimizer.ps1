# Performance Optimizer - Simplified English Version

$script:cacheDir = Join-Path $PSScriptRoot "..\..\state\cache"
$script:cacheFile = Join-Path $cacheDir "result-cache.json"
$script:cacheEnabled = $true
$script:cacheTTL = 60

if (!(Test-Path $cacheDir)) { New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null }

function Init-Cache {
    if (!(Test-Path $cacheFile)) {
        @{entries = @()} | ConvertTo-Json | Out-File -FilePath $cacheFile -Encoding utf8
    }
}

function Get-Cache {
    param([string]$key)
    if (!$script:cacheEnabled) { return $null }
    Init-Cache
    $cache = Get-Content $cacheFile -Raw | ConvertFrom-Json
    $entry = $cache.entries | Where-Object { $_.key -eq $key }
    if ($entry) { return $entry.value }
    return $null
}

function Set-Cache {
    param([string]$key, [object]$value)
    if (!$script:cacheEnabled) { return }
    Init-Cache
    $cache = Get-Content $cacheFile -Raw | ConvertFrom-Json
    $cache.entries += @{key = $key; value = $value; at = (Get-Date -Format "o")}
    if ($cache.entries.Count -gt 100) { $cache.entries = $cache.entries | Select-Object -Last 100 }
    $cache | ConvertTo-Json | Out-File -FilePath $cacheFile -Encoding utf8
}

function Clear-Cache {
    @{entries = @()} | ConvertTo-Json | Out-File -FilePath $cacheFile -Encoding utf8
    Write-Host "OK: Cache cleared" -ForegroundColor Green
}

function Get-CacheStats {
    Init-Cache
    $cache = Get-Content $cacheFile -Raw | ConvertFrom-Json
    return @{entries = $cache.entries.Count; enabled = $script:cacheEnabled; ttl = $script:cacheTTL}
}

function Compress-Data {
    param([object]$data, [int]$maxLen = 5000)
    if ($data -is [string] -and $data.Length -gt $maxLen) {
        return $data.Substring(0, $maxLen) + "...[truncated]"
    }
    return $data
}

function Test-Opt {
    Write-Host "=== Performance Optimizer Tests ===" -ForegroundColor Cyan
    Write-Host "`n[Test 1] Cache Set/Get" -ForegroundColor Yellow
    Set-Cache -key "test1" -value "hello"
    $val = Get-Cache -key "test1"
    if ($val -eq "hello") { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 2] Cache Stats" -ForegroundColor Yellow
    $stats = Get-CacheStats
    Write-Host "PASS (Entries: $($stats.entries))" -ForegroundColor Green
    
    Write-Host "`n[Test 3] Data Compression" -ForegroundColor Yellow
    $large = "x" * 10000
    $compressed = Compress-Data -data $large -maxLen 5000
    if ($compressed.Length -lt 10000) { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n[Test 4] Cache Clear" -ForegroundColor Yellow
    Clear-Cache
    $stats = Get-CacheStats
    if ($stats.entries -eq 0) { Write-Host "PASS" -ForegroundColor Green } else { Write-Host "FAIL" -ForegroundColor Red }
    
    Write-Host "`n=== Complete ===" -ForegroundColor Cyan
}

Init-Cache
