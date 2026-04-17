---
name: agency-registry
description: Agency Agents角色注册表与动态加载器，将193个专家角色注入到阳神系统的子Agent中
parent: dynamic-multi-agent-system
version: 1.0.0
---

# agency-registry

**【灵魂熔炉】Soul Forge — Agency Agent注册器** -

## 功能

在阳神系统执行任务时，根据任务类型动态加载对应的Agency Agent专业知识，注入到子Agent的prompt中。

## 核心机制

### 加载流程

```
用户任务 → 任务分类器识别意图
    ↓
查询 AGENCY-MAPPING.md 获取对应Agent列表
    ↓
从 agency-agents/ 目录读取Agent定义
    ↓
提取关键section（Identity/Rules/Deliverables）
    ↓
注入到子Agent的prompt模板
    ↓
子Agent使用专业prompt执行任务
```

### 角色匹配逻辑

当任务分类器识别到以下关键词时，自动触发Agency Agent加载：

| 关键词 | 加载的Agent |
|--------|------------|
| 小红书 | marketing-xiaohongshu-specialist |
| 抖音 | marketing-douyin-strategist |
| 微信公众号 | marketing-wechat-official-account |
| B站 | marketing-bilibili-content-strategist |
| 微信小程序 | engineering-wechat-mini-program-developer |
| 飞书 | engineering-feishu-integration-developer |
| 安全/漏洞 | engineering-security-engineer |
| 代码审查 | engineering-code-reviewer |
| 前端 | engineering-frontend-developer |
| 后端/架构 | engineering-backend-architect |
| 数据分析 | engineering-data-engineer |
| 产品经理/PRD | product-manager |
| DevOps | engineering-devops-automator |
| UI/UX | design-ux-designer |

### 注入模板

```typescript
// 原始子Agent prompt
const basePrompt = `
你是「{角色名}」，负责{职责描述}。

## 任务目标
{具体目标}

## 输出要求
{格式要求}
`;

// 注入后的prompt
const enhancedPrompt = `
你是「{角色名}」，负责{职责描述}。

[从Agency Agent加载的专业知识]
## 专业知识
{从对应Agent文件提取的Identity/Rules/Deliverables}

## 任务目标
{具体目标}

## 输出要求
{格式要求}
`;
```

---

## 文件结构

```
agency-registry/
├── SKILL.md              ← 本文件（主定义）
├── loader.ts             ← Agent加载器
├── registry.json         ← Agent索引（自动生成）
└── prompts/              ← 提取的prompt片段
    ├── xiaohongshu-specialist.json
    ├── security-engineer.json
    └── ...
```

---

## 使用方法

### 1. 任务分类器触发

在 `task-classifier/SKILL.md` 中添加：

```markdown
### Agency Agent触发检测

当识别到以下关键词时，设置 `requiresAgencyAgent: true`：

- 小红书、抖音、微信、B站、微博
- 安全、漏洞、渗透测试
- 代码审查、架构设计
- PRD、需求文档
- UI设计、UX研究
```

### 2. 任务分解器加载

在 `task-decomposer/SKILL.md` 中添加：

```markdown
### Agency Agent加载

当 `requiresAgencyAgent: true` 时：

1. 读取 `agency-registry/AGENCY-MAPPING.md`
2. 根据任务类型获取对应Agent文件列表
3. 调用 `loader.ts` 加载Agent定义
4. 在每个子Agent的prompt中注入专业知识
```

### 3. 子Agent执行

子Agent接收到的prompt已包含：
- 阳神系统的基础角色定义
- Agency Agent的专业知识

---

## Agent文件格式

每个Agent文件（.md）包含以下section：

```markdown
---
name: Agent名称
description: 简短描述
color: #hex
emoji: 🎯
vibe: 风格描述
---

# Agent标题

## 🧠 Your Identity & Mindset
## 🎯 Your Core Mission
## 🚨 Critical Rules
## 📋 Technical Deliverables
## 📊 Workflow Process
## 🎤 Communication Style
## 📈 Success Metrics
## 🔮 Advanced Capabilities
```

---

## 提取的section

### Identity & Mindset
用于定义Agent的核心人格和思维方式。

### Critical Rules
**必须遵守的规则** — 注入到子Agent的约束条件中。

### Technical Deliverables
**技术交付物** — 定义输出格式和质量标准。

### Workflow Process
**工作流程** — 作为子Agent执行步骤的参考。

### Communication Style
**沟通风格** — 影响响应语气和表达方式。

---

## 缓存机制

### 首次加载
1. 解析Agent文件
2. 提取关键section
3. 存储到 `registry.json`
4. 缓存到内存

### 后续加载
1. 检查 `registry.json` 是否存在
2. 检查文件修改时间是否变化
3. 如无变化，直接读取缓存
4. 如有变化，重新解析并更新缓存

---

## 与其他组件的接口

### 输入

来自任务分类器：
```json
{
  "taskType": "standard",
  "requiresAgencyAgent": true,
  "keywords": ["小红书", "内容创作"],
  "confidence": 0.85
}
```

### 输出

到子Agent Manager：
```json
{
  "agentId": "subagent-1",
  "role": "content-creator",
  "prompt": "你是「文字炼金师」...\n\n[专业知识]\n## 小红书专家\n...",
  "agencyAgent": "marketing-xiaohongshu-specialist"
}
```

---

## 统计信息

| 指标 | 值 |
|------|-----|
| 注册Agent总数 | 152+ |
| 支持的领域 | 18 |
| 中国市场Agent | 46 |
| 缓存命中率 | >95% |

---

## 记忆

### 加载日志

每次加载Agent时记录：
- 加载时间
- Agent名称
- 任务ID
- 加载耗时

### 使用统计

定期（每天）更新：
- 各Agent被调用次数
- 最热门的Agent类型
- 平均加载时间

---

## 扩展

### 添加新Agent

1. 将Agent文件放入 `agency-agents/` 对应目录
2. 在 `AGENCY-MAPPING.md` 中添加映射
3. 运行 `loader.ts --rebuild` 重建索引

### 自定义映射

在 `AGENCY-MAPPING.md` 中添加自定义规则：

```markdown
| 自定义关键词 | Agency Agent | 用途 |
|-------------|--------------|------|
| 高考志愿 | （无对应）| 使用阳神内置逻辑 |
```

---

## 标准交付物输出格式

本SKILL执行完毕后，必须输出以下格式的交付物：

```json
{
  "task": "加载Agency Agent任务描述",
  "result": {
    "summary": "简要结果（1-2句话）",
    "details": "详细加载结果",
    "data": {
      "agentLoaded": "marketing-xiaohongshu-specialist",
      "sourceFile": "agency-agents/marketing/marketing-xiaohongshu-specialist.md",
      "sectionsExtracted": ["Identity", "Critical Rules", "Deliverables", "Workflow"],
      "injectionTarget": "subagent-content-creator",
      "cacheHit": false,
      "loadTimeMs": 145
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 95,
    "readability": 88
  },
  "issues": [],
  "suggestions": []
}
```

---

*版本：v1.0.0 | 最后更新：2026-04-14*
