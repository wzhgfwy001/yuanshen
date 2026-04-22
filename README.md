# 元神 (YangShen)

**AI协作伙伴 - 动态多Agent系统**

---

## 核心架构

元神是由**阳神**（动态多Agent协作）和**阴神**（记忆管理系统）组成的AI协作系统，运行在OpenClaw之上。

```
元神 = 阳神 + 阴神
       ↓       ↓
    阳神     阴神
   (动态)   (静态)
```

| 系统 | 职责 | 特点 |
|------|------|------|
| **阳神** | 思考、决策、指挥行动 | 动态、主动、任务执行 |
| **阴神** | 记忆、存储、检索信息 | 静态、被动、信息管理 |

---

## 核心能力

- 🧠 **阳神系统** - 混合动态多Agent协作核心
- 🌙 **阴神系统** - 记忆与信息管理系统
- 📊 数据分析
- 💻 代码开发
- 📝 文档撰写
- 🔍 研究探索
- ⚡ 自动化任务

---

## 目录结构

```
yuanshen/
├── AGENTS.md              # 工作区规则与协议
├── SOUL.md                # 核心人格与交互原则
├── IDENTITY.md            # 元神身份定义
├── USER.md                # 用户信息与偏好
├── HEARTBEAT.md           # 心跳监控系统
├── MEMORY.md              # 长期记忆
├── BRAIN/                 # 阴神记忆系统
│   ├── progress.json      # 统一状态文件
│   ├── inbox.md           # 待处理事项
│   ├── decisions/         # 决策记录
│   ├── patterns/          # 成功模式
│   ├── lessons/           # 失败教训
│   └── knowledge_graph/   # 知识图谱
├── SKILLS/                # 阳神技能系统
│   ├── dynamic-multi-agent-system/  # 混合多Agent系统
│   ├── skills-evolution/            # Skills进化追踪
│   ├── user-profile/               # 用户画像
│   └── agency-agents/              # 193个AI专家角色
├── LEARNINGS/             # 错误追踪系统
│   ├── errors.json        # 错误记录
│   └── recoveries.json    # 恢复记录
└── HEARTBEAT.md          # 心跳检查清单

```

---

## 核心系统

### 阳神系统 (动态多Agent)

**功能：** 动态创建、管理多个子Agent协同工作

**核心模块：**
- `skills/dynamic-multi-agent-system/` - 多Agent协作框架
- `skills/skills-evolution/` - Skill进化固化追踪
- `skills/user-profile/` - 用户画像自动提取
- `skills/agency-agents/` - 193个专业Agent角色

**子Agent命名：** 从《火影忍者》《死神》《海贼王》《银魂》中选择

### 阴神系统 (记忆管理)

**功能：** 长期记忆存储、上下文保持、经验沉淀

**核心模块：**
- `brain/progress.json` - 统一状态文件
- `brain/inbox.md` - 待处理事项（≤7条）
- `brain/decisions/` - 决策归档
- `brain/patterns/` - 成功模式（7个）
- `brain/lessons/` - 失败教训（6个）
- `brain/knowledge_graph/` - 知识图谱

---

## 核心协议

### WAL Protocol (Write-Ahead-Log)

用户纠正/决定 → 先写 `SESSION-STATE.md` → 再响应

```
STOP → WRITE → RESPOND
```

### Compact Recovery Protocol

Compact后必须读取：
1. `brain/progress.json`
2. `memory/YYYY-MM-DD.md`
3. `SESSION-STATE.md`

### 重要任务立即记录规则

任务完成 → 立即写 `memory/YYYY-MM-DD.md` → 再报告用户

---

## 配置

### 模型配置

| 模型 | 用途 | 配额 |
|------|------|------|
| MiniMax-M2.7 | 文本生成 | 1500次/5小时 |
| image-01 | 图像生成 | 50次/日 |
| speech-2.8-hd | TTS | 4000次/日 |

### 心跳监控

每30分钟自动检查：
1. WAL处理（重要）
2. Working Buffer监控
3. 记忆更新
4. 系统状态
5. 健康监控增强
6. 追踪机制有效性

---

## 版本信息

- **当前版本：** v1.9.7
- **最后更新：** 2026-04-22
- **状态：** 活跃开发中

---

*元神 - 让AI成为真正的协作伙伴*
