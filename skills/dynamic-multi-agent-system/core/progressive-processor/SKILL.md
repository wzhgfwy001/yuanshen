---
name: progressive-processor
description: 渐进式处理器，分阶段生成内容（大纲→确认→填充），避免返工浪费 Token
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 渐进式处理器 (Progressive Processor)

## 功能

采用分阶段处理策略：先生成大纲→用户确认→填充细节，确保方向正确，避免返工浪费 Token。

## 核心理念

**传统方式（一次性生成）：**
```
输入需求 → 生成完整内容 → 用户不满意 → 重新生成 → 浪费 Token
```

**渐进式（分阶段确认）：**
```
输入需求 → 生成大纲 → 用户确认 → 填充细节 → 一次通过 → 节省 Token
```

---

## 处理流程

### 阶段 1：大纲生成（低成本）

```typescript
interface Outline {
  title: string;
  sections: Section[];
  estimatedLength: number;
  estimatedTokens: number;
}

async function generateOutline(task: Task): Promise<Outline> {
  const prompt = `请为以下任务生成详细大纲：
  
任务：${task.description}
要求：
- 列出主要章节/部分
- 每部分简要说明（1-2 句）
- 预估总字数
- 不需要生成详细内容

请用以下格式输出：
# 标题
## 章节 1
说明：...
## 章节 2
说明：...
`;

  // 使用轻量模型生成大纲
  const outline = await callAPI('minimax-m2.5', prompt);
  return parseOutline(outline);
}
```

**Token 消耗：** 500-1000 Token（低成本试错）

---

### 阶段 2：用户确认（关键决策）

```typescript
interface UserFeedback {
  approved: boolean;
  modifications: string[];
  additionalRequirements: string;
}

async function getUserConfirmation(outline: Outline): Promise<UserFeedback> {
  // 展示大纲给用户
  console.log('=== 生成的大纲 ===');
  console.log(outline.formatted);
  console.log('================');
  console.log('是否满意此大纲？(y/n)');
  console.log('如需修改，请说明：');
  
  const feedback = await readUserInput();
  
  return {
    approved: feedback.startsWith('y'),
    modifications: extractModifications(feedback),
    additionalRequirements: extractAdditionalRequirements(feedback),
  };
}
```

**Token 消耗：** 0 Token（用户交互）

---

### 阶段 3：细节填充（高质量）

```typescript
async function fillDetails(outline: Outline, feedback: UserFeedback): Promise<string> {
  // 根据大纲逐章节生成
  const sections: string[] = [];
  
  for (const section of outline.sections) {
    const prompt = `请根据以下大纲生成详细内容：
    
${section.title}
说明：${section.description}

要求：
- 字数：${section.estimatedWords}字
- 风格：${task.style}
- 包含以下要点：${section.keyPoints.join(', ')}
`;

    // 使用合适的模型生成
    const model = selectModel(section.complexity);
    const content = await callAPI(model, prompt);
    sections.push(content);
  }
  
  return combineSections(sections);
}
```

**Token 消耗：** 按需分配（避免返工）

---

## 适用场景

### ✅ 推荐使用

| 场景 | 原因 | 节省效果 |
|------|------|----------|
| **长文写作** | 结构复杂，易跑题 | 50-70% |
| **方案设计** | 需要多轮确认 | 40-60% |
| **代码开发** | 架构决定成败 | 60-80% |
| **创意创作** | 方向可能偏差 | 50-70% |

### ❌ 不推荐

| 场景 | 原因 |
|------|------|
| 简单翻译 | 一次性完成更好 |
| 数据查询 | 无需大纲 |
| 格式转换 | 结构固定 |
| 简短回答 |  overhead 过高 |

---

## 成本对比

### 场景 1：写 10000 字小说

**传统方式：**
```
第 1 次生成：Qwen3-Max × 15000 Token = ¥2.25
用户：不对，重写

第 2 次生成：Qwen3-Max × 15000 Token = ¥2.25
用户：还是不对

第 3 次生成：Qwen3-Max × 15000 Token = ¥2.25
用户：差不多了，再改改

第 4 次修改：Qwen3-Max × 5000 Token = ¥0.75
总计：45000 Token，¥6.75
```

**渐进式：**
```
阶段 1：生成大纲 - MiniMax × 800 Token = ¥0.02
用户确认：✓ 满意

阶段 2：分章节生成（10 章）
  - 批量处理，每章 1500 Token
  - 10 章 × 1500 Token × Qwen3.5-Plus = ¥0.72
总计：15800 Token，¥0.74

节省：65% Token + 89% 成本 🎉
```

### 场景 2：设计方案

**传统方式：**
```
生成完整方案：30000 Token
用户：方向错了

重新生成：30000 Token
用户：这次可以，但细节不够

补充细节：10000 Token
总计：70000 Token
```

