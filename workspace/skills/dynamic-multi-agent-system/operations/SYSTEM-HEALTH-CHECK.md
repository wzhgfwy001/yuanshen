# 系统稳定性监控脚本

**用途：** 快速检查系统核心组件状态
**执行频率：** 每日 2 次（09:00 / 18:00）

---

## 🔍 检查项目

### 1. 监控大屏可访问性
```bash
# 检查文件是否存在
Test-Path "dashboard-simple.html"
# 预期：True
```

### 2. API 服务状态
```bash
# 测试 API 响应
curl http://localhost:5000/api/queue/status?mock=true
# 预期：返回 JSON 数据
```

### 3. Skill 文件完整性
```bash
# 检查核心 SKILL.md 文件
Get-ChildItem -Recurse -Filter "SKILL.md" | Select-Object FullName
# 预期：8 个核心模块文件存在
```

### 4. 文档完整性
```bash
# 检查 operations 目录文件
Get-ChildItem "operations" -Filter "*.md" | Select-Object Name
# 预期：P0-TRACKING.md, USER-FEEDBACK.md, TOKEN-MONITOR.md, SKILLHUB-CHECKLIST.md
```

---

## 📋 快速检查脚本

```powershell
# check-system-health.ps1
Write-Host "=== 系统健康检查 ===" -ForegroundColor Cyan

# 1. 检查监控大屏
if (Test-Path "dashboard-simple.html") {
    Write-Host "✅ 监控大屏文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ 监控大屏文件缺失" -ForegroundColor Red
}

# 2. 检查核心模块
$coreModules = @(
    "task-classifier/SKILL.md",
    "task-decomposer/SKILL.md",
    "subagent-manager/SKILL.md",
    "quality-checker/SKILL.md"
)
foreach ($module in $coreModules) {
    if (Test-Path $module) {
        Write-Host "✅ $module" -ForegroundColor Green
    } else {
        Write-Host "❌ $module 缺失" -ForegroundColor Red
    }
}

# 3. 检查运营文档
$opsFiles = Get-ChildItem "operations" -Filter "*.md" -ErrorAction SilentlyContinue
if ($opsFiles.Count -ge 4) {
    Write-Host "✅ 运营文档完整 ($($opsFiles.Count) 个)" -ForegroundColor Green
} else {
    Write-Host "⚠️  运营文档不完整 (期望 4 个，实际 $($opsFiles.Count) 个)" -ForegroundColor Yellow
}

Write-Host "=== 检查完成 ===" -ForegroundColor Cyan
```

---

## 📊 健康状态记录

| 日期 | 时间 | 大屏 | API | 核心模块 | 文档 | 状态 |
|------|------|------|-----|----------|------|------|
| 2026-04-06 | 09:50 | ✅ | - | ✅ | ✅ | 🟢 正常 |
| 2026-04-06 | 10:05 | ✅ | - | ✅ (18 个) | ✅ (6 个) | 🟢 正常 |

---

## ⚠️ 异常处理

| 问题 | 处理方案 |
|------|----------|
| 监控大屏文件缺失 | 重新生成 dashboard-simple.html |
| API 无响应 | 检查 monitor.py 是否运行 |
| 核心模块缺失 | 从备份恢复或重新部署 |
| 文档缺失 | 重新创建运营文档 |

---

**创建时间：** 2026-04-06 09:50
**维护人：** 开发团队
