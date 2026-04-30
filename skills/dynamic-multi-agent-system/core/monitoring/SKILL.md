# monitoring - 运营监控

## 功能

每日运营监控脚本，收集和分析系统运行数据。

## 主要文件

| 文件 | 功能 |
|------|------|
| daily-ops-monitor.ps1 | 每日运营监控脚本 |

## 使用方式

```powershell
# 运行每日监控
.\daily-ops-monitor.ps1

# 保存报告
.\daily-ops-monitor.ps1 -SaveReport
```

## 监控内容

- 本地核心模块统计
- SkillHub数据分析
- 反馈统计
- 系统健康检查

---

*最后更新：2026-04-27*
*状态：基础功能*