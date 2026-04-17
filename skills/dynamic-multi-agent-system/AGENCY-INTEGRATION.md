# Agency Agents 整合报告

**日期：** 2026-04-14  
**版本：** v1.0.0  
**整合对象：** agency-agents (193个专家Agent) → 阳神系统

---

## 整合概述

### 整合目标
将 **Agency Agents** 的193个专家角色知识库与 **阳神系统** 的动态Agent编排能力整合，实现：
1. 阳神系统负责任务分类、分解、调度、质检
2. Agency Agents提供专业领域知识注入
3. 子Agent执行时获得专家级别的prompt指导

### 整合架构

```
用户请求
    │
    ▼
阳神系统（编排层）
    │
    ├── 任务分类器 ← 检测是否需要Agency Agent
    │       │
    │       └── detectAgencyAgentNeed() 关键词检测
    │
    ├── 任务分解器 ← 注入专业知识到子Agent
    │       │
    │       ├── parseAgentFile() 读取Agent定义
    │       └── injectAgentKnowledge() 注入prompt
    │
    ├── 子Agent管理器 ← 创建带专业知识的子Agent
    │
    └── 资源清理器 ← 执行后清理
```

---

## 新增文件清单

| 文件路径 | 说明 |
|---------|------|
| `agency-registry/AGENCY-MAPPING.md` | 角色映射表（152个Agent） |
| `agency-registry/registry.json` | Agent索引缓存 |
| `agency-registry/SKILL.md` | 注册器主定义 |
| `agency-registry/loader.ts` | Agent加载器（TypeScript） |
| `agency-registry/keyword-detector.ts` | 关键词检测器 |

### 修改文件清单

| 文件路径 | 修改内容 |
|---------|---------|
| `core/task-classifier/SKILL.md` | 添加Agency Agent检测 |
| `core/task-decomposer/SKILL.md` | 添加知识注入流程 |

---

## 角色合并策略

### 阳神核心角色（保留，编排能力）

| 角色ID | 名称 | 职责 |
|--------|------|------|
| orchestrator | 主控协调器 | 任务分类、分解、调度 |
| quality-checker | 质量审查器 | 三层质检机制 |
| resource-cleaner | 资源清理器 | 子Agent生命周期管理 |
| skill-evolution | 技能进化器 | Skill固化与追踪 |

### 阳神执行角色（映射到Agency Agents）

| 阳神角色 | Agency Agent | 合并方式 |
|---------|--------------|---------|
| strategist | product-manager | 使用PRD框架 |
| data-analyst | data-engineer | 使用数据分析方法 |
| architect | software-architect | 使用架构方法 |
| developer | senior-developer | 使用开发规范 |
| tester | code-reviewer | 使用审查方法 |

---

## 触发机制

### 关键词检测

当用户输入包含以下关键词时，自动触发Agency Agent加载：

```
小红书 → marketing-xiaohongshu-specialist
抖音 → marketing-douyin-strategist  
微信公众号 → marketing-wechat-official-account
B站 → marketing-bilibili-content-strategist
代码审查 → engineering-code-reviewer
安全测试 → engineering-security-engineer
前端开发 → engineering-frontend-developer
后端开发 → engineering-backend-architect
PRD/需求 → product-manager
```

### 检测流程

```
1. 用户输入任务
2. 任务分类器接收
3. detectAgencyAgentNeed() 检测关键词
4. 返回匹配结果（confidence > 0.5则触发）
5. 设置 requiresAgencyAgent: true
6. 记录 matched agency agent 名称
```

---

## 知识注入流程

### 注入时机
任务分解阶段，为每个子Agent创建prompt时注入。

### 注入内容
从Agency Agent文件提取以下section：
- **Identity & Mindset** → 身份定义
- **Critical Rules** → 必须遵守的规则
- **Deliverables** → 交付标准
- **Workflow Process** → 工作流程

### 注入后的prompt结构

```
你是「{阳神角色}」，负责{职责描述}。

[Agency Agent 专业知识]
## 身份与思维
{从Agent提取}

## 关键规则
{从Agent提取}

## 交付标准
{从Agent提取}

## 工作流程
{从Agent提取}

## 任务目标
{具体目标}

## 输出要求
{格式要求}
```

---

## Agent生命周期

### 完整流程

```
用户请求
    │
    ▼
1. 任务分类（检测是否需要Agency Agent）
    │
    ▼
2. 任务分解（注入专业知识到prompt）
    │
    ▼
3. 子Agent创建（带增强prompt）
    │
    ▼
4. 子Agent执行（使用专家知识）
    │
    ▼
5. 质量审查（3层质检）
    │
    ▼
6. 资源清理（销毁子Agent）
```

### 子Agent销毁
- **触发时机**：任务完成或失败后
- **执行组件**：resource-cleaner
- **销毁内容**：子Agent会话、临时文件、缓存

---

## Agency Agent 覆盖统计

| 类别 | 数量 | 覆盖领域 |
|------|------|---------|
| engineering | 29 | 安全、前端、后端、数据、架构等 |
| marketing | 30 | 小红书、抖音、微信、SEO等 |
| product | 5 | 产品经理、需求分析、趋势研究 |
| specialized | 42 | 客服、人力资源、法律、财务等 |
| design | 18 | UI/UX、品牌、视觉、游戏UI等 |
| finance | 15 | 投资、风险、财务、税务等 |
| game-development | 13 | Unity/Unreal、策划、美术等 |
| **总计** | **152** | 18个领域 |

---

## 使用示例

### 示例1：小红书运营任务

**用户输入：**
```
帮我写一个小红书运营方案
```

**系统处理：**
1. 任务分类器检测到"小红书"关键词
2. 触发 `marketing-xiaohongshu-specialist` Agent
3. 任务分解器加载小红书专家知识
4. 子Agent prompt包含：
   - 小红书内容标准（70%有机/20%趋势/10%品牌）
   - 算法规则（使用热门标签）
   - 社区互动技巧
   - KPI指标（5%+ engagement rate）

### 示例2：代码安全审查

**用户输入：**
```
帮我做代码安全审查
```

**系统处理：**
1. 任务分类器检测到"安全"关键词
2. 触发 `engineering-security-engineer` Agent
3. 子Agent prompt包含：
   - OWASP Top 10 漏洞类型
   - 安全测试方法
   - CVSS 评分标准
   - 修复建议模板

---

## 整合状态

| 组件 | 状态 | 说明 |
|------|------|------|
| 角色映射表 | ✅ 完成 | 152个Agent映射 |
| 关键词检测器 | ✅ 完成 | 中英文关键词支持 |
| Agent加载器 | ✅ 完成 | loader.ts |
| 注册器SKILL | ✅ 完成 | agency-registry/SKILL.md |
| 任务分类器集成 | ✅ 完成 | 添加Agency Agent检测 |
| 任务分解器集成 | ✅ 完成 | 添加知识注入流程 |
| 缓存索引 | ✅ 完成 | registry.json |

---

## 下一步计划

1. **测试验证** - 用实际任务测试整合效果
2. **触发词扩展** - 添加更多中文关键词
3. **多Agent支持** - 支持同时加载多个Agency Agent
4. **缓存优化** - 预加载高频使用的Agent

---

*整合完成：2026-04-14*