**渐进式：**
```
大纲：1000 Token
用户确认：✓

方案主体：15000 Token
用户确认：✓

细节填充：8000 Token
总计：24000 Token

节省：66% 🎉
```

---

## 智能判断

### 何时使用渐进式

```typescript
function shouldUseProgressive(task: Task): boolean {
  const score = (
    (task.expectedLength > 5000 ? 0.3 : 0) +
    (task.complexity > 7 ? 0.3 : 0) +
    (task.creativityRequired > 7 ? 0.2 : 0) +
    (task.hasMultipleStakeholders ? 0.2 : 0)
  );
  
  return score >= 0.5;
}
```

### 自动降级

```typescript
// 如果用户快速确认，后续跳过确认
let skipConfirmation = false;

if (userResponseTime < 5000) {  // 5 秒内确认
  skipConfirmation = true;
}

// 如果连续 3 次快速确认，后续任务自动跳过
if (consecutiveQuickConfirmations >= 3) {
  skipConfirmation = true;
}
```

---

## 使用示例

### 基础用法

```typescript
import { ProgressiveProcessor } from './progressive-processor';

const processor = new ProgressiveProcessor({
  autoSubmit: false,      // 需要用户确认
  maxIterations: 3,       // 最多 3 轮修改
  useLightweightForOutline: true,  // 大纲用轻量模型
});

// 处理任务
const result = await processor.process(task);

// 查看节省
console.log(`节省 Token: ${result.tokenSaved}`);
console.log(`节省成本：${result.costSaved}`);
```

### 高级用法

```typescript
// 自定义确认流程
const processor = new ProgressiveProcessor({
  customConfirmation: async (outline) => {
    // 发送到 Slack/微信等确认
    await sendToSlack(`请确认大纲：${outline}`);
    const response = await waitForUserResponse();
    return response.approved;
  },
  
  // 大纲模板
  outlineTemplate: `
# {title}

## 概述
{overview}

## 章节
{sections}

## 预期结果
{expectedOutcome}
`,
  
  // 自动跳过确认的条件
  autoSkipConditions: {
    quickResponseTime: 5000,    // 5 秒内
    consecutiveCount: 3,         // 连续 3 次
    trustedUser: true,           // 信任用户
  },
});
```

---

## 性能监控

### 统计指标

```typescript
interface ProgressiveStats {
  totalTasks: number;
  usedProgressive: number;
  skippedProgressive: number;
  avgTokenSaved: number;
  avgTimeSaved: number;
  userSatisfaction: number;
  reworkRate: number;
}
```

### 示例输出

```
渐进式处理统计
├─ 总任务数：156
├─ 使用渐进式：89 (57%)
├─ 跳过渐进式：67 (43%)
├─ 平均节省 Token: 18,500 (62%)
├─ 平均节省时间：45 秒 (58%)
├─ 用户满意度：4.6/5
└─ 返工率：3.2% (vs 传统 35%)
```

---

## 最佳实践

### ✅ 推荐

1. **长任务必用** - >5000 字的任务
2. **复杂任务必用** - 复杂度>7 的任务
3. **多利益相关者** - 需要多方确认
4. **创意类任务** - 方向容易偏差
5. **记录用户偏好** - 学习确认习惯

### ❌ 避免

1. **简单任务使用** - overhead 过高
2. **紧急任务使用** - 用户确认耗时
3. **结构固定任务** - 无需大纲
4. **忽略用户反馈** - 失去渐进式意义

---

## 与批量处理结合

```typescript
// 渐进式 + 批量处理 = 最大节省

// 阶段 1：批量生成大纲
const outlines = await batchProcessor.process(
  tasks.map(t => ({ type: 'outline', task: t }))
);

// 用户一次性确认所有大纲
const approved = await userConfirmAll(outlines);

// 阶段 2：批量填充细节
const results = await batchProcessor.process(
  approved.map(t => ({ type: 'detail', task: t }))
);
```

**双重节省：**
- 渐进式：60-70%
- 批量处理：50-60%
- **累计：80-90%** 🎉

---

## 预期效果

### Token 节省

| 任务类型 | 传统方式 | 渐进式 | 节省 |
|----------|----------|--------|------|
| 短篇（<3000 字） | 5000 | 4000 | 20% |
| 中篇（3000-8000 字） | 12000 | 5000 | 58% |
| 长篇（>8000 字） | 25000 | 9000 | 64% |
| 方案设计 | 30000 | 10000 | 67% |

### 返工率

| 方式 | 返工率 | 平均返工次数 |
|------|--------|--------------|
| 传统 | 35% | 2.3 次 |
| 渐进式 | 3.2% | 0.1 次 |

---

*渐进式处理器 v1.0*  
*创建时间：2026-04-05*  
*预期节省：50-70% Token + 60-80% 返工减少*
