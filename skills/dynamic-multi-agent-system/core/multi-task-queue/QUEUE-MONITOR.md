# 队列可视化监控面板 - 实现方案

**版本：** v1.0  
**实施时间：** 2026-04-04  
**优先级：** P1  
**状态：** 开发中

---

## 功能设计

### 1. 实时监控面板

```python
class QueueMonitor:
    """队列监控器"""
    
    def __init__(self):
        self.pending_queue = []  # 待处理队列
        self.running_tasks = []  # 运行中任务
        self.completed_tasks = []  # 已完成任务
        self.subagent_pool = []  # 子 Agent 池
    
    def get_status(self) -> dict:
        """获取队列状态"""
        return {
            "pending": {
                "count": len(self.pending_queue),
                "tasks": self.pending_queue
            },
            "running": {
                "count": len(self.running_tasks),
                "tasks": self.running_tasks,
                "active_subagents": sum(t.active_subagents for t in self.running_tasks)
            },
            "completed": {
                "count": len(self.completed_tasks),
                "today": len([t for t in self.completed_tasks if t.completed_today()])
            },
            "resources": {
                "available_task_slots": MAX_CONCURRENT_TASKS - len(self.running_tasks),
                "available_subagents": MAX_SUBAGENTS - sum(t.active_subagents for t in self.running_tasks),
                "total_subagents": MAX_SUBAGENTS
            }
        }
```

### 2. Web 可视化界面

```html
<!DOCTYPE html>
<html>
<head>
    <title>多 Agent 队列监控</title>
    <style>
        .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .card { background: #f0f9ff; padding: 20px; border-radius: 10px; }
        .metric { font-size: 36px; font-weight: bold; color: #0284c7; }
        .label { color: #64748b; margin-top: 5px; }
        .status-running { color: #16a34a; }
        .status-pending { color: #ea580c; }
        .status-completed { color: #2563eb; }
    </style>
</head>
<body>
    <h1>📊 多 Agent 队列实时监控</h1>
    
    <div class="dashboard">
        <!-- 待处理队列 -->
        <div class="card">
            <div class="metric status-pending" id="pending-count">0</div>
            <div class="label">待处理任务</div>
        </div>
        
        <!-- 运行中任务 -->
        <div class="card">
            <div class="metric status-running" id="running-count">0</div>
            <div class="label">运行中任务</div>
        </div>
        
        <!-- 已完成任务 -->
        <div class="card">
            <div class="metric status-completed" id="completed-count">0</div>
            <div class="label">今日完成</div>
        </div>
        
        <!-- 可用任务槽位 -->
        <div class="card">
            <div class="metric" id="task-slots">3</div>
            <div class="label">可用任务槽位</div>
        </div>
        
        <!-- 活跃子 Agent -->
        <div class="card">
            <div class="metric" id="active-subagents">0</div>
            <div class="label">活跃子 Agent</div>
        </div>
        
        <!-- 可用子 Agent -->
        <div class="card">
            <div class="metric" id="available-subagents">12</div>
            <div class="label">可用子 Agent</div>
        </div>
    </div>
    
    <script>
        // 每 5 秒刷新一次数据
        setInterval(async () => {
            const response = await fetch('/api/queue/status');
            const data = await response.json();
            updateDashboard(data);
        }, 5000);
        
        function updateDashboard(data) {
            document.getElementById('pending-count').textContent = data.pending.count;
            document.getElementById('running-count').textContent = data.running.count;
            document.getElementById('completed-count').textContent = data.completed.today;
            document.getElementById('task-slots').textContent = data.resources.available_task_slots;
            document.getElementById('active-subagents').textContent = data.running.active_subagents;
            document.getElementById('available-subagents').textContent = data.resources.available_subagents;
        }
    </script>
</body>
</html>
```

### 3. API 接口

```python
from flask import Flask, jsonify

app = Flask(__name__)
monitor = QueueMonitor()

@app.route('/api/queue/status')
def get_queue_status():
    """获取队列状态 API"""
    status = monitor.get_status()
    return jsonify(status)

@app.route('/api/queue/tasks/<task_id>')
def get_task_detail(task_id):
    """获取任务详情 API"""
    task = monitor.get_task(task_id)
    return jsonify(task.to_dict())

@app.route('/api/queue/subagents')
def get_subagents():
    """获取子 Agent 列表 API"""
    subagents = monitor.get_all_subagents()
    return jsonify([sa.to_dict() for sa in subagents])

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

---

## 实施计划

### 阶段 1：后端监控（1 天）
- [ ] 实现 QueueMonitor 类
- [ ] 实现状态收集逻辑
- [ ] 实现 API 接口

### 阶段 2：前端界面（1 天）
- [ ] 设计监控面板 UI
- [ ] 实现数据刷新
- [ ] 添加图表展示

### 阶段 3：告警功能（1 天）
- [ ] 实现阈值告警
- [ ] 实现邮件通知
- [ ] 实现日志记录

### 阶段 4：集成测试（1 天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试

---

## 监控指标

### 核心指标
| 指标 | 阈值 | 告警级别 |
|------|------|----------|
| 待处理任务数 | >10 | ⚠️ 警告 |
| 运行中任务数 | =3 | ℹ️ 提示 |
| 子 Agent 使用率 | >80% | ⚠️ 警告 |
| 任务平均等待时间 | >5 分钟 | ⚠️ 警告 |
| 任务失败率 | >10% | 🔴 严重 |

### 性能指标
| 指标 | 目标值 |
|------|--------|
| API 响应时间 | <100ms |
| 数据刷新频率 | 5 秒 |
| 页面加载时间 | <2 秒 |
| 并发连接数 | 100+ |

---

## 配置文件

```json
{
  "monitoring": {
    "enabled": true,
    "refresh_interval_seconds": 5,
    "api_port": 5000,
    "alerts": {
      "pending_threshold": 10,
      "subagent_usage_threshold": 0.8,
      "wait_time_threshold_seconds": 300,
      "failure_rate_threshold": 0.1
    },
    "notifications": {
      "email_enabled": false,
      "email_recipient": "",
      "webhook_enabled": false,
      "webhook_url": ""
    }
  }
}
```

---

*队列可视化监控实现方案 v1.0*  
*创建时间：2026-04-04 23:12*
