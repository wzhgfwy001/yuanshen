# StoryFlow 项目完整开发历程

**创建时间：** 2026-04-21 03:25
**最后更新：** 2026-04-21 03:25
**项目分类：** AI小说创作工具

---

## 一、项目起源（2026-04-03~04-07）

### 1.1 混合动态多Agent系统的诞生

StoryFlow 起源于**混合动态多Agent系统**的开发，最初是 OpenClaw 的一个技能模块。

**时间线：**
- **2026-04-03/04**：混合多Agent系统开发启动
- **2026-04-04**：核心模块测试全部通过（任务分类器、质量检查器、执行协调器）
- **2026-04-04**：完成科幻短篇《清晨的豆汁儿》端到端测试（评分92分）
- **2026-04-07**：系统身份确定，命名为"**元神**"，核心目标：**财富自由**

### 1.2 原始定位
- 作为 OpenClaw 的一个多Agent协作技能
- 用于小说创作和复杂任务分解
- 目标：SkillHub 上架商业化

### 1.3 技术架构（初期）
```
任务分类器 → 任务分解器 → 执行协调器 → 质量检查器
     ↓
  子Agent团队（动态创建）
```

---

## 二、项目独立化（2026-04-08~04-10）

### 2.1 高考志愿系统并行开发

同期（2026-04-08~04-10）独立开发了**高考志愿小程序**：
- 云开发环境配置完成
- 本科21,425条 + 专科11,912条数据导入成功
- 筛选功能开发

### 2.2 阳神系统 v1.9.x 发布

**2026-04-10** 完成深度测试（42项测试全部通过）：
- 瓶颈诊断测试 8/8
- 任务分类测试 5/5
- 任务分解测试 5/5
- 质量检查测试 5/5
- 记忆系统测试 5/5

---

## 三、系统优化期（2026-04-11~04-17）

### 3.1 OpenClaw全面优化

**2026-04-07~04-11** 完成：
- 记忆系统 v2.0（brain/目录）
- Skills精简：55→5个
- 混合多Agent系统完善（30个角色）
- Context tokens、compaction 优化

### 3.2 Claude Code 源码泄露分析

**2026-04-12** 完成深度分析：
- 运行时：Bun + Zig编译
- UI：React + Ink（终端UI）
- 7种任务类型
- 40+工具系统
- 三层上下文压缩（MicroCompact → AutoCompact → Full Compact）
- **AutoDream四阶段**：记忆收集 → 压缩 → 整合 → 存储

### 3.3 Karpathy 源码学习

**2026-04-15** 学习 micrograd/minGPT/nanochat：
- KVCache（FA3风格）核心设计
- micrograd 自动微分
- minGPT Transformer 架构
- 推理优化思维

### 3.4 GitHub 仓库创建

**2026-04-17** 创建元神GitHub仓库：
- 仓库地址：https://github.com/wzhgfwy001/yuanshen
- 上传内容：core/, agency-registry/, skills-evolution/, brain/, state/, examples/
- 138个文件，24,805行代码

---

## 四、StoryFlow 觉醒（2026-04-18~04-19）

### 4.1 用户分享 StoryFlow_INKOS_v2.0.zip

**2026-04-19 晚上** 用户分享了完整版 StoryFlow：
- 文件：StoryFlow_INKOS_v2.0.zip
- 定位：桌面版完整功能

### 4.2 发现 v3.1 下载版

**2026-04-19 23:54** 发现用户下载的完整版本：
- 位置：`C:\Users\DELL\Downloads\StoryFlow_WebUI_v3.1\storyflow\webui`
- 版本：完整重写，React 18 + FastAPI + INKOS 5-Agent

### 4.3 v3.1 vs 早期版本对比

| 维度 | 早期版本 | v3.1 (下载版) |
|------|---------|-------------|
| 前端 | 原生HTML/JS | React 18 + TypeScript + Vite ✅ |
| 后端 | Flask | FastAPI + Uvicorn ✅ |
| 组件数 | 几个基础组件 | 28个Layout组件 ✅ |
| 节点类型 | 基础4种 | **完整5-Agent系统** ✅ |
| 审计节点 | ❌ 无 | ✅ AI Trace Detector |
| 修订节点 | ❌ 无 | ✅ Style Fingerprint |
| 真相文件 | ❌ 无 | ✅ 完整系统 |
| 工作流模板 | 基础 | ✅ INKOS 5-Agent |
| LoopEngine | ❌ 无 | ✅ 支持迭代 |
| Docker支持 | ❌ 无 | ✅ 有 |

### 4.4 用户选择的路径

**2026-04-19 23:59** v3.1 启动成功：
- 后端端口8000 (PID 6648)
- 前端端口5174 (PID 13548)
- 一键启动脚本 START.bat 已创建
- 完整功能已可用

---

## 五、INKOS 5-Agent 架构详解

### 5.1 工作流节点

```
Radar (雷达) → Architect (建筑师) → TruthFiles (真相文件) → Writer (写手) → Auditor (审计) → Reviser (修订)
```

