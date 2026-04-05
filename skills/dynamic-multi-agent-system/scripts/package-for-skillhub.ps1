# 打包脚本 for 腾讯 SkillHub 提交
# 版本：1.0
# 日期：2026-04-04

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  混合动态多 Agent 系统 - 打包工具" -ForegroundColor Cyan
Write-Host "  目标平台：腾讯 SkillHub" -ForegroundColor Cyan
Write-Host "  版本：v1.0.0-alpha" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置路径
$ProjectRoot = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system"
$ReleasesDir = "C:\Users\DELL\.openclaw\workspace\releases"
$PackageName = "dynamic-multi-agent-system-v1.0.0-alpha.zip"
$PackagePath = Join-Path $ReleasesDir $PackageName

# 检查项目目录
Write-Host "📁 检查项目目录..." -ForegroundColor Yellow
if (!(Test-Path $ProjectRoot)) {
    Write-Host "❌ 错误：项目目录不存在！$ProjectRoot" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 项目目录存在" -ForegroundColor Green
Write-Host ""

# 检查关键文件
Write-Host "📋 检查关键文件..." -ForegroundColor Yellow
$RequiredFiles = @(
    "SKILL.md",
    "manifest.json",
    "README.md",
    "docs/DEPLOYMENT.md",
    "docs/USER-GUIDE.md",
    "docs/SUBMISSION-SKILLHUB.md",
    "test/system-test-report.md"
)

$MissingFiles = @()
foreach ($file in $RequiredFiles) {
    $filePath = Join-Path $ProjectRoot $file
    if (!(Test-Path $filePath)) {
        $MissingFiles += $file
        Write-Host "  ❌ 缺失：$file" -ForegroundColor Red
    } else {
        Write-Host "  ✅ 存在：$file" -ForegroundColor Green
    }
}

if ($MissingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ 错误：缺少 $($MissingFiles.Count) 个关键文件！" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 创建发布目录
Write-Host "📁 创建发布目录..." -ForegroundColor Yellow
if (!(Test-Path $ReleasesDir)) {
    New-Item -ItemType Directory -Force -Path $ReleasesDir | Out-Null
    Write-Host "✅ 已创建：$ReleasesDir" -ForegroundColor Green
} else {
    Write-Host "✅ 目录已存在：$ReleasesDir" -ForegroundColor Green
}
Write-Host ""

# 删除旧包（如存在）
if (Test-Path $PackagePath) {
    Write-Host "🗑️  删除旧版本包..." -ForegroundColor Yellow
    Remove-Item $PackagePath -Force
    Write-Host "✅ 已删除旧版本" -ForegroundColor Green
}
Write-Host ""

# 打包
Write-Host "📦 开始打包..." -ForegroundColor Yellow
Write-Host "  源目录：$ProjectRoot"
Write-Host "  目标文件：$PackagePath"
Write-Host ""

try {
    Compress-Archive -Path "$ProjectRoot\*" `
                     -DestinationPath $PackagePath `
                     -Force `
                     -CompressionLevel Optimal
    
    Write-Host "✅ 打包成功！" -ForegroundColor Green
} catch {
    Write-Host "❌ 打包失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 验证包
Write-Host "🔍 验证包内容..." -ForegroundColor Yellow
try {
    $PackageContent = Get-ChildItem $PackagePath
    $PackageSize = $PackageContent.Length / 1KB
    
    Write-Host "  文件名：$PackageName"
    Write-Host "  文件大小：$([math]::Round($PackageSize, 2)) KB"
    Write-Host "  创建时间：$($PackageContent.CreationTime)"
    Write-Host ""
    
    # 列出包内文件（前 20 个）
    Write-Host "  包内文件（部分）:" -ForegroundColor Gray
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($PackagePath)
    $first20 = $zip.Entries | Select-Object -First 20
    foreach ($entry in $first20) {
        Write-Host "    - $($entry.FullName)"
    }
    if ($zip.Entries.Count -gt 20) {
        Write-Host "    ... 还有 $($zip.Entries.Count - 20) 个文件"
    }
    $zip.Dispose()
    
    Write-Host ""
    Write-Host "✅ 包验证通过！" -ForegroundColor Green
} catch {
    Write-Host "❌ 包验证失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 生成校验和
Write-Host "🔐 生成校验和..." -ForegroundColor Yellow
$hash = Get-FileHash $PackagePath -Algorithm SHA256
Write-Host "  SHA256: $($hash.Hash)" -ForegroundColor Gray
Write-Host ""

# 保存校验和
$HashFile = Join-Path $ReleasesDir "dynamic-multi-agent-system-v1.0.0-alpha.sha256"
$hash.Hash | Out-File $HashFile -Encoding UTF8
Write-Host "✅ 校验和已保存：$HashFile" -ForegroundColor Green
Write-Host ""

# 完成总结
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ 打包完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 包位置：" -ForegroundColor Yellow
Write-Host "   $PackagePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 包信息：" -ForegroundColor Yellow
Write-Host "   文件名：$PackageName"
Write-Host "   大小：$([math]::Round($PackageSize, 2)) KB"
Write-Host "   SHA256: $($hash.Hash.Substring(0, 16))..."
Write-Host ""
Write-Host "🚀 下一步：" -ForegroundColor Yellow
Write-Host "   1. 访问腾讯 SkillHub 平台"
Write-Host "   2. 登录开发者账号"
Write-Host "   3. 创建新应用"
Write-Host "   4. 上传此 ZIP 包"
Write-Host "   5. 填写应用信息"
Write-Host "   6. 提交审核"
Write-Host ""
Write-Host "📖 详细提交指南：" -ForegroundColor Yellow
Write-Host "   docs/SUBMISSION-GUIDE.md"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# 询问是否打开 SkillHub
$openSkillHub = Read-Host "是否现在打开腾讯 SkillHub 平台？(y/n)"
if ($openSkillHub -eq 'y' -or $openSkillHub -eq 'Y') {
    Write-Host "🌐 打开浏览器..." -ForegroundColor Yellow
    Start-Process "https://skillhub.tencent.com"
    Write-Host "✅ 浏览器已打开" -ForegroundColor Green
}

Write-Host ""
Write-Host "祝提交顺利！🎉" -ForegroundColor Green
Write-Host ""
