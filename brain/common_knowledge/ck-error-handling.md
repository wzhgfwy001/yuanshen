# 错误处理规范

## 原则
1. **具体捕获**：except 只捕获已知异常类型
2. **记录日志**：记录错误时包含上下文
3. **优雅降级**：出错时提供备用方案
4. **用户友好**：错误信息对用户可理解

## Python 错误处理
```python
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"操作失败: {e}")
    return fallback_result()
except Exception as e:
    logger.exception("未知错误")
    raise
```

## 外部 API 调用
- 必须设置 timeout（10-30秒）
- 实现重试机制（最多3次）
- 提供降级方案

## 触发条件
- 任何涉及外部调用的任务
- 任何需要错误恢复的任务
