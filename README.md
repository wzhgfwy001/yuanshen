# 元神 (YangShen)

**AI协作伙伴 - 混合动态多Agent系统**

> **核心价值：** 不是固化的工作流，而是"根据你的场景，快速搭建你能跑起来的工作流"

---

## 核心架构

元神是由**阳神**（动态多Agent协作）和**阴神**（记忆管理系统）组成的AI协作系统，运行在OpenClaw之上。

```
┌─────────────────────────────────────────────────────────────┐
│                         元神系统 (YangShen)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐          ┌─────────────────┐        │
│  │     阳神系统     │  ←────→  │     阴神系统     │        │
│  │  (动态/执行层)   │          │  (静态/记忆层)   │        │
│  └─────────────────┘          └─────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 阳神系统 (YangShen)

**职责：** 思考、决策、指挥行动

**核心能力：**
- 动态创建临时子Agent团队（1-6个）
- 任务智能分类（L0-L4复杂度）
- 自动分解复杂任务
- 三级质量审查机制
- Skill自动进化（3次成功触发固化）

### 阴神系统 (YinShen)

**职责：** 记忆、存储、检索信息

**核心能力：**
- L1/L2/L3分层记忆管理
- WAL Protocol状态写入
- 错误记录与恢复学习
- 知识图谱构建

---

## 技术架构（DeerFlow借鉴）

基于DeerFlow架构的核心模式：

```
┌─────────────────────────────────────────────────────────────┐
│                    MiddlewarePipeline                        │
│         before() → execute() → after()                      │
├─────────────────────────────────────────────────────────────┤
│                     EventEmitter                             │
│              emit() → on() → off()                           │
├─────────────────────────────────────────────────────────────┤
│                  Structured State                           │
│           Result Classes / Dataclass                         │
├─────────────────────────────────────────────────────────────┤
│                   多级缓存机制                                │
│            Memory → Cache → Status                           │
└─────────────────────────────────────────────────────────────┘
```

**核心改进：**
- MiddlewarePipeline (before/after hooks)
- EventEmitter/TaskEmitter (事件驱动)
- Structured State (类型安全的结果类)
- Multi-level caching (多级缓存)
- Async/Await (异步非阻塞)
- Input validation middleware (输入验证)

---

## 核心模块（37个）

### 执行层（5个）
| 模块 | 功能 |
|------|------|
| `subagent-manager` | 子Agent生命周期管理 |
| `executor-coordinator` | 执行协调、并行/串行调度 |
| `batch-processor` | 批量任务处理 |
| `progressive-processor` | 渐进式处理大任务 |
| `sandbox` | 隔离执行环境 |

### 任务分析（5个）
| 模块 | 功能 |
|------|------|
| `task-classifier` | 任务类型分类（L0-L4复杂度） |
| `task-decomposer` | 任务分解为子任务 |
| `diagnosis` | 系统诊断、问题定位 |
| `budget-controller` | 资源预算控制 |
| `refinement-analyzer` | 改进分析 |

### 记忆与缓存（6个）
| 模块 | 功能 |
|------|------|
| `memory-manager` | 记忆管道、合并、持久化 |
| `result-cache` | 结果缓存（LRU+Async+Tags） |
| `shared-memory` | 共享内存管理 |
| `brain` | 脑记忆系统接口 |
| `cache` | 通用缓存 |
| `result-reuse` | 结果复用 |

### 技能与集成（5个）
| 模块 | 功能 |
|------|------|
| `skill-integrator` | 技能触发检测、动态集成 |
| `auto-skill-creator` | 自动创建Skill |
| `skill-evolution` | Skill进化追踪 |
| `skills-system` | 技能系统核心 |
| `fusion-scheduler` | 融合调度（人格+角色装备） |

### 质量保证（4个）
| 模块 | 功能 |
|------|------|
| `quality-checker` | 三层质量审查 |
| `verification` | 验证管道、重试机制 |
| `error-handler` | 错误分类、处理 |
| `smart-retry` | 智能重试策略 |

### 监控与观测（5个）
| 模块 | 功能 |
|------|------|
| `monitoring` | 实时监控 |
| `visual-monitor` | 可视化监控 |
| `multi-task-queue` | 多任务队列状态 |
| `category-validation-tracker` | 分类验证追踪 |
| `user-feedback` | 用户反馈收集 |

### 外部集成（7个）
| 模块 | 功能 |
|------|------|
| `agency-registry` | 193个Agent注册表 |
| `agency-hq-integration` | Agency总部集成 |
| `model-selector` | 模型选择路由 |
| `mcp-protocol` | MCP协议支持 |
| `browser` | 浏览器自动化 |
| `api` | API接口 |
| `resource-cleaner` | 资源清理 |

---

## 运行逻辑

### 任务分类规则

| 等级 | 判断标准 | Agent数量 | 处理方式 |
|------|----------|-----------|----------|
| **L0 简单** | 单维度，无需协作 | 0-1 | 主Agent直接执行 |
| **L1 标准** | 有对应Skill，≥3次验证 | 1-2 | 加载固化Skill |
| **L2 增强** | 标准+特殊处理 | 2-3 | Skill+定制环节 |
| **L3 复杂** | 多维度，新流程 | 4-6 | 动态组建团队 |
| **L4 创新** | 完全新领域 | 6+ | 多团队协作 |

### 执行流程

```
用户输入任务
     ↓
