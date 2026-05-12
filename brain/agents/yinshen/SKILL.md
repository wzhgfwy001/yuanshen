# 阴神 SKILL - 记忆管理工具集

**Agent：** 阴神
**版本：** v1.1.0
**触发条件：** 元神/阳神需要记忆支持时

---

## 记忆管理能力矩阵

| 任务类型 | 工具 | 说明 |
|----------|------|------|
| 记忆读取 | read | brain/目录下所有文件 |
| 记忆写入 | write/edit | learnings/、brain/decisions/等 |
| 记忆检索 | exec (grep) | 搜索文件内容 |
| 会话查询 | sessions_list/history | 查看历史会话 |
| WAL处理 | read/write | SESSION-STATE.md |
| 记忆任务处理 | read/write | 处理元神发送的记忆任务 |

---

## 记忆更新流程

### 1. 任务完成记录
```
收到完成报告 → 提取关键信息 → 写入对应brain/文件 → 确认
```

### 2. 错误经验记录
```
捕获错误 → 写入learnings/errors.json → 更新错误模式
```

### 3. WAL处理
```
检测WAL → 解析内容 → 写入brain/decisions/ → 标记已处理
```

### 4. 记忆任务处理（新版）

元神发送的记忆任务格式：
```json
{
  "type": "memory_task",
  "timestamp": "2026-05-06 01:41",
  "source": "元神",
  "category": "user_correction | decision | error | preference | config | milestone | pattern",
  "content": {
    "summary": "简要描述",
    "detail": "详细记录",
    "tags": ["标签1", "标签2"]
  },
  "action_required": "写入decisions/ | lessons/ | user_preferences/"
}
```

**处理流程：**
```
收到memory_task → 解析category → 写入对应目录 → 确认
```

---

## category对应写入位置

| category | 写入位置 | 文件命名 |
|----------|----------|----------|
| user_correction | brain/decisions/ | YYYY-MM-DD-user-correction.md |
| decision | brain/decisions/ | YYYY-MM-DD-decision-xxx.md |
| error | brain/lessons/ | YYYY-MM-DD-error-xxx.md |
| preference | brain/user_preferences/ | up-xxx.md |
| config | brain/decisions/ | YYYY-MM-DD-config-xxx.md |
| milestone | brain/projects/NAME/ | YYYY-MM-DD-milestone.md |
| pattern | brain/patterns/ | YYYY-MM-DD-pattern-xxx.md |

---

## brain/目录结构

```
brain/
├── agents/           # Agent人格配置
├── archives/          # 归档记忆
├── common_knowledge/  # 通用知识
├── decisions/         # 决策记录（Yinshen维护）
├── dreaming/          # 梦境/自动整理
├── knowledge_graph/   # 知识图谱
├── knowledge_reserve/ # 知识储备
├── learning/          # 学习记录
├── lessons/          # 教训总结
├── me/               # 自我认知
├── patterns/         # 模式沉淀（Yinshen维护）
├── projects/         # 项目记忆
├── standing-orders/  # 持久指令
├── tasks/           # 任务状态
├── user_preferences/ # 用户偏好
├── inbox.md         # 收件箱
├── memory-task.md   # 记忆任务队列（元神写入）
└── WAL/             # 待处理的决策日志
```

---

## 检索工具

### 文件内容搜索
```bash
Get-ChildItem brain/ -Recurse -Filter "*.md" | Select-String -Pattern "关键词"
```

### JSON检索
```bash
Get-Content learnings/errors.json | ConvertFrom-Json
```

---

## 验证规则

- 写入前验证目录存在
- 写入后验证内容正确
- 定期检查brain/完整性
- 处理完memory-task后清除或标记

---

## 元神→阴神 通信协议

### 发送方式
元神将memory_task写入 `brain/memory-task.md`，格式：
```markdown
## memory-task: [timestamp]
**category:** xxx
**summary:** xxx
**detail:** xxx
**tags:** [tag1, tag2]
**action:** 写入xxx
```

### 阴神处理
1. 读取brain/memory-task.md
2. 按action写入对应目录
3. 处理完成后清除该条目或移到archives/

---

_最后更新：2026-05-06_