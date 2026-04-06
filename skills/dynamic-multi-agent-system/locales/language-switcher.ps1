# Language Switcher - Simplified

$script:localesDir = Join-Path $PSScriptRoot "locales"
$script:currentLang = "zh-CN"
$script:translations = $null

function Set-Language {
    param([string]$lang = "zh-CN")
    $supported = @("zh-CN", "en-US", "ja-JP")
    if ($supported -notcontains $lang) { Write-Warning "Unsupported: $lang"; return $false }
    $script:currentLang = $lang
    $langFile = Join-Path $localesDir "$lang.json"
    if (Test-Path $langFile) {
        $script:translations = Get-Content $langFile -Raw | ConvertFrom-Json
        Write-Host "OK: Switched to $lang" -ForegroundColor Green
        return $true
    }
    return $false
}

function Get-Text {
    param([string]$category, [string]$key)
    if (!$script:translations) { Set-Language "zh-CN" | Out-Null }
    try { return $script:translations.$category.$key }
    catch { return "[$category.$key]" }
}

function Test-Lang {
    Write-Host "=== Language Tests ===" -ForegroundColor Cyan
    Set-Language "zh-CN" | Out-Null
    Write-Host "[Test 1] zh-CN loading: $(Get-Text common loading)" -ForegroundColor Yellow
    Set-Language "en-US" | Out-Null
    Write-Host "[Test 2] en-US loading: $(Get-Text common loading)" -ForegroundColor Yellow
    Set-Language "ja-JP" | Out-Null
    Write-Host "[Test 3] ja-JP loading: $(Get-Text common loading)" -ForegroundColor Yellow
    Set-Language "zh-CN" | Out-Null
    Write-Host "=== Complete ===" -ForegroundColor Cyan
}

Set-Language "zh-CN" | Out-Null
