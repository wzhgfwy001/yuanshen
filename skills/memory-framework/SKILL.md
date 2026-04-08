# Memory Framework - 记忆系统框架

**版本：** v1.0  
**定位：** 通用记忆系统框架，基于OpenClaw改良  
**适用：** 个人AI助手、团队协作、知识管理

---

## 核心特性

```
1. L1/L2/L3 三层记忆分层
2. WAL Protocol - 决策先记后答
3. Working Buffer - 上下文缓冲
4. learnings系统 - 错误记录与复盘
5. 每日复盘 - 持续优化
```

---

## 目录结构

```
memory-framework/
├── README.md              ← 使用说明
├── brain/                 ← 主记忆区
│   ├── plan.md           ← 人生方向（模板）
│   ├── tasks/
│   │   ├── active.md    ← 当前任务（模板）
│   │   └── daily/        ← 每日计划
│   ├── me/
│   │   ├── identity.md   ← 身份设定（模板）
│   │   └── learned.md    ← 教训记录（模板）
│   ├── decisions/        ← 决策存档
│   ├── projects/         ← 项目状态
│   └── inbox.md          ← 待办事项
├── learnings/            ← 学习系统
│   ├── errors.json      ← 错误记录
│   └── recoveries.json   ← 恢复记录
└── docs/
    ├── QUICK-START.md    ← 快速开始
    └── TEMPLATES.md      ← 模板说明
```

---

## 快速开始

### 1. 安装

```
skillhub install memory-framework
```

### 2. 初始化

```
1. 编辑 brain/me/identity.md - 填入你的身份
2. 编辑 brain/plan.md - 填入你的目标
3. 编辑 brain/tasks/active.md - 填入当前任务
```

### 3. 使用

```
每次对话开始：
- 读取brain/plan.md（今日方向）
- 读取brain/tasks/daily/（今日任务）
- 检查SESSION-STATE.md（WAL触发）

重要决定/纠正：
- 先写SESSION-STATE.md
- 再回复用户

错误发生：
- 写learnings/errors.json
- 复盘写brain/me/learned.md
```

---

## 规则速查

| 场景 | 操作 |
|------|------|
| 用户纠正"不是X，是Y" | → SESSION-STATE.md |
| 重大决定 | → SESSION-STATE.md |
| 犯错 | → learnings/errors.json + learned.md |
| 上下文>60% | → 启用working-buffer.md |
| 每天结束 | → 更新brain/tasks/daily/ |
| 每周结束 | → 更新MEMORY.md |

---

## 版本

- v1.0 - 初始版本

---

**基于OpenClaw改良**
