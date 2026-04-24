---
name: smart-retry
description: 智能重试系统，支持指数退避、抖动、错误分类重试策略匹配
parent: dynamic-multi-agent-system
version: 1.1.0
---

# 智能重试系统 v1.1

## 功能概述

| 功能 | 说明 |
|------|------|
| 多种重试策略 | 指数退避、线性退避、固定延迟、抖动 |
| 错误分类映射 | 根据错误码自动匹配最优策略 |
| 可配置重试次数 | 3-10次可配置 |
| 超时控制 | 防止无限等待 |
| 智能终止 | 非重试错误立即中止 |

---

## 快速使用

```typescript
const result = await executeWithRetry(
  async () => { /* 操作 */ },
  {
    maxAttempts: 5,
    strategy: 'exponential',
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  }
);
```

---

## 策略类型

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `exponential` | 指数退避 | 网络请求、API调用 |
| `linear` | 线性退避 | 资源竞争、锁等待 |
| `fixed` | 固定延迟 | 稳定错误、快速失败 |
| `jitter` | 随机抖动 | 避免惊群问题 |

详细策略配置见：[references/RETRY-PATTERNS.md](references/RETRY-PATTERNS.md)

---

## 错误码重试映射

| 错误类型 | 默认策略 | 典型错误码 |
|----------|----------|------------|
| 网络错误 | 指数退避+抖动 | ERR-NET-0101, ERR-NET-0102 |
| API限流 | 长周期指数退避 | ERR-API-0203, ERR-API-0204 |
| Agent错误 | 中等指数退避 | ERR-AGT-0301, ERR-AGT-0303 |
| 超时错误 | 固定+指数混合 | ERR-TIME-1101 |
| 模型错误 | 长周期退避 | ERR-MODEL-1402, ERR-MODEL-1403 |

**完整映射表：** [references/RETRY-PATTERNS.md](references/RETRY-PATTERNS.md)

---

## 场景推荐

| 场景 | 推荐配置 |
|------|----------|
| 网络请求 | maxAttempts: 5, 指数退避 1s-30s, 抖动 |
| API限流 | maxAttempts: 10, 指数退避 10s-600s, 抖动 |
| 文件操作 | maxAttempts: 3, 快速退避 0.5s-5s |
| 模型调用 | maxAttempts: 5, 指数退避 2s-120s |

---

## 最佳实践

### ✅ 推荐
1. **网络操作用指数退避** - 避免雪崩效应
2. **添加随机抖动** - 防止惊群问题
3. **设置合理上限** - 5次重试+30s最大延迟通常足够
4. **区分可恢复错误** - 不重试严重错误

### ❌ 避免
1. **无限重试** - 必然导致系统hang
2. **无抖动固定间隔** - 多个客户端同时重试会同步
3. **对严重错误重试** - 权限问题不应重试
4. **重试时间过长** - 用户体验差

---

*详细重试策略见 references/RETRY-PATTERNS.md*
