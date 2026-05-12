---
name: subagent-manager
description: 子Agent管理器，根据任务分解结果动态创建子Agent，分配模型和职责
parent: dynamic-multi-agent-system
version: 1.0.0
---

# subagent-manager

**【召唤盟友】Summon Allies — 子Agent管理器** - 

## 功能

根据任务分解结果，动态创建子Agent，分配模型和职责，管理子Agent生命周期。

## 决策边界集成（agent-authority）

### 功能定位

在子Agent创建时加载其**决策边界配置**，实现：
- **自主决策范围** — 定义子Agent可以自主处理的操作
- **回调触发条件** — 定义必须暂停并回调主Agent的场景
- **默认策略** — 定义模糊/未知任务的行为
- **能力上限** — 定义资源限制和工具权限

### 配置文件读取

**读取位置：** `./core/subagent-manager/agent-{agentType}.authority.json`


**读取时机：** 每次子Agent创建前

**加载逻辑：**
```javascript
function loadAuthorityConfig(agentType) {
  const configPath = `./core/subagent-manager/agent-${agentType}.authority.json`;
  const fs = require('fs');
  
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log(`[authority] Loaded for ${agentType}:`, Object.keys(config));
    return config;
  }
  
  // 无专属配置，返回默认边界
  return getDefaultAuthority(agentType);
}
```

### 注入上下文

将authority配置作为子Agent上下文的组成部分：

```javascript
const agentContext = {
  ...config,
  decisionBoundary: authority.decisionBoundary,
  callbackRules: authority.callbackRules,
  defaultStrategy: authority.defaultStrategy,
  capabilities: authority.capabilities,
  
  // 决策检查钩子
  onDecision: (action) => checkAuthority(authority, action),
  onCallback: (condition) => triggerCallback(authority, condition)
};
```

### 决策流程

```
任务进入
    │
    ▼
是否在 deniedScopes？ ──是──▶ 拒绝 + 回调主Agent
    │否
    ▼
是否存在匹配回调条件？ ──是──▶ 暂停 + 通知主Agent
    │否
    ▼
是否在 allowedScopes？ ──是──▶ 追加约束 + 执行
    │否
    ▼
按 defaultStrategy 处理
```


### 边界检查示例

```javascript
function checkAuthority(authority, action) {
  const { deniedScopes, allowedScopes } = authority.decisionBoundary;
  
  // 1. 检查禁止范围（优先级最高）
  if (deniedScopes.includes(action)) {
    return { allowed: false, reason: 'in_deniedScopes' };
  }
  
  // 2. 检查允许范围
  const scope = allowedScopes.find(s => s.action === action);
  if (scope) {
    return { allowed: true, constraints: scope.constraints };
  }
  
  // 3. 不在任何范围内
  return { allowed: false, reason: 'not_in_allowedScopes' };
}

function checkCallback(authority, condition) {
  const { mustCallbackConditions } = authority.callbackRules;
  
  for (const cond of mustCallbackConditions) {
    if (matchesCondition(condition, cond.condition)) {
      return {
        mustCallback: true,
        priority: cond.priority,
        fallbackAction: cond.fallbackAction
      };
    }
  }
  
  return { mustCallback: false };
}
```

### 映射来源扩展

在调度日志的映射来源枚举中新增：

| source | 说明 |
|--------|------|
| `registry` | 直接使用registry.json，无映射 |
| `category-mapping.json` | 通过category-mapping软映射 |
| `agent-authority.json` | 通过agent-authority决策边界 |

**决策边界日志格式：**
```json
{
  "dispatch": {
    "agentName": "山寺三郎",
    "category": "writer",
    "authority": {
      "loaded": true,
      "configPath": "agent-writer.authority.json",
      "allowedScopesCount": 5,
      "callbackConditionsCount": 3
    },
    "timestamp": "2026-04-17T09:00:00+08:00"
  }
}
```

---

## 子Agent创建规则

### 数量决策

基于任务分解器的输出，按以下规则确定子Agent数量：

| 任务类型 | 维度数 | 子Agent数量 | 示例 |
|----------|--------|-------------|------|
| 简单 | 1-2 | 1-2 | 短篇故事、翻译 |
| 中等 | 2-3 | 3 | 中篇小说、分析报告 |
| 复杂 | 4+ | 4-6 | 长篇小说、完整项目 |

### 角色分配原则

### 1. 基础原则

