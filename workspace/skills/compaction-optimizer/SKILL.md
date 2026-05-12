# Compaction Optimizer Skill

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
