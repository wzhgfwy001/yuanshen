# 运营文档索引

**用途：** 快速定位运营相关文档
**最后更新：** 2026-04-06

---

## 📁 文档结构

```
operations/
├── README.md                    # 本文件 - 文档索引
├── P0-TRACKING.md              # P0 运营计划追踪表
├── USER-FEEDBACK.md            # 用户反馈收集表
├── TOKEN-MONITOR.md            # Token 使用监控日志
├── SKILLHUB-CHECKLIST.md       # SkillHub 后台检查清单
├── SYSTEM-HEALTH-CHECK.md      # 系统健康检查文档
├── FAQ-TEMPLATES.md            # 常见问题回复模板库
├── DAILY-REPORT-TEMPLATE.md    # 每日运营报告模板
├── WEEKLY-REPORT-TEMPLATE.md   # 每周运营报告模板
└── OPERATIONS-CHECKLIST.md     # 运营日历与任务清单
```

---

## 📋 文档用途速查

| 文档 | 用途 | 使用频率 |
|------|------|----------|
| P0-TRACKING.md | 追踪 P0 运营计划进度 | 每日 |
| USER-FEEDBACK.md | 记录和分类用户反馈 | 实时 |
| TOKEN-MONITOR.md | 记录 Token 使用数据 | 每日 |
| SKILLHUB-CHECKLIST.md | SkillHub 后台检查步骤 | 每日 |
| SYSTEM-HEALTH-CHECK.md | 系统健康检查脚本 | 每日 2 次 |
| FAQ-TEMPLATES.md | 回复用户问题的标准模板 | 按需 |
| DAILY-REPORT-TEMPLATE.md | 生成每日运营报告 | 每日 |
| WEEKLY-REPORT-TEMPLATE.md | 生成每周运营报告 | 每周 |
| OPERATIONS-CHECKLIST.md | 周期性任务清单 | 每日参考 |

---

## 🚀 快速开始

### 新成员上手
1. 阅读 `P0-TRACKING.md` 了解当前计划
2. 阅读 `OPERATIONS-CHECKLIST.md` 了解日常任务
3. 使用 `FAQ-TEMPLATES.md` 回复用户问题

### 每日工作流程
1. 09:00 - 按 `SKILLHUB-CHECKLIST.md` 检查后台
2. 按 `SYSTEM-HEALTH-CHECK.md` 检查系统
3. 记录数据到 `TOKEN-MONITOR.md`
4. 更新 `P0-TRACKING.md` 进度
5. 18:00 - 重复检查并生成日报

### 处理用户反馈
1. 查看 `USER-FEEDBACK.md` 了解反馈分类
2. 使用 `FAQ-TEMPLATES.md` 标准回复
3. 记录反馈到 `USER-FEEDBACK.md`
4. 严重问题升级到开发团队

---

## 📊 数据流向

```
SkillHub 后台 → SKILLHUB-CHECKLIST.md → TOKEN-MONITOR.md
     ↓
用户评论 → USER-FEEDBACK.md → FAQ-TEMPLATES.md → 回复
     ↓
系统状态 → SYSTEM-HEALTH-CHECK.md → P0-TRACKING.md
     ↓
每日汇总 → DAILY-REPORT-TEMPLATE.md → reports/
     ↓
每周汇总 → WEEKLY-REPORT-TEMPLATE.md → reports/
```

---

## 📁 报告存储

```
reports/
├── daily/
│   ├── 2026-04-06.md
│   └── ...
└── weekly/
    ├── 2026-W15.md
    └── ...
```

---

## 🔗 相关文档

- 项目主文档：`../README.md`
- 系统架构：`../docs/architecture.md`
- API 参考：`../docs/api-reference.md`
- 故障排除：`../docs/troubleshooting.md`

---

## 📞 联系方式

- **开发团队：** 通过 SkillHub 评论区或私信
- **紧急问题：** 查看 `P0-TRACKING.md` 中的联系方式

---

**创建时间：** 2026-04-06
**维护人：** 开发团队
**版本：** v1.0
