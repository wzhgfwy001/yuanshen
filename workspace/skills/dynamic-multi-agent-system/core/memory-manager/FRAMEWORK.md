# 记忆机制框架

## 记忆类型

| 类型 | 说明 | 例子 |
|------|------|------|
| user_preference | 用户偏好 | "喜欢详细说明"、"不主动启用Dreaming" |
| success_pattern | 成功模式 | "复杂任务用多Agent效果好" |
| failure_lesson | 失败教训 | "上次XX方法失败，改用YY" |
| context | 上下文 | "当前项目是高考志愿系统" |

## 记忆存储格式

```json
{
  "type": "user_preference|success_pattern|failure_lesson|context",
  "content": "记忆内容",
  "source": "task-id或来源",
  "confidence": 0.0-1.0,
  "created_at": "ISO时间戳",
  "last_accessed": "ISO时间戳"
}
```

## 记忆调用时机

| 时机 | 操作 |
|------|------|
| 任务开始时 | 读取相关记忆（user_preference, success_pattern, failure_lesson） |
| 任务进行中 | 记录关键决策点 |
| 任务完成时 | 写入成功/失败经验 |

## 记忆检索

- 基于关键词检索
- 基于类型检索
- 基于时间衰减的置信度

## 核心原则

1. **高置信度优先**：confidence > 0.8 的记忆优先使用
2. **时间衰减**：超过30天的记忆置信度降低
3. **来源追溯**：重要记忆保留source便于核实
