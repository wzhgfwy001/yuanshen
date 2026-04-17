# OpenClaw 使用说明书

**版本：** 2026.4.10  
**更新时间：** 2026-04-11  
**AI助手：** 元神（阳神系统驱动）

---

## 目录

1. [什么是OpenClaw](#1-什么是openclaw)
2. [系统架构图](#2-系统架构图)
3. [核心模块详解](#3-核心模块详解)
4. [运行逻辑](#4-运行逻辑)
5. [我是什么](#5-我是什么)
6. [模块协同工作流程](#6-模块协同工作流程)
7. [常用命令](#7-常用命令)
8. [故障排查](#8-故障排查)

---

## 1. 什么是OpenClaw

**OpenClaw** 是一个**自托管的AI网关**，连接你的聊天应用和AI助手。

```
聊天应用（微信/QQ/Discord/等）
        ↓
   OpenClaw 网关 ← 你控制的服务器/电脑
        ↓
   AI助手（我：元神）
```

### 核心特点

| 特点 | 说明 |
|------|------|
| **自托管** | 运行在你自己的硬件上，数据不外泄 |
| **多通道** | 同时支持多个聊天平台 |
| **多Agent** | 支持多个AI助手协同工作 |
| **插件生态** | 丰富的技能（Skills）扩展 |

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenClaw 网关 (Gateway)                  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ WebChat  │  │ Discord  │  │ Telegram │  │  Signal  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │           │
│       └─────────────┴──────┬──────┴─────────────┘           │
│                            │                                 │
│                     ┌──────▼──────┐                         │
│                     │   会话管理   │                         │
│                     │  (Sessions) │                         │
│                     └──────┬──────┘                         │
│                            │                                 │
│       ┌───────────────────┼───────────────────┐             │
│       │                   │                   │             │
│  ┌────▼────┐        ┌────▼────┐        ┌────▼────┐        │
│  │ Agent   │        │ Agent   │        │ Agent   │        │
│  │ main    │        │ sub-1   │        │ sub-2   │        │
│  │ (主Agent)│        │(子Agent)│        │(子Agent)│        │
│  └────┬────┘        └────┬────┘        └────┬────┘        │
│       │                   │                   │             │
│       │   ┌───────────────┴───────────────┐  │             │
│       │   │                               │  │             │
│  ┌────▼───▼────┐                  ┌──────▼───▼────┐        │
│  │   Skills    │                  │    Memory     │        │
│  │  (技能系统)  │                  │   (记忆系统)   │        │
│  └─────────────┘                  └───────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   工具层 (Tools)                     │   │
│  │  read / write / exec / browser / pdf / image ...     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │     模型层        │
                    │  MiniMax M2.7    │
                    │  DeepSeek       │
                    │  Qwen3.5-Plus   │
                    └──────────────────┘
```

---

## 3. 核心模块详解

### 3.1 Gateway（网关）

**职责：** 
- 管理所有会话和路由
- 连接各个聊天通道
- 处理消息分发

**配置：** `~/.openclaw/openclaw.json`

### 3.2 Agents（Agent管理）

| Agent ID | 模型 | 用途 |
|----------|------|------|
| main | MiniMax-M2.7 | 主AI助手（元神） |
| subagent-* | MiniMax-M2.7 | 临时子Agent |

**并发配置：**
- 主Agent最多4个并发
- 子Agent最多8个并发

### 3.3 Models（模型层）

| 提供商 | 模型 | 用途 |
|--------|------|------|
| minimax | MiniMax-M2.7 | 主模型 |
| deepseek | deepseek-chat | 备选 |
| modelstudio | qwen3.5-plus | 备选 |

### 3.4 Memory（记忆系统）

**两个记忆系统：**

| 系统 | 位置 | 用途 | 触发方式 |
|------|------|------|----------|
| Active Memory | .openclaw/memory | 每次回复前自动搜索 | 自动 |
| 阳神Brain | workspace/brain | 长期深层记忆 | 启动时加载 |

**Brain目录结构：**

```
brain/
├── plan.md        # 人生方向/目标
├── inbox.md        # 待办事项
├── tasks/
│   └── active.md   # 当前任务
├── decisions/      # 决策存档
└── me/
    ├── identity.md # 身份设定
    └── learned.md  # 学习教训
```

### 3.5 Skills（技能系统）

**当前技能（10个）：**

| 技能 | 用途 |
|------|------|
| dynamic-multi-agent-system | 阳神核心（多Agent协作） |
| code-review | 代码审查 |
| writing-blog | 博客写作 |
| data-analysis | 数据分析 |
| research-assistant | 研究助手 |
| project-planner | 项目规划 |
| visualization-creator | 可视化创建 |
| content-collector | 内容采集 |
| xiaohongshu-editor | 小红书编辑 |
| content-publisher | 内容发布 |

**内置Skills：**

| 技能 | 用途 |
|------|------|
| skill-creator | 创建/优化技能 |
| clawflow | 多步骤工作流 |
| healthcheck | 健康检查 |

### 3.6 Plugins（插件）

| 插件 | 状态 | 用途 |
|------|------|------|
| browser | ✅ | 浏览器控制 |
| minimax | ✅ | Minimax API |
| active-memory | ✅ | 主动记忆 |
| memory-core | ✅ | 记忆核心 |

---

## 4. 运行逻辑

### 4.1 消息处理流程

```
用户发送消息
    ↓
Gateway接收（识别通道+会话）
    ↓
会话管理（查找/创建会话）
    ↓
Active Memory（自动搜索记忆）
    ↓
主Agent处理（MiniMax M2.7）
    ↓
Skills检测（是否触发技能）
    ↓
工具调用（read/write/exec等）
    ↓
子Agent处理（如需要）
    ↓
主Agent整合结果
    ↓
返回给用户
```

### 4.2 子Agent创建流程

```
主Agent判断：任务复杂，需要子Agent
    ↓
向Gateway请求创建子Agent
    ↓
Gateway分配资源
    ↓
子Agent启动（独立会话）
    ↓
子Agent执行任务
    ↓
结果返回主Agent
    ↓
主Agent整合并返回用户
    ↓
子Agent自动销毁
```

---

## 5. 我是什么

### 5.1 我的身份

| 属性 | 值 |
|------|-----|
| **名字** | 元神 |
| **核心引擎** | 阳神（YangShen） |
| **运行平台** | OpenClaw |
| **主模型** | MiniMax-M2.7 |

### 5.2 我的架构

```
元神（主Agent）
    │
    ├── 阳神系统（Skills/dynamic-multi-agent-system/）
    │   ├── 任务分类器
    │   ├── 任务分解器
    │   ├── 子Agent管理器
    │   ├── 质量检查器
    │   └── 技能进化器
    │
    ├── 10个用户技能
    │
    └── Brain记忆系统
        ├── plan.md（人生方向）
        ├── identity.md（身份）
        ├── tasks/active.md（任务）
        └── learnings/（经验教训）
```

### 5.3 我能做什么

| 能力 | 说明 |
|------|------|
| **多Agent协作** | 动态创建子Agent团队并行处理任务 |
| **记忆管理** | L1/L2/L3分层记忆系统 |
| **技能扩展** | 随时加载新技能 |
| **工具调用** | 文件/代码/浏览器等 |
| **工作流** | 多步骤复杂任务处理 |

---

## 6. 模块协同工作流程

### 6.1 简单任务

```
用户 → "北京天气如何？"
    ↓
主Agent接收
    ↓
Skills检测 → weather skill
    ↓
返回结果 → 用户
```

### 6.2 复杂任务（阳神系统）

```
用户 → "帮我写5篇小红书"
    ↓
阳神系统启动
    │   ↓
    ├── 任务分类器 → 创新任务
    ├── 任务分解器 → 分解为5个子任务
    └── 子Agent管理器 → 创建5个子Agent
           ↓
    子Agent-1 → 写第1篇
    子Agent-2 → 写第2篇
    子Agent-3 → 写第3篇
    子Agent-4 → 写第4篇
    子Agent-5 → 写第5篇
           ↓
    质量检查器 → 检查结果
           ↓
    主Agent整合 → 返回用户
```

---

## 7. 常用命令

### Gateway命令

| 命令 | 用途 |
|------|------|
| `openclaw gateway start` | 启动网关 |
| `openclaw gateway stop` | 停止网关 |
| `openclaw gateway restart` | 重启网关 |
| `openclaw status` | 查看状态 |

### 会话命令

| 命令 | 用途 |
|------|------|
| `/verbose on` | 开启调试信息 |
| `/active-memory on` | 开启主动记忆 |
| `/active-memory off` | 关闭主动记忆 |
| `/status` | 查看当前状态 |

---

## 8. 故障排查

### Gateway无法启动

**问题：** EBUSY: resource busy

**解决：**
```bash
openclaw gateway stop
openclaw gateway start
```

### 模型不可用

1. 检查API配置
2. 等待网络恢复
3. 使用备选模型

### Active Memory不工作

1. `/active-memory status` 查看状态
2. `/verbose on` 查看调试信息

---

## 附录：关键目录

| 目录 | 用途 |
|------|------|
| ~/.openclaw/ | 用户配置根目录 |
| ~/.openclaw/openclaw.json | 主配置 |
| ~/.openclaw/brain/ | Brain记忆 |
| ~/.openclaw/memory/ | Active Memory |
| ~/.openclaw/workspace/skills/ | 用户Skills |
| ~/.openclaw/logs/ | 日志 |

---

**文档：** https://docs.openclaw.ai/
