# 清理脚本 - 删除 dynamic-multi-agent-system 目录
# 请在 PowerShell 中执行此脚本

Write-Host "正在删除 dynamic-multi-agent-system 目录..." -ForegroundColor Yellow

$targetPath = "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system"

if (Test-Path $targetPath) {
    Remove-Item -Path $targetPath -Recurse -Force
    Write-Host "删除成功！" -ForegroundColor Green
} else {
    Write-Host "目录不存在，无需删除" -ForegroundColor Yellow
}

# 同时删除临时清理脚本
if (Test-Path "C:\Users\DELL\.openclaw\workspace\cleanup-temp.ps1") {
    Remove-Item -Path "C:\Users\DELL\.openclaw\workspace\cleanup-temp.ps1" -Force
}

Write-Host "按任意键继续..."
Read-Host
