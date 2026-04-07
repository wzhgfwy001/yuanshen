# Enhanced Result Exporter v1.3
# Supports Markdown/JSON/TXT/HTML/CSV export

$script:exportDir = Join-Path $PSScriptRoot "..\..\exports"
$script:exportHistory = @()

if (!(Test-Path $script:exportDir)) {
    New-Item -ItemType Directory -Force -Path $script:exportDir | Out-Null
}

$script:ExportFormats = @{
    "markdown" = @{ name = "Markdown"; extension = ".md"; mimeType = "text/markdown"; icon = "[MD]"; description = "Documents, notes, blogs" }
    "json" = @{ name = "JSON"; extension = ".json"; mimeType = "application/json"; icon = "[JSON]"; description = "Data exchange, API" }
    "txt" = @{ name = "Plain Text"; extension = ".txt"; mimeType = "text/plain"; icon = "[TXT]"; description = "Plain text, code" }
    "html" = @{ name = "HTML"; extension = ".html"; mimeType = "text/html"; icon = "[HTML]"; description = "Web pages, print to PDF" }
    "csv" = @{ name = "CSV"; extension = ".csv"; mimeType = "text/csv"; icon = "[CSV]"; description = "Tabular data" }
}

function Export-Result {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$data,
        [Parameter(Mandatory=$false)]
        [string]$format = "markdown",
        [Parameter(Mandatory=$false)]
        [string]$outputPath = "",
        [Parameter(Mandatory=$false)]
        [string]$filename = "",
        [Parameter(Mandatory=$false)]
        [switch]$includeMetadata,
        [Parameter(Mandatory=$false)]
        [switch]$openAfterExport
    )
    
    if (-not $filename) {
        $filename = "export-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    }
    if (-not $outputPath) { $outputPath = $script:exportDir }
    if (-not $script:ExportFormats.ContainsKey($format.ToLower())) {
        Write-Error "Unsupported format: $format"
        return $null
    }
    
    $fi = $script:ExportFormats[$format.ToLower()]
    $fullPath = Join-Path $outputPath "$filename$($fi.extension)"
    $exportData = Build-ExportData -data $data -includeMetadata:$includeMetadata
    
    switch ($format.ToLower()) {
        "markdown" { $actualPath = Export-ToMarkdown -data $exportData -outputPath $fullPath }
        "json"     { $actualPath = Export-ToJSON -data $exportData -outputPath $fullPath }
        "txt"      { $actualPath = Export-ToTXT -data $exportData -outputPath $fullPath }
        "html"     { $actualPath = Export-ToHTML -data $exportData -outputPath $fullPath }
        "csv"      { $actualPath = Export-ToCSV -data $exportData -outputPath $fullPath }
    }
    
    $script:exportHistory += @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        format = $format
        filename = "$filename$($fi.extension)"
        path = $actualPath
        size = (Get-Item $actualPath).Length
    }
    
    if ($openAfterExport) { Start-Process $actualPath }
    
    return @{ success = $true; path = $actualPath; format = $format; filename = "$filename$($fi.extension)"; size = (Get-Item $actualPath).Length }
}