| 节点 | 功能 | 输出 |
|------|------|------|
| **Radar** | 市场雷达，分析创作方向 | market_report |
| **Architect** | 架构师，制定章节大纲 | chapter_outline |
| **TruthFiles** | 真相文件，记录世界观设定 | truth_files |
| **Writer** | 写手，创作章节内容 | chapter |
| **Auditor** | 审计员，33维度质量审计 | audit_report |
| **Reviser** | 修订员，优化章节质量 | revised_chapter |

### 5.2 真相文件系统（7个真相文件）

| # | 真相文件 | 内容 |
|---|----------|------|
| 1 | 世界观设定 | 宇宙规则、修炼体系、社会结构 |
| 2 | 角色档案 | 人物外貌/性格/背景/关系 |
| 3 | 时间线 | 故事发生的时间顺序 |
| 4 | 势力关系 | 各大势力/组织/国家 |
| 5 | 伏笔追踪 | 已埋设的伏笔和回收计划 |
| 6 | 写作风格 | 目标风格/节奏/语气 |
| 7 | 约束规则 | 角色能力上限/禁止项 |

### 5.3 33维度审计

| 维度类别 | 维度数 | 说明 |
|----------|--------|------|
| 角色一致性 | 8 | 身形/脸部/穿着/性格全程一致 |
| 时间线 | 6 | 时间顺序/逻辑闭环 |
| 世界观 | 5 | 规则一致性 |
| 剧情 | 7 | 起承转合/高潮/结局 |
| 文笔 | 7 | 语法/标点/修辞/AI味检测 |

### 5.4 循环优化机制

```
Writer → Auditor → 有Critical问题？ → 是 → Reviser → Writer (再次)
                                    → 否 → 完成
```

退出条件：`critical_issues_count == 0` 或达到 `max_loops`

### 5.5 高级AI功能

| 功能 | 方法 | 说明 |
|------|------|------|
| 智能情节建议 | `AdvancedAI.suggest_plot()` | 根据当前情节建议3-5个发展方向 |
| 角色行为预测 | `AdvancedAI.predict_character_action()` | 预测角色在特定情境下的行为 |
| 冲突自动修复 | `AdvancedAI.auto_fix_conflict()` | 根据冲突类型自动修复 |
| 批量自动修复 | `AutoFixer.fix_all_critical_issues()` | 一键修复所有Critical问题 |

---

## 六、P0问题发现与修复（2026-04-20）

### 6.1 全面代码审查（4个子Agent）

| Agent | 问题数 | 严重 | 中等 | 轻微 |
|-------|--------|------|------|------|
| Frontend Expert | 23 | 7 | 7 | 9 |
| Backend Expert | 10 | 2 | 3 | 5 |
| System Architect | 11 | 4 | 4 | 3 |
| DevOps Engineer | 10 | 3 | 4 | 3 |
| **总计** | **54** | **16** | **18** | **20** |

### 6.2 已修复的9个P0问题

| # | 问题 | 修复内容 | 状态 |
|---|------|----------|------|
| P0-1 | Stop机制未连接 | stop_event.is_set()检查 + CancelledError处理 | ✅ |
| P0-2 | WebSocket地址5173→8000 | 前端WS URL修复 | ✅ |
| P0-3 | --reload双进程+无内存限制 | 移除--reload，添加2GB内存限制 | ✅ |
| P0-4 | nodeData流断裂 | 添加setNodeOutput + propagateData调用 | ✅ |
| P0-5 | fetch无超时保护 | 添加AbortController 30秒超时 | ✅ |
| P0-6 | handle ID中英文不匹配 | 全部改为英文，29条边添加sourceHandle/targetHandle | ✅ |
| P0-7 | IO_MAPPINGS错误 | 修正IO_MAPPINGS三处定义 | ✅ |
| P0-8 | /health端点不完善 | 完善健康检查端点 | ✅ |
| P0-9 | 端点404问题 | 验证并修复端点 | ✅ |

### 6.3 修复后的数据流

```
Radar (genre) → Architect (market_report)
    ↓
TruthFiles (chapter_outline)
    ↓
Writer (chapter_outline + truth_files) → Auditor (chapter) → Reviser (report + chapter)
```

---

## 七、未完成功能清单

### 7.1 承诺但未测试的功能

| 功能 | 组件 | 状态 |
|------|------|------|
| 灵感面板随机生成 | InspirationPanel.tsx | ❓ 未测试 |
| 风格切换(6种) | StylePanel.tsx | ❓ 未测试 |
| AI推荐节点 | AIRecommendation.tsx | ❓ 未测试 |
| 自定义节点创建 | CustomNodeEditor.tsx | ❓ 未测试 |
| 模板市场(10+模板) | TemplateMarketplace.tsx | ❓ 未测试 |
| 分支视图 | BranchView.tsx | ❓ 未测试 |
| 变量系统 | variablesStore.ts | ❓ 未测试 |
| 评论面板 | CommentPanel.tsx | ⚠️ 存在但未集成 |
| 批注系统 | NodeComments.tsx | ⚠️ 存在但未集成 |

