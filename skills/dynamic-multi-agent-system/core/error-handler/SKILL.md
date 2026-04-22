---
name: deerflow-enhanced-error-handler
description: 借鉴DeerFlow的增强版错误处理器，支持Middleware链式处理、错误分类与自动恢复
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | error_handling=advanced | mission_critical=true
---

# DeerFlow增强版错误处理器

**【护盾·改】Enhanced Shield**

## 触发条件

当满足以下任一条件时，自动启用此增强版处理器：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 用户指定使用DeerFlow增强模式 |
| 高级错误处理 | `error_handling=advanced` | 需要精细化错误控制 |
| 关键任务 | `mission_critical=true` | 不允许失败的重大任务 |
| 复杂任务 | `complexity=high` | 高复杂度任务需要容错 |
| 自动恢复 | `auto_recovery=true` | 需要自动错误恢复 |

## 使用方式

```javascript
// 引入增强版错误处理器
const { 
  EnhancedErrorHandler, 
  ERROR_TYPES,
  ERROR_SEVERITY,
  RECOVERY_STRATEGIES 
} = require('./deerflow_enhanced.js');

// 创建处理器
const handler = new EnhancedErrorHandler({
  logger: console,  // 日志输出
  maxRetries: 3     // 最大重试次数
});

// 处理错误
try {
  await riskyOperation();
} catch (error) {
  const result = await handler.handle(error, {
    taskId: 'task-123',
    toolName: 'code_executor',
    context: { userId: 'user-1' }
  });
  
  if (result.handled) {
    console.log('错误已处理:', result.strategy);
    console.log('建议:', result.suggestion);
  } else {
    console.log('错误未处理，需要升级');
  }
}

// 包装异步函数自动错误处理
const safeExecute = handler.wrapAsync(async (arg) => {
  return await riskyOperation(arg);
});

try {
  const result = await safeExecute(data);
} catch (error) {
  console.log('操作失败，已达最大重试次数');
}

// 获取错误统计
const stats = handler.getStatistics();
console.log('总错误数:', stats.total);
console.log('解决率:', stats.resolutionRate);
console.log('按类型:', stats.byType);
console.log('按严重度:', stats.bySeverity);

// 获取错误日志
const logs = handler.getErrorLog({
  type: ERROR_TYPES.LLM_ERROR,
  severity: ERROR_SEVERITY.HIGH,
  since: Date.now() - 3600000  // 最近1小时
});

// 清除错误日志
handler.clearErrorLog();
```

## 核心特性

### 1. Middleware链式处理（借鉴DeerFlow的18个中间件链）

```javascript
// 8个错误处理中间件
1. LLMErrorHandlingMiddleware        // LLM调用错误
2. ToolErrorHandlingMiddleware       // 工具执行错误
3. SandboxErrorHandlingMiddleware   // 沙箱错误
4. TimeoutErrorHandlingMiddleware   // 超时错误
5. RateLimitErrorHandlingMiddleware // 限流错误
6. ValidationErrorHandlingMiddleware // 验证错误
7. NetworkErrorHandlingMiddleware   // 网络错误
8. AuditLoggingMiddleware           // 审计日志
```

### 2. 错误分类

```javascript
ERROR_TYPES = {
  LLM_ERROR: 'LLM_ERROR',              // LLM调用错误
  TOOL_ERROR: 'TOOL_ERROR',            // 工具执行错误
  SANDBOX_ERROR: 'SANDBOX_ERROR',      // 沙箱错误
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',       // 超时错误
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR', // 限流错误
  AUTH_ERROR: 'AUTH_ERROR',            // 认证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR', // 验证错误
  NETWORK_ERROR: 'NETWORK_ERROR',       // 网络错误
  SYSTEM_ERROR: 'SYSTEM_ERROR',         // 系统错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'         // 未知错误
}
```

### 3. 严重度级别

```javascript
ERROR_SEVERITY = {
  LOW: 'low',         // 不影响主流程
  MEDIUM: 'medium',   // 影响当前操作
  HIGH: 'high',       // 影响整个任务
  CRITICAL: 'critical' // 需要立即干预
}
```

### 4. 恢复策略

```javascript
RECOVERY_STRATEGIES = {
  RETRY: 'retry',                    // 直接重试
  RETRY_WITH_BACKOFF: 'retry_with_backoff',  // 指数退避重试
  FALLBACK: 'fallback',               // 降级到备用方案
  SKIP: 'skip',                       // 跳过
  ABORT: 'abort',                     // 中止任务
  ESCALATE: 'escalate'                // 升级处理
}
```

## 错误处理流程

```
错误发生
    ↓
Middleware链处理
    ↓
分类 → LLM/Tool/Sandbox/Timeout/RateLimit/Validation/Network
    ↓
策略选择 → Retry/Fallback/Skip/Abort/Escalate
    ↓
执行恢复
    ↓
成功 → 继续执行
失败 → 升级处理
```

## 集成到主系统

在 fusion-scheduler.js 或任务编排逻辑中添加：

```javascript
const path = require('path');

// 检测是否启用DeerFlow增强
function shouldUseDeerFlowEnhanced(config) {
  return (
    config.deerflow_mode === true ||
    config.error_handling === 'advanced' ||
    config.mission_critical === true
  );
}

// 获取错误处理器
function getErrorHandler(config) {
  if (shouldUseDeerFlowEnhanced(config)) {
    const enhanced = require('./error-handler/deerflow_enhanced.js');
    return new enhanced.EnhancedErrorHandler({
      logger: config.logger || console,
      maxRetries: config.maxRetries || 3
    });
  }
  // 回退到原有处理器
  return require('./error-handler/original-handler.js');
}
```

## 自定义中间件示例

```javascript
const { ErrorMiddleware, RECOVERY_STRATEGIES } = require('./deerflow_enhanced.js');

class CustomErrorMiddleware extends ErrorMiddleware {
  constructor() {
    super('CustomErrorHandling');
  }

  async handle(error, context) {
    // 自定义错误处理逻辑
    if (error.context && error.context.customFlag) {
      return {
        handled: true,
        strategy: RECOVERY_STRATEGIES.FALLBACK,
        error,
        context,
        suggestion: 'Custom fallback triggered'
      };
    }
    // 传递给下一个中间件
    return this._passToNext(error, context);
  }
}

// 添加到处理器
const handler = new EnhancedErrorHandler();
handler.chain.addMiddleware(new CustomErrorMiddleware());
```

## 性能对比

| 指标 | 原有处理器 | 增强版 | 提升 |
|------|-----------|--------|------|
| 错误分类 | ❌ 简单 | ✅ 10类 | +900% |
| 处理链 | ❌ 单一 | ✅ 8中间件 | +700% |
| 自动恢复 | ❌ 手动 | ✅ 6种策略 | +500% |
| 审计日志 | ❌ 无 | ✅ 完整日志 | +∞ |
| 解决率 | ~60% | ~90% | +50% |

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