function Build-ExportData {
    param([hashtable]$data, [switch]$includeMetadata)
    $ed = @{ content = $data.content; title = if ($data.title) { $data.title } else { "Export Result" }; timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss" }
    if ($includeMetadata -or $data.metadata) {
        $ed.metadata = @{ exportedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; format = "v1.3"; source = if ($data.source) { $data.source } else { "dynamic-multi-agent-system" }; version = "1.3.0" }
        if ($data.metadata) { $data.metadata.Keys | ForEach-Object { $ed.metadata[$_] = $data.metadata[$_] } }
        if ($data.taskInfo) { $ed.taskInfo = $data.taskInfo }
    }
    return $ed
}

function Export-ToMarkdown {
    param([hashtable]$data, [string]$outputPath)
    $sb = [System.Text.StringBuilder]::new()
    $sb.AppendLine("# $($data.title)") | Out-Null
    $sb.AppendLine("") | Out-Null
    if ($data.metadata) {
        $sb.AppendLine("---") | Out-Null
        $sb.AppendLine("**Exported:** $($data.timestamp)") | Out-Null
        if ($data.metadata.source) { $sb.AppendLine("**Source:** $($data.metadata.source)") | Out-Null }
        if ($data.metadata.taskId) { $sb.AppendLine("**Task ID:** $($data.metadata.taskId)") | Out-Null }
        if ($data.metadata.agent) { $sb.AppendLine("**Agent:** $($data.metadata.agent)") | Out-Null }
        $sb.AppendLine("---") | Out-Null
        $sb.AppendLine("") | Out-Null
    }
    if ($data.content) { $sb.AppendLine($data.content) | Out-Null; $sb.AppendLine("") | Out-Null }
    if ($data.taskInfo) {
        $sb.AppendLine("## Task Info") | Out-Null
        $sb.AppendLine("") | Out-Null
        $sb.AppendLine("| Property | Value |") | Out-Null
        $sb.AppendLine("|----------|-------|") | Out-Null
        foreach ($key in $data.taskInfo.Keys) {
            $val = $data.taskInfo[$key]
            if ($val -is [array]) { $val = $val -join ", " }
            $sb.AppendLine("| $key | $val |") | Out-Null
        }
        $sb.AppendLine("") | Out-Null
    }
    $sb.AppendLine("---") | Out-Null
    $sb.AppendLine("*Generated by Dynamic Multi-Agent System v1.3*") | Out-Null
    $sb.ToString() | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: Markdown exported to $outputPath" -ForegroundColor Green
    return $outputPath
}

function Export-ToJSON {
    param([hashtable]$data, [string]$outputPath)
    $eo = @{ metadata = @{ title = $data.title; exportedAt = $data.timestamp; format = "enhanced-json-v1"; version = "1.3.0" }; content = $data.content }
    if ($data.metadata) { $eo.metadata += $data.metadata }
    if ($data.taskInfo) { $eo.taskInfo = $data.taskInfo }
    $json = $eo | ConvertTo-Json -Depth 10
    try {
        $jsonObj = [System.Text.Json.JsonDocument]::Parse($json)
        $options = New-Object System.Text.Json.JsonSerializerOptions
        $options.WriteIndented = $true
        $prettyJson = [System.Text.Json.JsonSerializer]::Serialize($jsonObj, $options)
        $prettyJson | Out-File -FilePath $outputPath -Encoding utf8
    } catch {
        $json | Out-File -FilePath $outputPath -Encoding utf8
    }
    Write-Host "OK: JSON exported to $outputPath" -ForegroundColor Green
    return $outputPath
}

function Export-ToTXT {
    param([hashtable]$data, [string]$outputPath)
    $sb = [System.Text.StringBuilder]::new()
    $sb.AppendLine("============================================================") | Out-Null
    $sb.AppendLine($data.title.ToUpper()) | Out-Null
    $sb.AppendLine("============================================================") | Out-Null
    $sb.AppendLine("") | Out-Null
    if ($data.metadata) {
        $sb.AppendLine("--- METADATA ---") | Out-Null
        $sb.AppendLine("Exported: $($data.timestamp)") | Out-Null
        $data.metadata.Keys | ForEach-Object { $sb.AppendLine("$_ : $($data.metadata[$_])") | Out-Null }
        $sb.AppendLine("--- END METADATA ---") | Out-Null
        $sb.AppendLine("") | Out-Null
    }
    if ($data.content) { $sb.AppendLine("--- CONTENT ---") | Out-Null; $sb.AppendLine($data.content) | Out-Null; $sb.AppendLine("--- END CONTENT ---") | Out-Null; $sb.AppendLine("") | Out-Null }
    if ($data.taskInfo) {
        $sb.AppendLine("--- TASK INFO ---") | Out-Null
        foreach ($key in $data.taskInfo.Keys) {
            $val = $data.taskInfo[$key]
            if ($val -is [array]) { $val = $val -join ", " }
            $sb.AppendLine("$key : $val") | Out-Null
        }
        $sb.AppendLine("--- END TASK INFO ---") | Out-Null
        $sb.AppendLine("") | Out-Null
    }
    $sb.AppendLine("============================================================") | Out-Null
    $sb.AppendLine("Generated by Dynamic Multi-Agent System v1.3") | Out-Null
    $sb.ToString() | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: TXT exported to $outputPath" -ForegroundColor Green
    return $outputPath
}

function Export-ToHTML {
    param([hashtable]$data, [string]$outputPath)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $sb = [System.Text.StringBuilder]::new()
    $sb.AppendLine("<!DOCTYPE html>") | Out-Null
    $sb.AppendLine("<html lang='en'>") | Out-Null
    $sb.AppendLine("<head>") | Out-Null
    $sb.AppendLine("<meta charset='UTF-8'>") | Out-Null
    $sb.AppendLine("<meta name='viewport' content='width=device-width, initial-scale=1.0'>") | Out-Null
    $titleEsc = $data.title -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;'
    $sb.AppendLine("<title>$titleEsc</title>") | Out-Null
    $sb.AppendLine("<style>") | Out-Null
    $sb.AppendLine("* { box-sizing: border-box; margin: 0; padding: 0; }") | Out-Null
    $sb.AppendLine("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }") | Out-Null
    $sb.AppendLine(".container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }") | Out-Null
    $sb.AppendLine(".header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }") | Out-Null
    $sb.AppendLine(".header h1 { font-size: 24px; margin-bottom: 10px; }") | Out-Null
    $sb.AppendLine(".meta { display: flex; flex-wrap: wrap; gap: 15px; font-size: 14px; opacity: 0.9; }") | Out-Null
    $sb.AppendLine(".content { padding: 30px; }") | Out-Null
    $sb.AppendLine(".content h2 { color: #667eea; margin: 25px 0 15px; font-size: 18px; }") | Out-Null
    $sb.AppendLine(".content p { margin-bottom: 15px; }") | Out-Null
    $sb.AppendLine(".content ul, .content ol { margin: 15px 0; padding-left: 25px; }") | Out-Null
    $sb.AppendLine(".content li { margin-bottom: 8px; }") | Out-Null
    $sb.AppendLine(".content code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }") | Out-Null
    $sb.AppendLine(".content pre { background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 6px; overflow-x: auto; margin: 15px 0; }") | Out-Null
    $sb.AppendLine(".content table { width: 100%; border-collapse: collapse; margin: 15px 0; }") | Out-Null
    $sb.AppendLine(".content th, .content td { border: 1px solid #ddd; padding: 10px; text-align: left; }") | Out-Null
    $sb.AppendLine(".content th { background: #667eea; color: white; }") | Out-Null
    $sb.AppendLine(".content tr:nth-child(even) { background: #f9f9f9; }") | Out-Null
    $sb.AppendLine(".footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }") | Out-Null
    $sb.AppendLine("@media print { body { background: white; } .container { box-shadow: none; } }") | Out-Null
    $sb.AppendLine("</style>") | Out-Null
    $sb.AppendLine("</head>") | Out-Null
    $sb.AppendLine("<body>") | Out-Null
    $sb.AppendLine("<div class='container'>") | Out-Null
    $sb.AppendLine("<div class='header'>") | Out-Null
    $sb.AppendLine("<h1>$titleEsc</h1>") | Out-Null
    $sb.AppendLine("<div class='meta'>") | Out-Null
    $sb.AppendLine("<span>[=] $ts</span>") | Out-Null
    if ($data.metadata.source) { $sb.AppendLine("<span>[&gt;] $($data.metadata.source)</span>") | Out-Null }
    if ($data.metadata.taskId) { $sb.AppendLine("<span>[#] $($data.metadata.taskId)</span>") | Out-Null }
    $sb.AppendLine("</div>") | Out-Null
    $sb.AppendLine("</div>") | Out-Null
    $sb.AppendLine("<div class='content'>") | Out-Null
    
    if ($data.content) {
        $htmlContent = $data.content
        $htmlContent = $htmlContent -replace '\*\*(.+?)\*\*', '<strong>$1</strong>'
        $htmlContent = $htmlContent -replace '\*(.+?)\*', '<em>$1</em>'
        $htmlContent = $htmlContent -replace '```(\w+)?\n([\s\S]+?)\n```', '<pre><code>$2</code></pre>'
        $htmlContent = $htmlContent -replace '`(.+?)`', '<code>$1</code>'
        $htmlContent = $htmlContent -replace "`n", '<br>'
        $sb.AppendLine($htmlContent) | Out-Null
    }
    
    if ($data.taskInfo) {
        $sb.AppendLine("<div class='task-info'>") | Out-Null
        $sb.AppendLine("<h3>Task Info</h3>") | Out-Null
        $sb.AppendLine("<table>") | Out-Null
        foreach ($key in $data.taskInfo.Keys) {
            $val = $data.taskInfo[$key]
            if ($val -is [array]) { $val = $val -join ", " }
            $valEsc = $val -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;'
            $sb.AppendLine("<tr><th>$key</th><td>$valEsc</td></tr>") | Out-Null
        }
        $sb.AppendLine("</table>") | Out-Null
        $sb.AppendLine("</div>") | Out-Null
    }
    
    $sb.AppendLine("</div>") | Out-Null
    $sb.AppendLine("<div class='footer'>") | Out-Null
    $sb.AppendLine("Generated by Dynamic Multi-Agent System v1.3") | Out-Null
    $sb.AppendLine("</div>") | Out-Null
    $sb.AppendLine("</div>") | Out-Null
    $sb.AppendLine("</body>") | Out-Null
    $sb.AppendLine("</html>") | Out-Null
    
    $sb.ToString() | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: HTML exported to $outputPath" -ForegroundColor Green
    return $outputPath
}

function Export-ToCSV {
    param([hashtable]$data, [string]$outputPath)
    $sb = [System.Text.StringBuilder]::new()
    
    if ($data.content -is [array]) {
        $firstItem = $data.content[0]
        if ($firstItem -is [hashtable]) {
            $headers = $firstItem.Keys
            $sb.AppendLine(($headers -join ",")) | Out-Null
            foreach ($item in $data.content) {
                $row = @()
                foreach ($h in $headers) {
                    $val = $item[$h]
                    if ($val -is [array]) { $val = $val -join ";" }
                    $val = '"' + $val.ToString().Replace('"', '""') + '"'
                    $row += $val
                }
                $sb.AppendLine(($row -join ",")) | Out-Null
            }
        }
    } elseif ($data.content -is [hashtable]) {
        $sb.AppendLine("Key,Value") | Out-Null
        foreach ($key in $data.content.Keys) {
            $val = $data.content[$key]
            if ($val -is [array]) { $val = $val -join ";" }
            $sb.AppendLine('"' + $key + '","' + $val.ToString().Replace('"', '""') + '"') | Out-Null
        }
    } else {
        $sb.AppendLine("Content") | Out-Null
        $sb.AppendLine('"' + $data.content.ToString().Replace('"', '""') + '"') | Out-Null
    }
    
    $sb.ToString() | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: CSV exported to $outputPath" -ForegroundColor Green
    return $outputPath
}

function Export-Batch {
    param([hashtable[]]$items, [string]$format = "markdown", [string]$outputDir = "")
    if (-not $outputDir) {
        $outputDir = Join-Path $script:exportDir "batch-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    }
    $results = @()
    for ($i = 0; $i -lt $items.Length; $i++) {
        $item = $items[$i]
        $fname = if ($item.filename) { $item.filename } else { "item-$($i+1)" }
        $result = Export-Result -data $item.data -format $format -outputPath $outputDir -filename $fname
        $results += $result
    }
    return @{ success = $true; count = $results.Count; directory = $outputDir; results = $results }
}

function Get-ExportHistory { param([int]$limit = 20) return $script:exportHistory | Select-Object -Last $limit }

function Show-ExportHistory {
    param([int]$limit = 20)
    $recent = Get-ExportHistory -limit $limit
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Export History" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    foreach ($item in $recent) {
        $fi = $script:ExportFormats[$item.format]
        Write-Host "[$($fi.icon)] $($item.filename)" -ForegroundColor Yellow
        Write-Host "       $($item.timestamp) | " -NoNewline
        $sizeKB = [math]::Round($item.size / 1024, 1)
        if ($sizeKB -gt 1024) { Write-Host "$([math]::Round($sizeKB/1024, 1)) MB" -ForegroundColor Gray }
        else { Write-Host "$sizeKB KB" -ForegroundColor Gray }
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Clear-ExportHistory { $script:exportHistory = @(); Write-Host "OK: Export history cleared" -ForegroundColor Green }

function Show-ExportFormats {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Supported Export Formats" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    foreach ($key in $script:ExportFormats.Keys) {
        $f = $script:ExportFormats[$key]
        Write-Host "[$($f.icon)] $($f.name) ($key)" -ForegroundColor Yellow
        Write-Host "     $($f.description)" -ForegroundColor Gray
        Write-Host "     Extension: $($f.extension)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-Exporter {
    Write-Host "=== Enhanced Result Exporter Tests v1.3 ===" -ForegroundColor Cyan
    
    $testData = @{
        title = "Test Report - AI Development Trends"
        content = "## Summary  

This report analyzes key AI trends.  

### Trends  
1. Multimodal AI  
2. Edge AI  
3. Agent Systems  

Code: def agent_loop(task):  
    return execute(task)"
        metadata = @{ taskId = "test-001"; agent = "analyst"; source = "dynamic-multi-agent-system"; quality = "high" }
        taskInfo = @{ complexity = 3; estimatedTime = "15min"; agents = @("researcher", "analyst", "writer"); status = "completed" }
    }
    
    Write-Host ""
    Write-Host "[Test 1] Markdown Export" -ForegroundColor Yellow
    $r1 = Export-Result -data $testData -format "markdown" -filename "test-report"
    Write-Host "Path: $($r1.path)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[Test 2] JSON Export" -ForegroundColor Yellow
    $r2 = Export-Result -data $testData -format "json" -filename "test-report"
    Write-Host "Path: $($r2.path)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[Test 3] TXT Export" -ForegroundColor Yellow
    $r3 = Export-Result -data $testData -format "txt" -filename "test-report"
    Write-Host "Path: $($r3.path)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[Test 4] HTML Export" -ForegroundColor Yellow
    $r4 = Export-Result -data $testData -format "html" -filename "test-report"
    Write-Host "Path: $($r4.path)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[Test 5] CSV Export" -ForegroundColor Yellow
    $csvData = @{ title = "Table Data"; content = @(@{name="ProductA"; sales=1000; growth="10%"}, @{name="ProductB"; sales=2000; growth="20%"}) }
    $r5 = Export-Result -data $csvData -format "csv" -filename "test-table"
    Write-Host "Path: $($r5.path)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[Test 6] Batch Export" -ForegroundColor Yellow
    $batchItems = @(@{filename="batch-item-1"; data=@{title="Item 1"; content="Content 1"}}, @{filename="batch-item-2"; data=@{title="Item 2"; content="Content 2"}})
    $r6 = Export-Batch -items $batchItems -format "markdown"
    Write-Host "Batch dir: $($r6.directory)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[Test 7] Export History" -ForegroundColor Yellow
    Show-ExportHistory -limit 10
    
    Write-Host ""
    Write-Host "=== All Tests Complete ===" -ForegroundColor Green
}

if ($MyInvocation.InvocationName -ne ".") {
    Test-Exporter
}
