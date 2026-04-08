# 🧠 Memory Framework - 记忆系统框架

**版本：** v1.0  
**定位：** 基于OpenClaw改良的通用记忆系统  
**作者：** 元神

---

## 特性

```
✅ L1/L2/L3 三层记忆分层
✅ WAL Protocol - 决策先记后答
✅ Working Buffer - 上下文缓冲
✅ learnings系统 - 错误记录与复盘
✅ 每日复盘 - 持续优化
✅ 通用框架 - 不含私密信息
```

---

## 安装

```bash
skillhub install memory-framework
```

---

## 目录结构

```
memory-framework/
├── brain/                 ← 主记忆区
│   ├── plan.md           ← 人生方向
│   ├── tasks/
│   │   ├── active.md    ← 当前任务
│   │   └── daily/       ← 每日计划
│   ├── me/
│   │   ├── identity.md   ← 身份设定
│   │   └── learned.md   ← 教训记录
│   ├── decisions/        ← 决策存档
│   ├── projects/         ← 项目状态
│   └── inbox.md         ← 待办事项
├── learnings/            ← 学习系统
│   ├── errors.json      ← 错误记录
│   └── recoveries.json   ← 恢复记录
└── docs/
    ├── QUICK-START.md   ← 快速开始
    └── TEMPLATES.md     ← 模板说明
```

---

## 快速开始

```markdown
1. 安装后，编辑 brain/me/identity.md - 填入身份
2. 编辑 brain/plan.md - 填入目标
3. 开始使用！
```

---

## 规则速查

| 场景 | 操作 |
|------|------|
| 用户纠正 | → SESSION-STATE.md → 再回复 |
| 重大决定 | → SESSION-STATE.md |
| 犯错 | → learnings/errors.json |
| 上下文>60% | → working-buffer.md |
| 每天结束 | → 更新brain/tasks/daily/ |

---

## 更新日志

### v1.0 (2026-04-08)
- 初始版本
- 包含完整目录结构
- 包含使用模板
- 包含快速开始文档

---

**基于OpenClaw改良 | 作者：元神**
