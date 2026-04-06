# Result Exporter - Simplified Version

$script:exportDir = Join-Path $PSScriptRoot "..\..\exports"
if (!(Test-Path $exportDir)) { New-Item -ItemType Directory -Force -Path $exportDir | Out-Null }

function Export-ToMarkdown {
    param([hashtable]$data, [string]$outputPath)
    $md = "# Report`n`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n---`n`n"
    if ($data.content) { $md += "$($data.content)`n`n" }
    $md | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: Markdown exported" -ForegroundColor Green
}

function Export-ToJSON {
    param([hashtable]$data, [string]$outputPath)
    $data | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: JSON exported" -ForegroundColor Green
}

function Export-ToTXT {
    param([hashtable]$data, [string]$outputPath)
    $txt = "Report`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n$($data.content)"
    $txt | Out-File -FilePath $outputPath -Encoding utf8
    Write-Host "OK: TXT exported" -ForegroundColor Green
}

function Export-ToPDF {
    param([hashtable]$data, [string]$outputPath)
    $html = "<html><head><title>$($data.title)</title></head><body>"
    $html += "<h1>$($data.title)</h1><p>Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>"
    $html += "<div>$($data.content)</div></body></html>"
    $htmlPath = $outputPath -replace '\.pdf$', '.html'
    $html | Out-File -FilePath $htmlPath -Encoding utf8
    Write-Host "OK: HTML generated (print to PDF): $htmlPath" -ForegroundColor Green
}

function Export-Result {
    param([hashtable]$data, [string]$format = "md", [string]$outputPath)
    if (!$outputPath) { $outputPath = Join-Path $exportDir "export-$(Get-Date -Format 'yyyyMMdd-HHmmss')" }
    
    switch ($format.ToLower()) {
        "md" { Export-ToMarkdown -data $data -outputPath "$outputPath.md" }
        "json" { Export-ToJSON -data $data -outputPath "$outputPath.json" }
        "txt" { Export-ToTXT -data $data -outputPath "$outputPath.txt" }
        "pdf" { Export-ToPDF -data $data -outputPath "$outputPath.pdf" }
        default { Write-Error "Unsupported format"; return $false }
    }
    return $true
}

function Test-Exporter {
    Write-Host "=== Exporter Tests ===" -ForegroundColor Cyan
    $data = @{title = "Test"; content = "Test content"}
    
    Write-Host "`n[Test 1] Markdown" -ForegroundColor Yellow
    Export-Result -data $data -format "md" -outputPath "$env:TEMP\test.md"
    
    Write-Host "`n[Test 2] JSON" -ForegroundColor Yellow
    Export-Result -data $data -format "json" -outputPath "$env:TEMP\test.json"
    
    Write-Host "`n[Test 3] TXT" -ForegroundColor Yellow
    Export-Result -data $data -format "txt" -outputPath "$env:TEMP\test.txt"
    
    Write-Host "`n[Test 4] PDF (HTML)" -ForegroundColor Yellow
    Export-Result -data $data -format "pdf" -outputPath "$env:TEMP\test.pdf"
    
    Write-Host "`n=== Complete ===" -ForegroundColor Cyan
}
