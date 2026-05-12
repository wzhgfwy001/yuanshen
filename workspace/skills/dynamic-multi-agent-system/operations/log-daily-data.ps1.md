# 运营数据快速记录脚本

**用途：** 快速记录每日运营数据到 TOKEN-MONITOR.md
**使用：** PowerShell 运行

---

## 📝 使用方法

```powershell
# 1. 记录今日数据
.\log-daily-data.ps1 -totalTasks 10 -tokens 50000 -success 95

# 2. 查看今日记录
.\log-daily-data.ps1 -view

# 3. 生成日报
.\log-daily-data.ps1 -report
```

---

## 🔧 脚本代码

```powershell
# log-daily-data.ps1
param(
    [int]$totalTasks,
    [int]$tokens,
    [int]$successRate,
    [switch]$view,
    [switch]$report
)

$date = Get-Date -Format "yyyy-MM-dd"
$filePath = "operations/TOKEN-MONITOR.md"

if ($view) {
    Get-Content $filePath | Select-String -Pattern $date -Context 5
    return
}

if ($report) {
    Write-Host "生成日报..."
    # 调用日报生成逻辑
    return
}

# 记录数据
$content = @"

### $date
| 指标 | 数值 | 备注 |
|------|------|------|
| 总任务数 | $totalTasks | - |
| 总 Token 消耗 | $tokens | - |
| 平均 Token/任务 | $([math]::Round($tokens/$totalTasks,2)) | - |
| 成功率 | $successRate% | - |
| 峰值时段 | - | - |
| 最低时段 | - | - |

"@

Add-Content -Path $filePath -Value $content
Write-Host "✅ 数据已记录到 $filePath"
```

---

## 📊 示例数据

```powershell
# 示例：记录今日数据
.\log-daily-data.ps1 -totalTasks 15 -tokens 75000 -successRate 98

# 输出：
# ✅ 数据已记录到 operations/TOKEN-MONITOR.md
```

---

## 🎯 快捷命令

```powershell
# 别名设置（加入 PowerShell 配置文件）
Set-Alias logop .\log-daily-data.ps1

# 之后可以这样用：
logop -totalTasks 10 -tokens 50000 -success 95
```

---

**创建时间：** 2026-04-06
**维护人：** 开发团队
