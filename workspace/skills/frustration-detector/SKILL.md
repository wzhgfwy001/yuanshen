# frustration-detector

**【感知恶魔】Sense Demons** — 

**「感知恶魔」Sense Demons** — 情绪感知与用户不满检测系统

## 触发条件

当用户出现以下情况时自动激活：
- 连续2次以上任务失败
- 用户表达不满（"不对"/"不是"/"错了"/"重来"等）
- 同一问题重复询问
- 长时间等待后催促

## 核心检测模式

### 1. 显式负面反馈
- "不对"、"不是这样"、"错了"、"重来"
- "太慢了"、"等好久"、"卡死了"
- "听不懂"、"说清楚"、"解释"
- "不满意"、"不好用"、"没用"

### 2. 隐式负面信号
- 同一问题3次以上重复
- 快速连续发送多条消息（烦躁）
- 使用感叹号（激动情绪）
- 长时间沉默后突然发消息

### 3. 失败模式统计
- 单次任务失败 → 记录
- 连续2次失败 → 警告
- 连续3次失败 → 触发安抚机制

## 响应策略

### Level 1 - 轻微不满（检测到1个信号）
```
措辞：稍微柔和
示例："我理解可能没有完全符合预期，让我重新理解一下您的需求"
```

### Level 2 - 中度不满（检测到2个信号或1次失败）
```
措辞：道歉 + 主动询问
示例："抱歉让您费心了，能具体说说哪里不符合预期吗？"
```

### Level 3 - 严重不满（3个以上信号或连续失败）
```
措辞：深度道歉 + 提出解决方案
示例："非常抱歉给您带来困扰。我理解这件事对您很重要，让我换一种方式来处理这个问题。"
```

## 实现机制

### 情绪状态追踪
```javascript
// 保存在 SESSION-STATE.md
frustration_state: {
  negative_count: 0,      // 负面信号计数
  consecutive_failures: 0, // 连续失败次数
  last_negative_time: null,
  last_failure_time: null,
  reset_timer: 300000    // 5分钟内无负面则重置
}
```

### 信号检测规则
```
信号权重：
- 明确否定词：+1
- 失败任务记录：+2
- 重复问题：+1
- 使用感叹号：+1
- 连续消息（3条内）：+1

阈值：
- Level 1: 1-2分
- Level 2: 3-4分
- Level 3: 5分+
```

## 使用方式

当检测到用户可能不满时，调用此skill获取合适的响应策略。

## 关联Skill

- `code-review` - 任务失败时自动触发代码审查
- `dynamic-multi-agent-system` - 复杂任务失败时启用多Agent协作

## 实际代码

**文件：** `frustration-detector.js`

### 核心函数

```javascript
const fd = require('./frustration-detector.js');

// 检测用户情绪
fd.detect(message, {failure: false});

// 获取当前状态
fd.getStatus();

// 重置状态
fd.reset();
```

### 触发方式

在处理用户消息时自动调用：
```javascript
const result = fd.detect(userMessage);
if (result.level > 0) {
  // 使用 result.strategy.message 作为回应
}
```

---

_最后更新：2026-04-12_
