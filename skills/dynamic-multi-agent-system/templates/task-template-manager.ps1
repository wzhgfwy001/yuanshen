# Task Template Manager v1.3
# Loads templates from external JSON file

$script:scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $script:scriptDir) { $script:scriptDir = $PSScriptRoot }
$script:templateDataFile = Join-Path $script:scriptDir "task-template-data.json"
$script:templateIndex = @{}
$script:templateCache = @{}
$script:PresetTemplates = @{}
$script:TemplateCategories = @{}

# ============================================================
# Load template data from JSON
# ============================================================
function Load-TemplateData {
    if (-not (Test-Path $script:templateDataFile)) {
        Write-Error "Template data file not found: $script:templateDataFile"
        return $false
    }
    
    try {
        $jsonContent = Get-Content $script:templateDataFile -Raw -Encoding UTF8
        $data = $jsonContent | ConvertFrom-Json
        
        # Load categories
        $script:TemplateCategories = @{}
        foreach ($prop in $data.categories.PSObject.Properties) {
            $script:TemplateCategories[$prop.Name] = @{
                name = $prop.Value.name
                icon = $prop.Value.icon
                desc = $prop.Value.desc
            }
        }
        
        # Load templates
        $script:PresetTemplates = @{}
        foreach ($prop in $data.templates.PSObject.Properties) {
            $t = $prop.Value
            $script:PresetTemplates[$prop.Name] = @{
                id = $t.id
                category = $t.category
                name = $t.name
                description = $t.description
                version = $t.version
                agents = @($t.agents)
                complexity = [int]$t.complexity
                estimatedTime = $t.estimatedTime
                prompt = $t.prompt
                outputFormat = $t.outputFormat
                tags = @($t.tags)
            }
        }
        
        return $true
    } catch {
        Write-Error "Failed to load template data: $_"
        return $false
    }
}

# ============================================================
# Core Functions
# ============================================================

function Initialize-TemplateIndex {
    if (-not (Load-TemplateData)) {
        # Fallback - minimal template set
        $script:PresetTemplates = @{
            "article-daily-news" = @{
                id = "article-daily-news"
                category = "writing"
                name = "Daily News Article"
                description = "Write daily news article"
                version = "1.0.0"
                agents = @("researcher", "writer", "editor")
                complexity = 2
                estimatedTime = "5-10min"
                prompt = "Please write a daily news article about: {topic}"
                outputFormat = "markdown"
                tags = @("news", "article", "daily")
            }
        }
    }
    
    $script:templateIndex = @{}
    foreach ($key in $script:PresetTemplates.Keys) {
        $t = $script:PresetTemplates[$key]
        $script:templateIndex[$key] = @{
            id = $t.id
            category = $t.category
            name = $t.name
            description = $t.description
            complexity = $t.complexity
            estimatedTime = $t.estimatedTime
            tags = $t.tags
        }
    }
    Write-Host "OK: Template index initialized with $($script:templateIndex.Count) templates" -ForegroundColor Green
}

function Get-Template {
    param(
        [Parameter(Mandatory=$false)]
        [string]$id,
        
        [Parameter(Mandatory=$false)]
        [string]$category,
        
        [Parameter(Mandatory=$false)]
        [string]$tag,
        
        [Parameter(Mandatory=$false)]
        [int]$maxComplexity
    )
    
    $results = @()
    
    foreach ($key in $script:PresetTemplates.Keys) {
        $t = $script:PresetTemplates[$key]
        $match = $true
        
        if ($id -and $t.id -ne $id) { $match = $false }
        if ($category -and $t.category -ne $category) { $match = $false }
        if ($tag -and $tag -notin $t.tags) { $match = $false }
        if ($maxComplexity -and $t.complexity -gt $maxComplexity) { $match = $false }
        
        if ($match) { $results += $t }
    }
    
    return $results
}

