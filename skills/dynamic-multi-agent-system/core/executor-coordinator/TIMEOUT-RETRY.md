# 超时重试策略 - 实现方案

**版本：** v1.0  
**实施时间：** 2026-04-04  
**优先级：** P1  
**状态：** 开发中

---

## 功能设计

### 1. 超时检测器

```python
import time
from enum import Enum

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"

class TimeoutDetector:
    """超时检测器"""
    
    def __init__(self):
        self.task_start_times = {}
        self.subagent_last_heartbeats = {}
    
    def check_task_timeout(self, task_id: str, timeout_seconds: int = 3600) -> bool:
        """检查任务是否超时"""
        if task_id not in self.task_start_times:
            return False
        
        elapsed = time.time() - self.task_start_times[task_id]
        return elapsed > timeout_seconds
    
    def check_subagent_timeout(self, subagent_id: str, timeout_seconds: int = 300) -> bool:
        """检查子 Agent 是否超时"""
        if subagent_id not in self.subagent_last_heartbeats:
            return False
        
        elapsed = time.time() - self.subagent_last_heartbeats[subagent_id]
        return elapsed > timeout_seconds
    
    def update_heartbeat(self, subagent_id: str):
        """更新子 Agent 心跳"""
        self.subagent_last_heartbeats[subagent_id] = time.time()
```

### 2. 重试策略

```python
class RetryStrategy:
    """重试策略"""
    
    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
        self.retry_counts = {}
    
    def should_retry(self, task_id: str) -> bool:
        """判断是否应该重试"""
        current_count = self.retry_counts.get(task_id, 0)
        return current_count < self.max_retries
    
    def get_retry_count(self, task_id: str) -> int:
        """获取当前重试次数"""
        return self.retry_counts.get(task_id, 0)
    
    def increment_retry(self, task_id: str):
        """增加重试次数"""
        self.retry_counts[task_id] = self.retry_counts.get(task_id, 0) + 1
    
    def calculate_backoff(self, retry_count: int) -> int:
        """计算退避时间（指数退避）"""
        base_delay = 1000  # 1 秒
        max_delay = 60000  # 1 分钟
        
        # 指数退避：1s, 2s, 4s, 8s, ...
        delay = base_delay * (2 ** retry_count)
        
        # 添加 30% 随机抖动
        import random
        jitter = random.uniform(0, 0.3) * delay
        
        return min(delay + jitter, max_delay)
```

### 3. 超时处理流程

```python
class TimeoutHandler:
    """超时处理器"""
    
    def __init__(self):
        self.detector = TimeoutDetector()
        self.retry_strategy = RetryStrategy(max_retries=3)
    
    def handle_task_timeout(self, task: dict) -> dict:
        """处理任务超时"""
        task_id = task["id"]
        
        # 检查是否可以重试
        if self.retry_strategy.should_retry(task_id):
            # 增加重试次数
            self.retry_strategy.increment_retry(task_id)
            
            # 计算退避时间
            backoff_ms = self.retry_strategy.calculate_backoff(
                self.retry_strategy.get_retry_count(task_id)
            )
            
            return {
                "action": "retry",
                "task_id": task_id,
                "retry_count": self.retry_strategy.get_retry_count(task_id),
                "backoff_ms": backoff_ms,
                "message": f"任务超时，{backoff_ms/1000:.1f}秒后重试（第{self.retry_strategy.get_retry_count(task_id)}次重试）"
            }
        else:
            # 超过最大重试次数，标记失败
            return {
                "action": "fail",
                "task_id": task_id,
                "retry_count": self.retry_strategy.get_retry_count(task_id),
                "message": f"任务超时，已超过最大重试次数（{self.retry_strategy.max_retries}次）"
            }
    
    def handle_subagent_timeout(self, subagent: dict) -> dict:
        """处理子 Agent 超时"""
        subagent_id = subagent["id"]
        task_id = subagent["task_id"]
        
        # 终止超时的子 Agent
        self._terminate_subagent(subagent_id)
        
        # 通知主 Agent
        notification = {
            "type": "subagent_timeout",
            "subagent_id": subagent_id,
            "task_id": task_id,
            "message": f"子 Agent {subagent_id} 超时，已终止"
        }
        
        # 尝试重试子 Agent
        if self.retry_strategy.should_retry(subagent_id):
            self.retry_strategy.increment_retry(subagent_id)
            
            return {
                "action": "retry_subagent",
                "subagent_id": subagent_id,
                "task_id": task_id,
                "retry_count": self.retry_strategy.get_retry_count(subagent_id),
                "notification": notification
            }
        else:
            return {
                "action": "notify_parent",
                "subagent_id": subagent_id,
                "task_id": task_id,
                "notification": notification
            }
    
    def _terminate_subagent(self, subagent_id: str):
        """终止子 Agent"""
        # 实际实现中会调用子 Agent 终止 API
        pass
```

