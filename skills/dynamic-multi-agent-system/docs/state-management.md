# 状态管理

## 概述

混合动态多 Agent 系统使用独立 JSON 文件存储状态，避免污染主记忆（MEMORY.md）。

---

## 状态文件位置

```
skills/dynamic-multi-agent-system/state/
├── skill-counters.json      # Skill 使用计数
├── experience-db.json       # 经验数据库
└── execution-logs/          # 执行日志（可选）
    ├── 2026-04-03-task-001.json
    └── 2026-04-04-task-002.json
```

---

## skill-counters.json

记录每个 Skill 的使用次数，用于判断是否达到固化阈值（3 次）。

### 结构

```json
{
  "last-updated": "2026-04-04T05:00:00+08:00",
  "skills": {
    "sci-fi-creation": {
      "count": 5,
      "last-used": "2026-04-03T22:30:00+08:00",
      "success-rate": 0.92,
      "固化": true
    },
    "mystery-creation": {
      "count": 2,
      "last-used": "2026-04-04T01:15:00+08:00",
      "success-rate": 1.0,
      "固化": false
    },
    "data-analysis": {
      "count": 8,
      "last-used": "2026-04-02T14:20:00+08:00",
      "success-rate": 0.88,
      "固化": true
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| count | number | 使用次数 |
| last-used | ISO8601 | 最后使用时间 |
| success-rate | number | 成功率（0-1） |
| 固化 | boolean | 是否已固化为 Skill |

### 更新规则

- **每次任务完成后立即写入**，避免数据丢失
- 成功率 = 成功次数 / 总次数
- 成功率 ≥ 0.8 且 count ≥ 3 → 建议固化

---

## experience-db.json

记录成功任务的执行流程，用于 Skill 固化和经验复用。

### 结构

```json
{
  "last-updated": "2026-04-04T05:00:00+08:00",
  "experiences": [
    {
      "id": "exp-20260403-001",
      "task-type": "创新任务",
      "description": "科幻小说创作：2077 年的北京",
      "flow": [
        {
          "step": 1,
          "agent-role": "科幻设定专家",
          "prompt-template": "设计一个 2077 年北京的科幻世界观...",
          "output-summary": "完成世界观设定，包括科技水平、社会结构...",
          "duration-seconds": 45
        },
        {
          "step": 2,
          "agent-role": "大纲设计专家",
          "prompt-template": "基于以下世界观，设计 10 章小说大纲...",
          "output-summary": "完成 10 章大纲，每章包含核心冲突...",
          "duration-seconds": 38
        },
        {
          "step": 3,
          "agent-role": "小说写作专家",
          "prompt-template": "根据大纲撰写小说内容...",
          "output-summary": "完成 10 章内容，总计 10000 字",
          "duration-seconds": 180
        },
        {
          "step": 4,
          "agent-role": "审查 Agent",
          "prompt-template": "审查小说的逻辑一致性、科学性...",
          "output-summary": "通过审查，提出 3 处修改建议",
          "duration-seconds": 25
        }
      ],
      "result": "success",
      "user-feedback": "满意",
      "timestamp": "2026-04-03T22:30:00+08:00",
      "固化-candidate": true
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 经验唯一标识 |
| task-type | string | 任务类型 |
| description | string | 任务描述 |
| flow | array | 执行流程（Agent 序列） |
| result | string | 结果（success/failed） |
| user-feedback | string | 用户反馈 |
| 固化-candidate | boolean | 是否候选固化 |

---

## execution-logs/

可选的详细执行日志，用于调试和分析。

### 日志文件命名

```
{date}-{task-id}.json
示例：2026-04-03-task-001.json
```

### 日志内容

```json
{
  "task-id": "task-001",
  "start-time": "2026-04-03T22:00:00+08:00",
  "end-time": "2026-04-03T22:35:00+08:00",
  "duration-seconds": 2100,
  "phases": [
    {
      "phase": "任务分类",
      "start": "22:00:00",
      "end": "22:00:05",
      "result": "创新任务",
      "confidence": 0.92
    },
    {
      "phase": "任务分解",
      "start": "22:00:05",
      "end": "22:00:15",
      "sub-tasks": 4,
      "dependency-graph": {...}
    },
    {
      "phase": "子 Agent 执行",
      "start": "22:00:15",
      "end": "22:34:30",
      "agents": [
        {"role": "科幻设定专家", "status": "success", "duration": 45},
        {"role": "大纲设计专家", "status": "success", "duration": 38},
        {"role": "小说写作专家", "status": "success", "duration": 180},
        {"role": "审查 Agent", "status": "success", "duration": 25}
      ]
    },
    {
      "phase": "质量检查",
      "start": "22:34:30",
      "end": "22:35:00",
      "result": "pass",
      "issues": []
    }
  ],
  "final-output": "交付给用户的内容...",
  "resource-usage": {
    "model-calls": 15,
    "token-usage": 45000,
    "sub-agents-created": 4
  }
}
```

---

## 状态更新时机

| 事件 | 更新文件 | 时机 |
|------|----------|------|
| 任务开始 | execution-logs | 立即创建日志文件 |
| 子 Agent 完成 | execution-logs | 实时更新 |
| 任务完成 | skill-counters | 立即写入 |
| 任务完成 | experience-db | 成功后写入 |
| 任务完成 | execution-logs | 写入最终状态 |

---

## 数据清理策略

### 自动清理

- **执行日志**：保留最近 30 天
- **经验数据库**：永久保留（除非用户手动删除）
- **计数器**：永久保留

### 手动清理

使用资源清理器：

```
命令：清理 30 天前的执行日志
```

---

## 并发安全

- 所有状态文件更新使用**原子写入**（先写临时文件，再替换）
- 多任务并行时，每个任务使用独立日志文件
- 计数器更新使用锁机制（避免并发写入冲突）

---

## 备份建议

建议定期备份 `state/` 目录：

```bash
# 每周备份
cp -r state/ state-backup-$(date +%Y%m%d)/
```

或推送到 Git 远程仓库。