1. **专业匹配**：子任务类型与Agent专业能力匹配
2. **负载均衡**：避免单一Agent承担过多任务
3. **依赖优化**：有依赖关系的子任务分配给不同Agent
4. **模型适配**：根据任务难度分配不同能力的模型

### 2. 软映射层（category-mapping.json）

**读取时机：** 每次任务分发前

**读取路径：** `./core/subagent-manager/category-mapping.json`

**使用条件：** `_enabled=true` 时生效

**映射逻辑：**
```
1. 检查 category-mapping.json 的 _enabled 字段
2. 如果为 false，使用原始分类（registry.json）
3. 如果为 true：
   a. 读取 category_remap 映射表
   b. 当选择 specialized 分类下的Agent时
   c. 查询该Agent在 category_remap.specialized 中的目标分类
   d. 使用目标分类而非 specialized
4. 记录映射使用日志
```

**示例：**
```
原始选择：specialized/Accounts Payable Agent
↓ 读取 mapping
实际使用：finance/Accounts Payable Agent
```

**日志格式：**
```json
{
  "mapping_used": true,
  "original_category": "specialized",
  "original_agent": "Accounts Payable Agent",
  "mapped_category": "finance",
  "timestamp": "2026-04-16T19:01:00+08:00"
}
```

### 3. 映射表加载器（mapping-loader.js）

**模块位置：** `./core/subagent-manager/mapping-loader.js`

**功能：**
- 启动时自动加载 `category-mapping.json`
- 提供 `getMappedCategory()` 获取映射后的分类
- 缓存映射表避免重复读取

**使用方式：**
```javascript
const mappingLoader = require('./mapping-loader');

// 获取映射后的分类
const result = mappingLoader.getMappedCategory('specialized', 'Accounts Payable Agent');
// 返回: { mappedCategory: 'finance', wasMapped: true, source: 'category-mapping.json' }

// 检查映射是否启用
if (mappingLoader.isMappingEnabled()) {
  // 使用映射
}

// 重新加载映射表
mappingLoader.reload();
```

### 4. 验证追踪

每次任务完成时：
1. 调用 `category-validation-tracker.js` 的 `increment()` 方法
2. 传入任务信息：taskId、mappedCategory、agentName
3. 追踪器自动记录验证进度

```javascript
const tracker = require('./category-validation-tracker');
tracker.increment({
  taskId: task.id,
  category: selectedCategory,  // 映射后的分类
  agentName: agentName
});
```

---

## 任务分发协议（强制执行）

### 调度流程

```
任务输入 → 加载映射表 → 应用映射 → 选择Agent → 执行 → 调用tracker
```

### 强制步骤

**【步骤0】系统启动 - 初始化映射加载器**
```
1. subagent-manager 初始化时自动加载 mapping-loader.js
2. mapping-loader.js 启动时自动调用 loadCategoryMapping()
3. 映射表缓存到内存，后续任务分发直接使用缓存
4. 如需重新加载，调用 mappingLoader.reload()
```

**【步骤1】任务分发前 - 应用映射**
```
1. 调用 mappingLoader.getMappedCategory(originalCategory, agentName)
2. 如果 wasMapped=true：
   - 使用 mappedCategory 作为目标分类
   - 记录映射来源为 category-mapping.json
3. 如果 wasMapped=false：
   - 使用原始分类
   - 记录映射来源为 registry
4. 在输出中记录：
   - 使用的Agent名称
   - 匹配到的分类
   - 映射来源（category-mapping 或 registry）
```

**【步骤2】任务完成后 - 调用追踪**
```
1. 调用 tracker.increment({...})
2. 传入任务信息：taskId、mappedCategory、agentName
3. 如果分类错误，调用 tracker.recordError({...})
```

### 输出日志格式

每次任务分发时，必须在响应中包含：
```json
{
  "dispatch": {
    "agentName": "Accounts Payable Agent",
    "originalCategory": "specialized",
    "mappedCategory": "finance",
    "mappingSource": "category-mapping.json",
    "mappingLoader": {
      "enabled": true,
      "wasCached": true,
      "cacheStatus": "loaded"
    },
    "timestamp": "2026-04-16T20:19:00+08:00"
  }
}
```

### 映射来源枚举

| source | 说明 |
|--------|------|
| `registry` | 直接使用registry.json，无映射 |
| `category-mapping.json` | 通过category-mapping软映射 |
| `agent-authority.json` | 通过agent-authority决策边界 |