function Show-TemplateList {
    param(
        [string]$category = "",
        [int]$limit = 20
    )
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Template Library (v1.3)" -ForegroundColor Cyan
    Write-Host "  Total: $($script:PresetTemplates.Count) templates" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($category -and $script:TemplateCategories.ContainsKey($category)) {
        $cat = $script:TemplateCategories[$category]
        Write-Host "[$($cat.icon)] $($cat.name) - $($cat.desc)" -ForegroundColor Yellow
        Write-Host ("-" * 40)
        
        $templates = Get-Template -category $category
        foreach ($t in $templates) {
            Write-Host "  [$($t.id)] $($t.name)" -ForegroundColor Green
            Write-Host "         $($t.description)" -ForegroundColor Gray
        }
    } else {
        foreach ($catKey in $script:TemplateCategories.Keys) {
            $cat = $script:TemplateCategories[$catKey]
            $count = (Get-Template -category $catKey).Count
            if ($count -gt 0) {
                Write-Host "[$($cat.icon)] $($cat.name) ($count)" -ForegroundColor Yellow
                Write-Host "         $($cat.desc)" -ForegroundColor Gray
                Write-Host ""
            }
        }
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-TemplateDetail {
    param([string]$id)
    
    $t = $script:PresetTemplates[$id]
    if (-not $t) {
        Write-Host "Template not found: $id" -ForegroundColor Red
        return
    }
    
    $cat = if ($script:TemplateCategories[$t.category]) { $script:TemplateCategories[$t.category] } else { @{icon="?"; name=$t.category} }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Template Detail" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "ID:        $($t.id)" -ForegroundColor White
    Write-Host "Name:      $($t.name)" -ForegroundColor White
    Write-Host "Category:  [$($cat.icon)] $($cat.name)" -ForegroundColor Yellow
    Write-Host "Desc:      $($t.description)" -ForegroundColor Gray
    Write-Host "Version:   $($t.version)" -ForegroundColor Gray
    Write-Host "Complexity: $($t.complexity)/5" -ForegroundColor Yellow
    Write-Host "Est Time:  $($t.estimatedTime)" -ForegroundColor Yellow
    Write-Host "Agents:    $($t.agents -join ' -> ')" -ForegroundColor Cyan
    Write-Host "Tags:      $($t.tags -join ', ')" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "--- Prompt Template ---" -ForegroundColor Yellow
    Write-Host $t.prompt -ForegroundColor White
    
    Write-Host ""
    Write-Host "--- Output Format ---" -ForegroundColor Yellow
    Write-Host $t.outputFormat -ForegroundColor White
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Get-TemplatePrompt {
    param(
        [string]$id,
        [hashtable]$params
    )
    
    $t = $script:PresetTemplates[$id]
    if (-not $t) {
        Write-Error "Template not found: $id"
        return $null
    }
    
    $prompt = $t.prompt
    
    foreach ($key in $params.Keys) {
        $placeholder = "{$key}"
        $prompt = $prompt -replace [regex]::Escape($placeholder), $params[$key]
    }
    
    return @{
        templateId = $id
        templateName = $t.name
        prompt = $prompt
        agents = $t.agents
        outputFormat = $t.outputFormat
        estimatedTime = $t.estimatedTime
    }
}

function Search-Templates {
    param([string]$query)
    
    $results = @()
    $queryLower = $query.ToLower()
    
    foreach ($key in $script:PresetTemplates.Keys) {
        $t = $script:PresetTemplates[$key]
        $score = 0
        
        if ($t.name.ToLower() -match $queryLower) { $score += 10 }
        if ($t.description.ToLower() -match $queryLower) { $score += 5 }
        if ($t.tags | Where-Object { $_.ToLower() -match $queryLower }) { $score += 3 }
        if ($t.category.ToLower() -match $queryLower) { $score += 2 }
        
        if ($score -gt 0) {
            $results += @{
                template = $t
                score = $score
            }
        }
    }
    
    $results = $results | Sort-Object { $_.score } -Descending
    
    Write-Host ""
    Write-Host "Search results for: ""$query""" -ForegroundColor Cyan
    Write-Host ""
    foreach ($r in $results) {
        $t = $r.template
        Write-Host "[$($t.id)] $($t.name) (score: $($r.score))" -ForegroundColor Green
        Write-Host "         $($t.description)" -ForegroundColor Gray
    }
    
    if ($results.Count -eq 0) {
        Write-Host "No templates found, try another keyword" -ForegroundColor Yellow
    }
    
    Write-Host ""
    return $results
}

function Get-TemplateStats {
    $stats = @{
        total = $script:PresetTemplates.Count
        byCategory = @{}
        byComplexity = @{}
        byAgent = @{}
    }
    
    foreach ($key in $script:PresetTemplates.Keys) {
        $t = $script:PresetTemplates[$key]
        
        if (-not $stats.byCategory.ContainsKey($t.category)) {
            $stats.byCategory[$t.category] = 0
        }
        $stats.byCategory[$t.category]++
        
        if (-not $stats.byComplexity.ContainsKey($t.complexity)) {
            $stats.byComplexity[$t.complexity] = 0
        }
        $stats.byComplexity[$t.complexity]++
        
        foreach ($agent in $t.agents) {
            if (-not $stats.byAgent.ContainsKey($agent)) {
                $stats.byAgent[$agent] = 0
            }
            $stats.byAgent[$agent]++
        }
    }
    
    return $stats
}

function Show-TemplateStats {
    $stats = Get-TemplateStats
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Template Statistics" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Total templates: $($stats.total)" -ForegroundColor White
    Write-Host ""
    Write-Host "[By Category]" -ForegroundColor Yellow
    foreach ($cat in $stats.byCategory.Keys) {
        $catInfo = if ($script:TemplateCategories[$cat]) { $script:TemplateCategories[$cat] } else { @{icon="?"; name=$cat} }
        Write-Host "  $($catInfo.icon) $($catInfo.name): $($stats.byCategory[$cat])" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "[By Complexity]" -ForegroundColor Yellow
    foreach ($level in ($stats.byComplexity.Keys | Sort-Object)) {
        $bar = [string]::Join("", @("=") * $stats.byComplexity[$level])
        Write-Host "  $($level) stars: $bar ($($stats.byComplexity[$level]))" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "[Agent Distribution]" -ForegroundColor Yellow
    $topAgents = $stats.byAgent.GetEnumerator() | Sort-Object { $_.Value } -Descending | Select-Object -First 5
    foreach ($a in $topAgents) {
        Write-Host "  Agent $($a.Key): $($a.Value)" -ForegroundColor Magenta
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================
# Test Function
# ============================================================
function Test-TemplateManager {
    Write-Host "=== Task Template Manager Tests v1.3 ===" -ForegroundColor Cyan
    
    Initialize-TemplateIndex
    
    Write-Host ""
    Write-Host "[Test 1] List templates by category (writing)" -ForegroundColor Yellow
    Show-TemplateList -category "writing"
    
    Write-Host ""
    Write-Host "[Test 2] Template detail" -ForegroundColor Yellow
    Show-TemplateDetail -id "article-daily-news"
    
    Write-Host ""
    Write-Host "[Test 3] Get template prompt with params" -ForegroundColor Yellow
    $result = Get-TemplatePrompt -id "article-daily-news" -params @{
        topic = "AI Model Trends"
        wordCount = 1000
        style = "Professional"
    }
    Write-Host "Template: $($result.templateName)" -ForegroundColor Green
    Write-Host "Agents: $($result.agents -join ', ')" -ForegroundColor Green
    Write-Host "Prompt preview: $($result.prompt.Substring(0, [Math]::Min(200, $result.prompt.Length)))..." -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "[Test 4] Search templates" -ForegroundColor Yellow
    Search-Templates -query "business"
    
    Write-Host ""
    Write-Host "[Test 5] Template stats" -ForegroundColor Yellow
    Show-TemplateStats
    
    Write-Host ""
    Write-Host "=== All Tests Complete ===" -ForegroundColor Green
}

# ============================================================
# Run tests if executed directly
# ============================================================
if ($MyInvocation.InvocationName -ne ".") {
    Test-TemplateManager
}