### 4. 监控和日志

```python
import logging
from datetime import datetime

class TimeoutMonitor:
    """超时监控器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.timeout_events = []
    
    def log_timeout_event(self, event: dict):
        """记录超时事件"""
        event["timestamp"] = datetime.now().isoformat()
        self.timeout_events.append(event)
        
        # 记录日志
        self.logger.warning(f"超时事件：{event}")
    
    def get_timeout_stats(self) -> dict:
        """获取超时统计"""
        total_timeouts = len(self.timeout_events)
        today_timeouts = len([
            e for e in self.timeout_events 
            if e["timestamp"].startswith(datetime.now().date().isoformat())
        ])
        
        retry_success = len([
            e for e in self.timeout_events 
            if e.get("action") == "retry" and e.get("success", False)
        ])
        
        return {
            "total_timeouts": total_timeouts,
            "today_timeouts": today_timeouts,
            "retry_success_rate": retry_success / total_timeouts if total_timeouts > 0 else 0
        }
```

---

## 配置示例

```json
{
  "timeout": {
    "task_timeout_seconds": 3600,
    "subagent_timeout_seconds": 300,
    "heartbeat_interval_seconds": 30,
    "max_retries": 3,
    "backoff": {
      "base_delay_ms": 1000,
      "max_delay_ms": 60000,
      "jitter_factor": 0.3
    }
  },
  "monitoring": {
    "enabled": true,
    "log_level": "WARNING",
    "alert_on_max_retries": true
  }
}
```

---

## 使用示例

### 示例 1：任务超时重试

```python
handler = TimeoutHandler()

# 模拟任务超时
task = {"id": "task-001"}
result = handler.handle_task_timeout(task)

print(result)
# 输出：
# {
#   "action": "retry",
#   "task_id": "task-001",
#   "retry_count": 1,
#   "backoff_ms": 2300,
#   "message": "任务超时，2.3 秒后重试（第 1 次重试）"
# }
```

### 示例 2：子 Agent 超时处理

```python
# 模拟子 Agent 超时
subagent = {"id": "agent-001", "task_id": "task-001"}
result = handler.handle_subagent_timeout(subagent)

print(result)
# 输出：
# {
#   "action": "retry_subagent",
#   "subagent_id": "agent-001",
#   "task_id": "task-001",
#   "retry_count": 1
# }
```

---

## 实施计划

### 阶段 1：核心功能（1 天）
- [ ] 实现超时检测器
- [ ] 实现重试策略
- [ ] 实现退避算法

### 阶段 2：处理流程（1 天）
- [ ] 实现任务超时处理
- [ ] 实现子 Agent 超时处理
- [ ] 实现通知机制

### 阶段 3：监控日志（1 天）
- [ ] 实现事件记录
- [ ] 实现统计分析
- [ ] 实现告警功能

---

*超时重试策略实现方案 v1.0*  
*创建时间：2026-04-04 23:18*