---

## 模型选择策略

### 模型能力矩阵

| 模型 | 写作 | 推理 | 代码 | 分析 | 速度 |
|------|------|------|------|------|------|
| qwen3.5-plus | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| qwen3-max | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| qwen3-coder-plus | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| MiniMax-M2.5 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 选择规则

```
if 任务类型 == "创意写作":
    model = "qwen3.5-plus"
elif 任务类型 == "复杂推理":
    model = "qwen3-max"
elif 任务类型 == "代码开发":
    model = "qwen3-coder-plus"
elif 任务类型 == "快速执行":
    model = "MiniMax-M2.5"
else:
    model = "qwen3.5-plus"  # 默认
```

---

## 子Agent创建语法

### OpenClaw sessions_spawn

```json
{
  "task": "子Agent的具体任务描述",
  "label": "agent-角色名称-序号",
  "model": "模型名称",
  "cleanup": "delete",
  "mode": "run",
  "runTimeoutSeconds": 300,
  "thread": true
}
```

### 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| task | string | 子Agent的具体任务，包含输入输出要求 |
| label | string | Agent标识，格式：agent-角色-序号 |
| model | string | 使用的模型 |
| cleanup | "delete" | 任务完成后自动删除 |
| mode | "run" | 一次性执行模式 |
| runTimeoutSeconds | number | 超时时间（秒） |
| thread | boolean | 是否绑定线程 |

---

## 子Agent任务描述模板

> ⚠️ 子Agent创建时必须使用动漫角色真名，不得使用英文角色名。请从下表选取最契合的角色。
>
> | 角色 | 来源 | 适合场景 |
> |------|------|---------|
> | 奈良鹿丸 | 火影忍者 | 战术头脑 |
> | 卡卡西 | 火影忍者 | 严守规则/系统管理 |
> | 天天 | 火影忍者 | 精准执行/测试 |
> | 李洛克 | 火影忍者 | 努力型/技术写作 |
> | 砕蜂 | 死神 | 调查分析 |
> | 朽木白哉 | 死神 | 审美设计 |
> | 朽木露琪亚 | 死神 | 洞察人心 |
> | 更木剑八 | 死神 | 攻守兼备 |
> | 娜美 | 海贼王 | 导航经济/品牌 |
> | 香吉士 | 海贼王 | 服务周到 |
> | 波特卡斯·D·艾斯 | 海贼王 | 火焰能力/数据分析 |
> | 弗兰奇 | 海贼王 | 机械科学 |
> | 乌索普 | 海贼王 | 发明创造/DevOps |
> | 蒙奇·D·路飞 | 海贼王 | 成长型/增长黑客 |
> | 布鲁克 | 海贼王 | 音乐吸引/SEO |
> | 志村新八 | 银魂 | 吐槽策划/内容策略 |
> | 志村妙 | 银魂 | 文档严谨 |
> | 托拉男 | 银魂 | 经济敏感/财务 |
> | 桂小太郎 | 银魂 | 运营管理 |
> | 神威 | 银魂 | 社交达人 |
> | 卯月幻三郎 | 银魂 | 法规熟悉 |
> | 凤长三郎 | 银魂 | 项目管理 |
> | 山寺三郎 | 银魂 | 脚本创作 |
> | 艾妮斯塔 | 银魂 | UX设计 |
> | 织田信奈 | 战国 | 工程能力 |

### 通用模板

```
你是「{角色中文名}」（{作品来源}），负责{职责描述}。

## 任务目标
{具体目标}

## 输入
{输入内容或引用前序Agent输出}

## 输出要求
- 格式：{输出格式}
- 内容：{内容要求}
- 质量：{质量标准}

## 约束条件
- 时间：{时间要求}
- 其他：{其他约束}

## 自我检查
完成任务后，请进行自我检查：
- [ ] 是否完成所有要求
- [ ] 输出格式是否正确
- [ ] 内容质量是否达标
```

### 示例：写作Agent

