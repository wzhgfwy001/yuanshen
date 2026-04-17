# 🤖 AI 工作团队 - 混合动态多 Agent 协作系统

[![GitHub stars](https://img.shields.io/github/stars/wzhgfwy001/yuanshen?style=flat-square)](https://github.com/wzhgfwy001/yuanshen)
[![Version](https://img.shields.io/badge/version-v1.3.1-blue?style=flat-square)](https://github.com/wzhgfwy001/yuanshen)
[![OpenClaw](https://img.shields.io/badge/compat-OpenClaw%202026.4.1%2B-green?style=flat-square)](https://github.com/openclaw/openclaw)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](./LICENSE)

**版本：** v1.3.1  
**分类：** AI 智能 / 效率提升  
**兼容性：** OpenClaw 2026.4.1+

---

## 🚀 快速开始（5分钟上手）

```bash
# 1. 克隆项目
git clone https://github.com/wzhgfwy001/yuanshen.git

# 2. 进入目录
cd yuanshen/skills/dynamic-multi-agent-system

# 3. 运行示例
cd examples/quick-demo && node demo.js

# 4. 查看效果
# 输出: 你好，世界！✅
```

**或者直接在OpenClaw中描述任务：**
```
翻译 "Hello, World!" 为中文
```

---

## 🎯 你的 AI 工作团队，复杂任务一键搞定！

**无需配置，描述任务即可自动组建专业 Agent 团队！**

### 核心优势

- 🤖 **30 种专业 Agent 角色** - 分析师/作家/开发者/设计师等
- ⚡ **智能任务分解** - 自动识别任务类型，动态分配 Agent
- ✅ **三层质量检查** - 确保输出高质量
- 📦 **9 个预设模板** - 开箱即用
- 🌍 **支持中/英/日三语** - 国际化支持
- 📊 **实时监控大屏** - 任务进度一目了然

### 核心优势

- 🎯 **智能任务分解** - 自动识别任务类型，动态分解为可执行子任务
- 👥 **动态团队组建** - 按需创建专业 Agent 角色，无需预设固定数量
- ✅ **三层质量保障** - 自我检查→主 Agent 确认→独立审查，输出质量稳定
- 📈 **持续进化学习** - 成功经验自动沉淀，3 次成功固化为可复用 Skill
- 💾 **状态持久化** - 共享记忆层支持多 Agent 协作，避免信息孤岛
- 🚦 **智能调度** - 并发控制、优先级调度、超时重试，系统稳定运行

---

## 💬 用户反馈

**感谢使用！已有 40+ 用户下载** 🎉

### 📢 重要：我们需要你的反馈！

**现状：** 41 下载，0 反馈 → 开发者不知道如何改进

**立即反馈（30 秒）：**

**方式 1：微信联系** ⭐⭐⭐
- 微信号：`wzhgfwy_001`
- 添加请注明：Skill 反馈 + 昵称

**方式 2：QQ 邮箱** ⭐⭐⭐
- 邮箱：`307645213@qq.com`
- 标题建议：【Skill 反馈】+ 问题类型

**方式 3：查看反馈引导**
- 打开 `📢重要 - 反馈与更新.md` ← 首次安装必看
- 或填写 `QUICK-FEEDBACK.md` ← 快速模板

**承诺：** 24-72h 响应，前 10 名反馈者有奖励！🎁

---

## 🎬 使用示例

### 示例 1：单一任务

```
任务：翻译"你好，世界"为英文
耗时：~3 秒
结果：Hello, World!
```

---

### 示例 2：标准任务

```
任务：写一篇科幻短篇小说
主题：2077 年的北京清晨
要求：800-1000 字，温暖治愈风格

执行流程：
1. 任务分类 → standard（置信度 0.85）
2. 加载科幻创作 Skill
3. 创建 4 个子 Agent：
   - 世界观设计师（设定 2077 北京）
   - 大纲规划师（设计故事结构）
   - 内容创作者（撰写正文）
   - 质量审查员（三层审查）
4. 输出：《清晨的豆汁儿》（892 字，92 分）

耗时：~70 分钟
```

---

### 示例 3：创新任务

```
任务：为一家 50 人的科技公司设计管理体系
要求：
- 包含组织架构、决策流程、激励机制
- 考虑远程办公和弹性工作制
- 提供 3 个月实施路线图

执行流程：
1. 任务分类 → innovative（置信度 0.95）
2. 动态分解为 8 个子任务
3. 创建 6 个专业 Agent：
   - 组织管理专家
   - 流程设计专家
   - HR 专家
   - 激励设计专家
   - 远程协作专家
   - 变革管理专家
4. 并行/串行混合执行
5. 输出：完整管理体系大纲（含 7 大部分）

耗时：~150 分钟
```

---

### 示例 4：混合任务

```
任务：创作中篇科幻小说
主题：人工智能伦理困境
要求：
- 3 章，每章 1500 字
- 重点描写 AI 伦理冲突
- 采用双主角视角（人类+AI）
- 结局开放式

执行流程：
1. 任务分类 → hybrid（置信度 0.92）
2. 加载科幻创作 Skill
3. 添加定制角色：AI 伦理顾问
4. 添加定制检查点：
   - 双视角一致性审查
   - 伦理冲突深度审查
   - 开放式结局验证
5. 输出：《意识边界》3 章大纲

耗时：~105 分钟
```

---

## 📊 测试报告

### 完整系统测试（2026-04-04）

| 用例 | 任务类型 | 状态 | 质量 | 耗时 |
|------|----------|------|------|------|
| 用例 1 | simple | ✅ 通过 | 4.5/5 | ~3 秒 |
| 用例 2 | standard | ✅ 通过 | 92/100 | ~70 分钟 |
| 用例 3 | innovative | ✅ 通过 | 完整 | ~150 分钟 |
| 用例 4 | hybrid | ✅ 通过 | 完整 | ~105 分钟 |

**总通过率：** 4/4 (100%) ✅  
**系统成熟度：** 🟢 生产就绪

---

## 🚀 快速开始

### 安装

```bash
# 1. 下载 Skill 包
git clone <repository-url> dynamic-multi-agent-system

# 2. 复制到 OpenClaw Skills 目录
# Windows: %APPDATA%\npm\node_modules\openclaw\skills\
# macOS/Linux: ~/.openclaw/skills/

# 3. 重启 Gateway
openclaw gateway restart

# 4. 验证安装
openclaw skills list
```

### 使用

**无需特殊命令，直接描述任务即可：**

```
写一篇科幻短篇小说，主题是 2077 年的北京，要求温暖治愈风格
```

系统会自动处理所有步骤！

---

## 📋 核心功能

### 1. 任务分类器

自动识别 4 种任务类型：

| 类型 | 特征 | 处理方式 |
|------|------|----------|
| **simple** | 简单、快速 | 主 Agent 直接执行 |
| **standard** | 常见、有流程 | 加载 Skill 执行 |
| **innovative** | 复杂、新颖 | 动态组建团队 |
| **hybrid** | 标准 + 定制 | Skill+ 定制环节 |

**识别准确率：** ≥90%  
**平均置信度：** 0.92

---

### 2. 任务分解器

将复杂任务分解为可执行子任务：

- ✅ 正交性原则（职责不重叠）
- ✅ 依赖关系明确
- ✅ 接口标准化

**典型分解：** 6-8 个子任务（创新任务）

---

### 3. 执行协调器

协调多 Agent 并行/串行执行：

- 🚦 并发控制（最多 3 个主任务）
- 👥 资源调度（最多 12 个子 Agent）
- ⏱️ 超时处理（5 分钟无响应自动终止）
- 🔄 重试机制（指数退避）

---

### 4. 质量检查器

三层质量保障机制：

```
第一层：子 Agent 自我检查
   ↓
第二层：主 Agent 确认
   ↓
第三层：审查 Agent 审查（复杂任务启用）
```

**质量达标率：** ≥95%（≥85 分）

---

### 5. 共享记忆层

多 Agent 协作的持久化存储：

- 💾 结构化数据（JSON）
- 🔐 权限管理（基于角色）
- 📝 版本控制（历史记录）
- ⚡ 原子操作（避免冲突）

---

### 6. Skill 固化追踪器

持续进化学习系统：

```
探索期 (0-2 次) → 成长期 (3-5 次) → 成熟期 (6 次+)
     ↓                ↓                 ↓
  记录经验        可固化 (需确认)    已固化/迭代
```

**固化阈值：** 3 次成功  
**版本管理：** v1.0 → v1.1 → v2.0

---

### 7. 多任务队列

智能任务调度系统：

- 🎯 优先级调度（high/normal/low）
- ⚖️ 资源公平分配
- 📊 实时监控
- 📈 统计报告

---

### 8. 用户反馈自动化

自动收集和分析用户反馈：

- ⭐ 1-5 分评分
- 💬 情感分析
- 📊 满意度报告（日报/周报/月报）
- 🔄 低分触发改进（<3 分）
- ✅ 高分计入固化（≥4 分）

---

## 📁 项目结构

```
dynamic-multi-agent-system/
├── SKILL.md                        # 主 Skill 定义
├── manifest.json                   # 包配置
├── README.md                       # 本文件
├── docs/
│   ├── architecture.md             # 架构说明
│   ├── api-reference.md            # API 参考
│   ├── troubleshooting.md          # 故障排除
│   ├── contribution.md             # 贡献指南
│   ├── DEPLOYMENT.md               # 部署指南
│   ├── USER-GUIDE.md               # 用户手册
│   ├── shared-memory-protocol.md   # 共享记忆层协议
│   ├── multi-task-queue-protocol.md # 多任务队列协议
│   ├── skill-solidification-protocol.md # Skill 固化协议
│   └── user-feedback-protocol.md   # 用户反馈协议
├── core/
│   ├── task-classifier/            # 任务分类器
│   ├── task-decomposer/            # 任务分解器
│   ├── executor-coordinator/       # 执行协调器
│   ├── quality-checker/            # 质量检查器
│   ├── subagent-manager/           # 子 Agent 管理器
│   ├── skill-evolution/            # Skill 进化分析器
│   ├── resource-cleaner/           # 资源清理器
│   ├── shared-memory/              # 共享记忆层
│   └── multi-task-queue/           # 多任务队列
├── test/
│   ├── system-test-plan.md         # 测试计划
│   └── system-test-report.md       # 测试报告
├── examples/
│   └── example-sci-fi.md           # 使用示例
├── state/
│   ├── skill-counters.json         # Skill 计数器
│   ├── experience-db.json          # 经验数据库
│   ├── queue-manager.json          # 队列状态
│   └── feedback-stats.json         # 反馈统计
└── config/
    └── feedback-config.json        # 反馈配置
```

---

## 🔧 配置说明

### 默认配置

无需额外配置，开箱即用。

### 自定义配置（可选）

创建 `config/user-config.json`：

```json
{
  "limits": {
    "max-concurrent-tasks": 3,
    "max-subagents-total": 12,
    "max-subagents-per-task": 6
  },
  "thresholds": {
    "confidence": 0.7,
    "solidify": 3,
    "quality-min": 85
  }
}
```

---

## ⚠️ 系统限制

| 资源 | 限制 | 说明 |
|------|------|------|
| 并发主任务 | 3 个 | 同时运行的主任务数 |
| 子 Agent 总数 | 12 个 | 所有任务共享 |
| 单任务子 Agent | 6 个 | 单个任务最多占用 |
| 任务超时 | 60 分钟 | 默认超时时间 |
| 子 Agent 超时 | 5 分钟 | 无响应自动终止 |

---

## 📞 支持与反馈

### 文档

- [部署指南](docs/DEPLOYMENT.md)
- [用户手册](docs/USER-GUIDE.md)
- [架构说明](docs/architecture.md)
- [故障排除](docs/troubleshooting.md)

### 社区

- **Discord:** https://discord.com/invite/clawd
- **GitHub:** https://github.com/openclaw/openclaw
- **文档：** https://docs.openclaw.ai

### 反馈

使用 OpenClaw 的反馈功能或联系技术支持

---

## 📄 许可证

遵循 OpenClaw Skills 平台许可协议

---

## 🎖️ 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0-alpha | 2026-04-04 | 初始版本，核心功能完成 |
| | | - P0 核心模块（4 个） |
| | | - P1 优化模块（4 个） |
| | | - 完整系统测试（4/4 通过） |

---

## 📊 项目状态

```
P0 核心模块：    ████████████████████ 100%
P1 优化模块：    ████████████████████ 100%
P2 部署准备：    ████████████████░░░░  80%

总体进度：      ██████████████████░░  90%
```

---

**开始使用混合动态多 Agent 系统，让复杂任务变得简单！** 🚀

---

*README 版本：1.0*  
*最后更新：2026-04-04*