┌───────────────┐
│  1. 任务分类  │ → 判断任务类型（L0-L4）
└───────┬───────┘
        ↓
┌───────────────┐
│  2. 任务分解  │ → 拆分为子任务
└───────┬───────┘
        ↓
┌───────────────┐
│  3. 队伍组建  │ → 根据复杂度分配Agent
└───────┬───────┘
        ↓
    ┌───┴───┐
    ↓       ↓
并行执行   串行执行
    ↓       ↓
┌───────────────┐
│  4. 质量审查  │ → 三层质检
└───────┬───────┘
        ↓
     最终结果
```

---

## 支持任务类型

| 类别 | 示例 |
|------|------|
| **创意写作** | 小说、剧本、系列文章 |
| **数据分析** | Excel/CSV/Word/PDF分析报告 |
| **项目开发** | 需求→设计→编码→测试全流程 |
| **研究调研** | 多来源信息整合 |
| **方案设计** | 商业计划、运营方案 |

---

## 目录结构

```
yuanshen/
├── README.md              # 本文件
├── AGENTS.md              # 工作区规则与协议
├── SOUL.md                # 核心人格与交互原则
├── IDENTITY.md            # 元神身份定义
├── USER.md                # 用户信息与偏好
├── TOOLS.md               # 本地工具配置
├── MEMORY.md              # 长期记忆
│
├── brain/                 # 阴神记忆系统
│   ├── progress.json      # 统一状态文件(v7)
│   ├── inbox.md           # 待处理事项
│   ├── decisions/         # 决策记录
│   ├── patterns/          # 成功模式
│   ├── lessons/           # 失败教训
│   ├── knowledge_graph/   # 知识图谱
│   ├── agents/            # 人格Agent(女娲体系)
│   ├── projects/          # 项目管理
│   └── standing-orders/   # 持久化指令
│
├── skills/                # 阳神技能系统
│   ├── dynamic-multi-agent-system/  # 混合多Agent系统(v1.9.7)
│   │   ├── SKILL.md       # 系统主文档
│   │   ├── core/          # 37个核心模块
│   │   ├── docs/          # 文档
│   │   └── examples/      # 示例
│   │
│   ├── skills-evolution/  # Skills进化追踪
│   ├── user-profile/      # 用户画像
│   ├── agency-agents/     # 193个AI专家角色
│   ├── auto-router/       # 自动路由
│   ├── code-review/       # 代码审查
│   ├── data-analysis/     # 数据分析
│   ├── content-collector/ # 内容采集
│   ├── content-publisher/  # 内容发布
│   ├── writing-blog/      # 博客写作
│   ├── xiaohongshu-editor/ # 小红书编辑
│   ├── research-assistant/  # 研究助手
│   ├── project-planner/   # 项目规划
│   ├── text-to-ppt/       # PPT生成
│   ├── visualization-creator/ # 可视化
│   ├── nuwa/              # 女娲造人
│   ├── taskflow/          # 任务流
│   ├── taskflow-inbox-triage/ # 收件箱分流
│   └── healthcheck/        # 健康检查
│
├── memory/                # 每日记忆日志
│   └── YYYY-MM-DD.md      # 日期日志
│
├── learnings/             # 错误追踪系统
│   ├── errors.json        # 错误记录
│   └── recoveries.json    # 恢复记录
│
├── scripts/               # 阳神脚本库
│   └── yangshen/          # 阳神核心模块
│
├── storyflow/             # StoryFlow可视化工作流系统
│   ├── src/               # 源代码
│   ├── tests/             # 测试
│   └── web/               # 前端
│
├── novel-generator/       # 小说生成器
│
├── archive/               # 历史存档
│
└── projects/              # 项目目录
```

---

## 核心协议

### WAL Protocol (Write-Ahead-Log)

```bash
用户纠正/决定 → 先写 SESSION-STATE.md → 再响应
STOP → WRITE → RESPOND
```

### Compact Recovery Protocol

Compact后必须读取：
1. `brain/progress.json`
2. `memory/YYYY-MM-DD.md`
3. `SESSION-STATE.md`

### 重要任务立即记录规则

```
任务完成 → 立即写 memory/YYYY-MM-DD.md → 再报告用户
```

---

## 配置

### 模型配置

| 模型 | 用途 | 配额 |
|------|------|------|
| MiniMax-M2.7 | 文本生成 | 1500次/5小时 |
| image-01 | 图像生成 | 50次/日 |
| speech-2.8-hd | TTS | 4000次/日 |
| music-2.6 | 音乐生成 | 100次/日 |

### 心跳监控（每30分钟）

| 优先级 | 检查项 |
|--------|--------|
| 1 | WAL处理 |
| 2 | Working Buffer监控 |
| 3 | 记忆更新 |
| 4 | 系统状态 |
| 5 | 健康监控增强 |
| 6 | 追踪机制有效性 |

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.9.7 | 2026-04-22 | DeerFlow架构优化（15个模块） |
| v1.3.1 | 2026-04-17 | Agent工厂+人格设定+P0优化 |
| v1.2.0 | 2026-04-06 | SkillHub上架 |
| v1.0.0 | 2026-04-03 | 项目启动 |

---

**当前版本：** v1.9.7
**状态：** 活跃开发中 🚀
**GitHub：** https://github.com/wzhgfwy001/yuanshen

---

*元神 - 让AI成为真正的协作伙伴*
