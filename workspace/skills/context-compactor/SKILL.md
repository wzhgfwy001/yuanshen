# context-compactor

**【心灵缩减】Psyche Reduce** — 

上下文分级压缩系统 - 参考Claude Code三层压缩管道设计

## 灵感来源

Claude Code的三层压缩：
```
MicroCompact → AutoCompact → Full Compact
```

## 我们的实现：三级压缩

### Level 1 - MicroCompact（轻度压缩）

**触发条件：** 上下文 > 60%

**策略：**
- 删除重复的确认消息
- 压缩长解释为简短摘要
- 移除冗余的日志输出

**示例：**
```
原始：
"好的，我已经完成了以下步骤：
1. 连接数据库成功
2. 查询数据成功
3. 处理数据成功
4. 返回结果成功"

压缩后：
"[已完成] 连接数据库 → 查询 → 处理 → 返回结果"
```

### Level 2 - AutoCompact（自动压缩）

**触发条件：** 上下文 > 75%

**策略：**
- 将多轮对话压缩为关键意图
- 用 {{SUMMARY:...}} 格式替换完整历史
- 保留最近5轮完整对话

**格式：**
```
{{SUMMARY:
[上午对话摘要]
- 用户查询高考志愿数据
- 完成了筛选条件设置
- 等待用户输入分数

[下午对话摘要]
- 用户输入了520分
- 生成了志愿推荐列表
- 用户询问某大学详情
}}
```

### Level 3 - Full Compact（完全压缩）

**触发条件：** 上下文 > 90%

**策略：**
- 只保留核心上下文（用户身份、项目状态、当前任务）
- 所有历史对话压缩为摘要
- 未来的对话会逐步重建上下文

**格式：**
```
{{FULL_COMPACT:
[身份] 主人，中文用户，正在开发高考志愿小程序
[项目] 微信小程序v1.6，已完成核心筛选功能
[当前] 等待用户输入分数以生成志愿推荐
[偏好] 高端UI设计，简洁高效
}}
```

## 压缩执行规则

1. **不丢失关键信息**
   - 用户姓名、偏好设置
   - 项目核心状态
   - 当前任务目标

2. **标记而非删除**
   - 用 {{和}} 标记压缩内容
   - 需要时可还原

3. **渐进式压缩**
   - 先L1，不够用再L2，再L3
   - 避免过度压缩

## 使用场景

- 长对话（超过30轮）自动触发
- 用户要求"总结一下"
- 系统检测到上下文即将溢出
- 切换任务时压缩旧任务上下文

## 关联机制

### 与记忆系统联动
```
压缩时：
1. 当前上下文 → 压缩存储
2. 关键信息 → 写入阴神记忆
3. 任务状态 → 写入 brain/tasks/
```

### 与Task系统联动
```
任务切换时：
1. 旧任务上下文 → 压缩存储
2. 新任务 → 加载必要上下文
3. 旧任务摘要 → 挂起等待恢复
```

---

## 配置参数

```javascript
COMPACT_THRESHOLDS: {
  MICRO: 60,   // 60% 开始L1
  AUTO: 75,    // 75% 开始L2
  FULL: 90     // 90% 开始L3
}

KEEP_RECENT_TURNS: 5   // L2时保留最近5轮
SUMMARY_MAX_TOKENS: 500 // 摘要最大长度
```

## 实际代码

**文件：** `context-compactor.js`

### 核心函数

```javascript
const cc = require('./context-compactor.js');

// 压缩上下文
cc.compact(messages);

// 获取使用率
cc.calculateUsage(messages);

// 获取状态
cc.getStatus();

// 重置
cc.reset();
```

### 触发方式

```javascript
// 检查是否需要压缩
const usage = cc.calculateUsage(messages);
if (usage.level > 0) {
  const result = cc.compact(messages);
  // 使用 result.messages
}
```

---

_最后更新：2026-04-12_
