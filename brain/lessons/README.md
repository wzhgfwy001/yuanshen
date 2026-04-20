# Lessons（失败教训）数据格式

## 目录说明
`brain/lessons/` 存储从失败任务中提取的教训和避坑指南。

## 数据格式

### 文件命名规则
```
{timestamp}-{agent_name}-{lesson_type}.md
```

- `timestamp`: ISO 8601 格式时间戳（到秒）
- `agent_name`: 经历此教训的Agent名称
- `lesson_type`: 教训类型（如: error-handling, data-quality, communication）

### 文件内容模板

```markdown
---
id: lesson-uuid-v4
created_at: 2026-04-20T19:19:00+08:00
agent: 白哉
type: error-handling
severity: high
tags: [api, timeout, retry]
occurrence_count: 3
resolved: true
---

# 教训名称

## 问题描述
描述失败的具体情况和错误现象。

## 根本原因
分析失败的深层原因，而非表面现象。

## 影响范围
- 对哪些功能造成影响？
- 影响了多少用户/任务？
- 数据是否丢失？

## 解决方案
描述最终解决问题的方案。

## 预防措施
未来如何避免同样的问题再次发生？

## 关键警示
⚠️ **重要注意事项**

## 相关教训
- [教训A](./2026-04-20-kurosaki-error-handling.md)
- [教训B](./2026-04-20-ace-data-quality.md)

## 改进建议
系统层面可以做哪些改进？
```

## 教训类型分类

### error-handling（错误处理）
- API调用失败处理
- 异常捕获机制
- 重试策略

### data-quality（数据质量）
- 数据验证缺失
- 数据格式错误
- 数据不一致

### communication（沟通问题）
- 需求理解错误
- 用户反馈被忽略
- 沟通不及时

### performance（性能问题）
- 响应时间过长
- 资源占用过高
- 并发处理不当

### security（安全问题）
- 权限配置错误
- 敏感信息泄露
- 输入验证缺失

## 严重程度等级

### critical（严重）
- 导致数据丢失
- 系统崩溃
- 安全漏洞

### high（高）
- 功能不可用
- 用户体验严重受损
- 需要立即修复

### medium（中）
- 功能降级
- 用户体验受损
- 应尽快修复

### low（低）
- 边缘功能受影响
- 用户体验轻微受损
- 可择期修复

## 示例文件

### 文件：`2026-04-20T14:30:00-baizan-error-handling-api-timeout.md`

```markdown
---
id: lesson-001
created_at: 2026-04-20T14:30:00+08:00
agent: 白哉
type: error-handling
severity: high
tags: [api, timeout, retry]
occurrence_count: 3
resolved: true
---

# API调用超时未处理

## 问题描述
调用外部API时，超时未设置合理的时间限制，导致长时间阻塞。

**错误现象：**
- 请求一直等待直到系统超时
- 用户体验差，等待时间过长
- 资源被长时间占用

## 根本原因
1. 没有为API调用设置超时参数
2. 没有实现重试机制
3. 没有超时后的降级方案

## 影响范围
- 影响所有外部API调用
- 用户等待时间最长达到60秒
- 占用大量连接资源

## 解决方案
```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def call_api_with_retry(url, params=None, timeout=10, max_retries=3):
    """带重试和超时的API调用"""
    session = requests.Session()

    # 配置重试策略
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    try:
        response = session.get(url, params=params, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        log_error(f"API timeout after {timeout}s: {url}")
        return {"error": "timeout", "fallback": None}
    except requests.exceptions.RequestException as e:
        log_error(f"API request failed: {e}")
        return {"error": str(e), "fallback": None}
```

## 预防措施
1. **所有外部API调用必须设置超时**
   - 默认超时：10秒
   - 可根据服务调整：5-30秒

2. **实现重试机制**
   - 指数退避策略
   - 最大重试次数：3次
   - 对特定错误码重试

3. **提供降级方案**
   - 超时后返回缓存数据
   - 或返回默认值
   - 记录失败日志

## 关键警示
⚠️ **所有外部API调用都必须包含超时和重试机制！**
⚠️ **不要假设API总是可用的！**

## 相关教训
- [缓存策略失效](./2026-04-20T15:00:00-baizan-performance-cache.md)
- [依赖服务不可用](./2026-04-20T16:00:00-ace-error-handling-dependency.md)

## 改进建议
1. 创建统一的API调用工具函数
2. 添加API健康检查机制
3. 实现熔断器模式
4. 监控API调用成功率
```

## 查询API

### 按严重程度查询
```python
lessons = query_lessons(severity="high")
```

### 按类型查询
```python
lessons = query_lessons(type="error-handling")
```

### 按Agent查询
```python
lessons = query_lessons(agent="白哉")
```

### 按标签查询
```python
lessons = query_lessons(tags=["api", "timeout"])
```

### 查询未解决的教训
```python
lessons = query_lessons(resolved=False)
```

## 预警机制

### 频繁出现的教训
- 如果同一教训在7天内出现3次以上 → 发送预警
- 提示可能存在系统性问题

### 未解决的高严重性教训
- severity="high" 且 resolved=false → 每日提醒
- severity="critical" 且 resolved=false → 立即预警

### 教训聚合分析
- 按类型统计教训数量
- 识别系统性问题
- 生成周报/月报

## 更新机制

- 每次发生类似错误，`occurrence_count` +1
- 问题解决后，`resolved` 设为 true
- 每月审查，删除已过期的教训（resolved > 90天）