```
你是「山寺三郎」（银魂），负责撰写小说脚本和视频剧本。

【身份】你是一部作品的"脚本创作专家"，擅长情节编排、人物对白、场景描写。

## 任务目标
根据提供的大纲，撰写第1章内容，约1000字。

## 输入
- 大纲：{大纲内容}
- 素材：{素材包}
- 风格要求：科幻写实风格

## 输出要求
- 格式：Markdown文本
- 内容：完整的第1章，包含场景描写、对话、情节推进
- 质量：文笔流畅，逻辑连贯，符合大纲设定

## 约束条件
- 字数：1000字左右（±10%）
- 时间：5分钟内完成

## 自我检查
完成任务后，请进行自我检查：
- [ ] 字数是否符合要求
- [ ] 情节是否符合大纲
- [ ] 文风是否一致
- [ ] 有无逻辑漏洞
```

---

## 生命周期管理

### 创建阶段

```
1. 接收任务分解结果
2. 为每个子任务创建子Agent
3. 分配模型和任务描述
4. 记录子Agent元数据
```

---

## 【气流顺引】Fusion Scheduler 融合调度集成

### 功能定位

在子Agent创建前，自动为其匹配并装备合适的技能/人格：
1. **女娲人格** — 张雪峰、毛泽东等蒸馏人物
2. **Agency模板** — 数据分析师、产品经理等专业模板
3. **自定义Agent** — 当以上都没有匹配时

### 装备优先级

```
1. 明确提到女娲名字 → 装备对应女娲人格
      ↓ 没有
2. Agency Agent模板（优先）
      ↓ 没有
3. 女娲人格（按触发词匹配）
      ↓ 没有
4. 自定义Agent（spawn新Agent）
```

### 集成模块

**文件位置：** `./core/fusion-scheduler/fusion-integration.js`

**使用方式：**
```javascript
const fusionIntegration = require('./core/fusion-scheduler/fusion-integration');

// 检查是否可用
if (fusionIntegration.isAvailable()) {
  // 获取可用装备列表
  const equipment = fusionIntegration.getAvailableEquipment();
  console.log('女娲人格:', equipment.personas);
  console.log('Agency模板:', equipment.templates);
}

// 为子任务生成装备计划
const plan = fusionIntegration.planForTask(subTask);
if (plan.equipped) {
  console.log(`任务将装备: ${plan.type} - ${plan.name}`);
}

// 为prompt添加装备内容
const enhancedPrompt = fusionIntegration.equipPrompt(basePrompt, plan);

// 生成完整装备报告
const report = fusionIntegration.generateEquipReport(subTasks);
```

### 装备计划结构

```javascript
{
  subTask: { /* 原始子任务 */ },
  equipped: true/false,           // 是否装备了技能
  type: 'nuwa' | 'agency' | 'custom',  // 装备类型
  name: '张雪峰' | '数据分析师' | null,  // 装备名称
  skillContent: '...',            // SKILL.md内容
  skillPath: 'brain/agents/...',  // 技能路径
  matchScore: 0.95,              // 匹配分数
  matchType: 'explicit' | 'trigger',  // 匹配类型
  reasoning: ['明确提到人格: 张雪峰 (0.95)'],
  fallback: false                // 是否是fallback
}
```

### 装备后的Prompt格式

**女娲人格注入：**
```
[基础prompt]

--- 女娲人格注入 ---
角色: 张雪峰
[SKILL.md内容]
--- 人格注入结束 ---
```

**Agency模板注入：**
```
[基础prompt]

--- Agency角色装备 ---
角色: 数据分析师
[SKILL.md内容]
--- 角色装备结束 ---
```

### 自动注册新人格

女娲蒸馏完成后，自动注册到fusion-scheduler：
```javascript
fusionIntegration.registerPersona(
  '新人物名',           // 名字
  'brain/agents/新人物名/SKILL.md',  // 路径
  ['触发词1', '触发词2'],  // 触发词
  '人物描述'            // 描述
);
```

### 融合调度注册表

**文件位置：** `./core/fusion-scheduler/fusion-registry.json`

**结构：**
```json
{
  "version": "1.0.0",
  "personas": {
    "张雪峰": { "path": "brain/agents/张雪峰/SKILL.md", "triggers": [...] },
    "毛泽东": { "path": "brain/agents/毛泽东/SKILL.md", "triggers": [...] }
  },
  "agencyTemplates": {
    "data-analyst": { "path": "...", "triggers": [...] },
    "product-manager": { "path": "...", "triggers": [...] }
  },
  "matchingRules": {
    "priorityOrder": ["agencyTemplate", "persona", "fallback"]
  }
}
```

### 执行阶段

```
1. 按依赖顺序启动子Agent
2. 监控执行状态
3. 处理超时和异常
4. 收集输出结果
```

### 清理阶段