### 7.2 "工作流配置不能为空" 错误

**问题描述：** 用户点击"执行"时提示"工作流配置不能为空"

**可能原因：**
1. API Key 未配置或配置未生效
2. 5-Agent模板未正确加载到前端
3. 前端发送的 workflow 数据结构与后端期望不匹配
4. 节点配置（config）为空或格式错误

### 7.3 剩余约45个问题未处理

| 优先级 | 问题数 | 建议 |
|--------|--------|------|
| P1 | ~20个 | 前后端联调、API Key配置流程、模板加载 |
| P2 | ~15个 | UI优化、性能优化 |
| P3 | ~10个 | 文档完善、高级功能集成 |

---

## 八、技术栈总结

### 8.1 后端技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | FastAPI + Uvicorn | - |
| Python | Python 3.x | - |
| WebSocket | websockets | - |
| 验证 | Pydantic | - |
| 依赖 | python-multipart, propcache, multidict, frozendict, h11, httptools, uvloop | - |

### 8.2 前端技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 19.2.4 |
| 语言 | TypeScript | 6 |
| 构建 | Vite | 8 |
| 可视化 | ReactFlow | 11.11.4 |
| 状态管理 | Zustand | 5 |
| 样式 | TailwindCSS | 4.2.2 |
| 国际化 | i18n | - |

### 8.3 INKOS Engine 版本

| 版本 | 日期 | 主要特性 |
|------|------|----------|
| v1.0 | 2026-04-03 | 基础多Agent框架 |
| v2.0 | 2026-04-07 | 添加质量检查 |
| v2.5 | 2026-04-15 | 借鉴Claude Code架构 |
| v2.7 | 2026-04-19 | INKOS 5-Agent完整版 + 专业功能 |

---

## 九、项目文件结构

```
C:\Users\DELL\Downloads\StoryFlow_WebUI_v3.1\storyflow\webui\
├── backend/
│   ├── core/
│   │   ├── engine.py           # INKOS Engine (核心)
│   │   ├── nodes.py            # NodeExecutor (节点执行器)
│   │   ├── advanced_ai.py       # 高级AI功能
│   │   ├── audit.py             # 审计功能
│   │   ├── truth_files.py       # 真相文件管理
│   │   ├── context_contract.py  # Context Contract生成器
│   │   ├── checkers.py          # 质量控制器
│   │   ├── model_manager.py     # 模型管理器
│   │   └── INTEGRATION.md        # 集成文档
│   ├── api/
│   │   ├── workflow.py          # 工作流API
│   │   ├── execute.py           # 执行API
│   │   ├── collaboration.py    # 协作API
│   │   ├── nodes.py            # 节点API
│   │   ├── settings.py         # 设置API
│   │   └── auth.py             # 认证API
│   ├── pro_logging/            # 专业日志
│   ├── websocket/             # WebSocket支持
│   └── main.py                 # 后端入口
├── src/
│   ├── components/
│   │   ├── Layout/             # 29个UI组件
│   │   ├── nodes/              # 7个节点组件
│   │   └── Collaboration/     # 协作组件
│   ├── stores/                 # 7个Zustand状态管理
│   ├── services/               # API服务 (api.ts, llm.ts, websocket.ts)
│   ├── hooks/                  # 自定义Hooks
│   ├── i18n/                   # 国际化
│   └── types/                  # TypeScript类型定义
├── docs/
│   ├── ADVANCED_AI_FEATURES.md # 高级AI功能文档
│   └── COLLABORATION_FEATURES.md # 协作功能文档
├── START.bat                   # 一键启动脚本
└── package.json                # 依赖配置
```

---

## 十、明日计划（P0优先级）

### 必须验证
1. **API Key配置弹窗** → 保存 → 生效
2. **5-Agent模板加载** → 可视化显示6个节点
3. **执行工作流** → 查看审计报告
4. **"工作流配置不能为空"** → 根因修复

### 应该测试
5. 灵感面板随机生成
6. 风格切换(6种)
7. AI推荐节点
8. 评论面板集成

---

## 十一、教训与总结

### 11.1 核心问题
1. **承诺与交付脱节**：README承诺功能≠实际完成功能
2. **端到端测试缺失**：代码写完但没完整测试过
3. **文档与实现脱节**：文档写了但代码未实现

### 11.2 系统设计问题
1. 架构评分仅5/10（扩展性/性能/安全性均有欠缺）
2. 54个问题分布在前端/后端/架构/DevOps四个维度
3. 缺少专业的API文档和使用说明

### 11.3 下次避免
1. 每完成一个功能立即测试，不要等到最后
2. 文档与代码必须同步更新
3. 每次新增功能要更新README

---

*记录时间: 2026-04-21 03:25*
*完整开发周期: 2026-04-03 ~ 2026-04-21 (18天)*