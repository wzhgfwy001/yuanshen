# Compaction Optimizer Skill

## 🎯 快速使用

**触发场景：**
- 用户发起明确任务（如"写代码"、"写小说"、"分析数据"）→ 自动调用此Skill调整压缩配置
- 上下文超过60%且compaction次数异常（>30次/小时）→ 自动优化配置
- 系统检测到压缩配置不匹配当前任务类型 → 自动调整

**示例对话：**
- 用户："帮我写一个电商网站"
  → AI自动识别为"写代码"类型 → 自动应用 `reserveTokens: 60000, keepRecentTokens: 8000` 配置
- 用户："写一篇科幻小说"
  → AI自动识别为"写小说"类型 → 自动应用 `reserveTokens: 80000, keepRecentTokens: 12000` 配置

**不适用场景：**
- 简单问答（"今天天气如何"）不需要此Skill
- 用户已明确要求不调整压缩配置

---

## 功能
根据对话习惯和任务类型，动态调整 OpenClaw compaction 配置，减少不必要的压缩，提升响应速度。

## 触发条件
1. 用户发起任务类型明确（如：写代码、写小说、分析数据）
2. Compaction 次数异常（>30次/小时）
3. 上下文超过 60%（memory/compaction-log.json）

## 调整策略

### 任务类型 → Compaction 配置

| 任务类型 | reserveTokens | keepRecentTokens | maxHistoryShare | recentTurnsPreserve |
|----------|---------------|------------------|-----------------|---------------------|
| 闲聊 | 100000 | 15000 | 0.6 | 15 |
| 写代码 | 60000 | 8000 | 0.4 | 8 |
| 写小说 | 80000 | 12000 | 0.5 | 12 |
| 数据分析 | 70000 | 10000 | 0.45 | 10 |
| 通用 | 80000 | 10000 | 0.5 | 10 |

### 当前基准配置
```json
"compaction": {
  "reserveTokens": 80000,
  "keepRecentTokens": 10000,
  "maxHistoryShare": 0.5,
  "recentTurnsPreserve": 10
}
```

## 使用方法
无需手动触发，技能会在需要时自动分析并应用最优配置。

## 日志
调整记录会写入 `memory/compaction-log.json`