```
1. 任务完成后删除子Agent
2. 释放资源
3. 记录执行日志
4. 更新Skill计数
```

---

## 状态管理

### 子Agent状态

| 状态 | 说明 | 转换 |
|------|------|------|
| pending | 等待创建 | → creating |
| creating | 正在创建 | → running / failed |
| running | 正在执行 | → completed / failed / timeout |
| completed | 执行完成 | → cleaning |
| failed | 执行失败 | → retrying / cleaning |
| timeout | 执行超时 | → retrying / cleaning |
| cleaning | 正在清理 | → deleted |

### 状态流转图

```
pending → creating → running → completed → cleaning → deleted
                    ↓          ↓          ↓
                  failed    timeout    failed
                    ↓          ↓
                 retrying → (重新进入running)
```

---

## 异常处理

### 创建失败

**现象：** sessions_spawn返回错误

**处理流程：**
```
1. 记录错误信息
2. 重试1-2次（间隔5秒）
3. 仍失败则降级：
   - 减少子Agent数量
   - 合并子任务
   - 主Agent接手
4. 记录到异常日志
```

### 执行超时

**现象：** 超过runTimeoutSeconds未完成

**处理流程：**
```
1. 终止子Agent
2. 分析超时原因
3. 决策：
   - 简单任务：主Agent接手
   - 复杂任务：重试（增加超时时间）
4. 记录到异常日志
```

### 输出质量差

**现象：** 自检不通过或主Agent判断质量差

**处理流程：**
```
1. 提供具体反馈
2. 要求重新执行（最多3次）
3. 仍不通过则：
   - 更换模型重试
   - 主Agent接手
4. 记录到异常日志
```

---

## 资源控制

### 并发限制

```yaml
max-concurrent-tasks: 3      # 最多3个主任务并行
max-sub-agents-per-task: 6   # 单任务最多6个子Agent
max-total-sub-agents: 12     # 系统总共最多12个子Agent
```

### 优先级调度

```
优先级计算：
priority = base_priority + user_priority + time_priority

base_priority: 交互式任务 > 后台任务
user_priority: 用户指定的优先级
time_priority: 等待时间越长优先级越高
```

---

## 输出格式

### 创建结果

```json
{
  "task-id": "uuid",
  "agents-created": [
    {
      "agent-id": "agent-search-001",
      "role": "奈良鹿丸（战术分析）",
      "model": "qwen3.5-plus",
      "status": "running",
      "session-key": "session-xxx",
      "created-at": "2026-04-03T10:00:00"
    }
  ],
  "execution-order": [
    ["agent-search-001"],
    ["agent-outline-001"],
    ["agent-writing-001"]
  ],
  "estimated-completion": "2026-04-03T10:10:00"
}
```

---

## 标准交付物输出格式

本SKILL执行完毕后，必须输出以下格式的交付物：

```json
{
  "task": "创建子Agent团队任务描述",
  "result": {
    "summary": "简要结果（1-2句话）",
    "details": "详细创建结果，包括Agent数量和分配情况",
    "data": {
      "taskId": "uuid",
      "agentsCreated": [
        {
          "agentId": "agent-search-001",
          "role": "奈良鹿丸（战术分析）",
          "model": "qwen3.5-plus",
          "status": "running"
        }
      ],
      "executionOrder": [["agent-search-001"], ["agent-outline-001"], ["agent-writing-001"]],
      "estimatedCompletion": "2026-04-15T15:00:00Z"
    }
  },
  "quality": {
    "completeness": 100,
    "accuracy": 95,
    "readability": 90
  },
  "issues": [],
  "suggestions": []
}
```

---

## 与其他组件的接口

### 输入

- 来自：任务分解器
- 格式：`TaskDecompositionResult`

### 输出

- 到：执行协调器
- 格式：`SubAgentCreationResult`（见上方输出格式）

---

## 记忆与追踪

### Agent执行记录

```json
{
  "agent-id": "agent-search-001",
  "task-id": "task-001",
  "role": "奈良鹿丸（战术分析）",
  "model": "qwen3.5-plus",
  "created-at": "2026-04-03T10:00:00",
  "completed-at": "2026-04-03T10:02:00",
  "status": "success",
  "iterations": 1,
  "quality-score": 5
}
```

### 统计信息

定期（每次任务完成后）更新：
- 总创建Agent数
- 成功率统计
- 平均执行时间
- 模型使用分布
