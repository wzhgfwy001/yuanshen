"""
队列可视化监控 - 后端实现 v2.0
基于DeerFlow架构优化：
1. 事件系统
2. 中间件管道
3. 结果缓存
实时监控多 Agent 队列状态
"""

import time
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from functools import wraps


# ==================== DeerFlow借鉴: 结构化状态 ====================

@dataclass
class TaskInfo:
    """任务信息"""
    id: str
    name: str
    status: 'TaskStatus'
    created_at: float
    started_at: float = 0
    completed_at: float = 0
    active_subagents: int = 0
    progress: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SubAgentInfo:
    """子 Agent 信息"""
    id: str
    task_id: str
    role: str
    status: str
    created_at: float
    last_heartbeat: float = 0


@dataclass
class StatusResult:
    """状态查询结果"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    cached: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = "2.0"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TaskEvent:
    """任务事件"""
    event_type: str
    task_id: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    data: Dict[str, Any] = field(default_factory=dict)


# ==================== DeerFlow借鉴: 事件系统 ====================

class TaskEmitter:
    """任务事件发射器"""
    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}

    def on(self, event: str, listener: Callable) -> 'TaskEmitter':
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(listener)
        return self

    def off(self, event: str, listener: Callable) -> 'TaskEmitter':
        if event in self._listeners:
            self._listeners[event] = [l for l in self._listeners[event] if l != listener]
        return self

    def emit(self, event: str, data: Any = None):
        if event not in self._listeners:
            return
        for listener in self._listeners[event]:
            try:
                listener(data)
            except Exception as e:
                print(f"[TaskEmitter] {event} error: {e}")


# 事件类型
EVENTS = {
    'TASK_ADDED': 'task_added',
    'TASK_STARTED': 'task_started',
    'TASK_COMPLETED': 'task_completed',
    'TASK_FAILED': 'task_failed',
    'SUBAGENT_ADDED': 'subagent_added',
    'SUBAGENT_HEARTBEAT': 'subagent_heartbeat',
    'TIMEOUT_ALERT': 'timeout_alert'
}


# 全局事件发射器
emitter = TaskEmitter()

emitter.on(EVENTS['TASK_COMPLETED'], lambda t: print(f"[Monitor] ✅ 任务完成: {t.task_id}"))
emitter.on(EVENTS['TASK_STARTED'], lambda t: print(f"[Monitor] 🚀 任务启动: {t.task_id}"))
emitter.on(EVENTS['TIMEOUT_ALERT'], lambda t: print(f"[Monitor] ⚠️ 超时告警: {t.task_id}"))


# ==================== DeerFlow借鉴: 中间件管道 ====================

class MonitorMiddleware:
    """监控中间件基类"""
    def before_get_status(self, context: Dict) -> Dict:
        return context

    def after_get_status(self, result: StatusResult, context: Dict) -> StatusResult:
        return result


class StatusCache:
    """状态缓存"""
    def __init__(self, ttl_seconds: float = 1.0):
        self._cache: Optional[StatusResult] = None
        self._cache_time: float = 0
        self.ttl = ttl_seconds

    def get(self) -> Optional[StatusResult]:
        if self._cache and (time.time() - self._cache_time) < self.ttl:
            self._cache.cached = True
            return self._cache
        return None

    def set(self, result: StatusResult):
        self._cache = result
        self._cache_time = time.time()


class StatusPipeline:
    """状态查询管道"""
    def __init__(self):
        self.middlewares: List[MonitorMiddleware] = []

    def use(self, mw: MonitorMiddleware) -> 'StatusPipeline':
        self.middlewares.append(mw)
        return self

    def execute(self, context: Dict, get_fn: Callable) -> StatusResult:
        ctx = {**context, 'errors': []}

        # BEFORE钩子
        for mw in self.middlewares:
            try:
                ctx = mw.before_get_status(ctx)
            except Exception as e:
                ctx['errors'].append(str(e))

        # 执行
        try:
            result = get_fn(ctx)
        except Exception as e:
            result = StatusResult(success=False, error=str(e))
            ctx['errors'].append(str(e))

        # AFTER钩子
        for mw in self.middlewares:
            try:
                result = mw.after_get_status(result, ctx) or result
            except Exception as e:
                ctx['errors'].append(str(e))

        if ctx.get('errors'):
            result.data = result.data or {}
            result.data['_errors'] = ctx['errors']

        return result


class LoggingMiddleware(MonitorMiddleware):
    """日志中间件"""
    def before_get_status(self, context: Dict) -> Dict:
        print(f"[Monitor] 查询状态 at {datetime.now().isoformat()}")
        return context

    def after_get_status(self, result: StatusResult, context: Dict) -> StatusResult:
        if result.cached:
            print(f"[Monitor] 缓存命中")
        return result


class EnrichmentMiddleware(MonitorMiddleware):
    """数据丰富化中间件"""
    def after_get_status(self, result: StatusResult, context: Dict) -> StatusResult:
        if result.success and result.data:
            result.data['_version'] = '2.0'
            result.data['_query_time'] = datetime.now().isoformat()
        return result


# ==================== 任务状态枚举 ====================

class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


# ==================== 队列监控器主类 ====================

class QueueMonitor:
    """队列监控器 v2.0"""

    # 系统限制
    MAX_CONCURRENT_TASKS = 3
    MAX_SUBAGENTS = 12
    MAX_SUBAGENTS_PER_TASK = 6

    def __init__(self, use_cache: bool = True):
        self.pending_queue: List[TaskInfo] = []
        self.running_tasks: List[TaskInfo] = []
        self.completed_tasks: List[TaskInfo] = []
        self.subagent_pool: List[SubAgentInfo] = []

        self.start_times: Dict[str, float] = {}
        self.heartbeats: Dict[str, float] = {}

        # DeerFlow: 管道和缓存
        self.pipeline = StatusPipeline()
        self.pipeline.use(LoggingMiddleware())
        self.pipeline.use(EnrichmentMiddleware())
        self.cache = StatusCache() if use_cache else None

    def _emit(self, event: str, task_event: TaskEvent):
        """发送事件"""
        emitter.emit(event, task_event)

    def add_task(self, task: TaskInfo):
        """添加任务到待处理队列"""
        self.pending_queue.append(task)
        self.start_times[task.id] = time.time()

        # 事件
        self._emit(EVENTS['TASK_ADDED'], TaskEvent(
            event_type=EVENTS['TASK_ADDED'],
            task_id=task.id,
            data={'name': task.name, 'status': task.status.value}
        ))

    def start_task(self, task_id: str, subagent_count: int):
        """启动任务"""
        task = next((t for t in self.pending_queue if t.id == task_id), None)
        if task:
            self.pending_queue.remove(task)
            task.status = TaskStatus.RUNNING
            task.started_at = time.time()
            task.active_subagents = subagent_count
            self.running_tasks.append(task)

            # 事件
            self._emit(EVENTS['TASK_STARTED'], TaskEvent(
                event_type=EVENTS['TASK_STARTED'],
                task_id=task.id,
                data={'subagent_count': subagent_count}
            ))

    def complete_task(self, task_id: str):
        """完成任务"""
        task = next((t for t in self.running_tasks if t.id == task_id), None)
        if task:
            self.running_tasks.remove(task)
            task.status = TaskStatus.COMPLETED
            task.completed_at = time.time()
            task.progress = 1.0
            self.completed_tasks.append(task)

            # 释放子 Agent
            self._release_subagents(task_id)

            # 事件
            self._emit(EVENTS['TASK_COMPLETED'], TaskEvent(
                event_type=EVENTS['TASK_COMPLETED'],
                task_id=task.id,
                data={'duration': task.completed_at - task.started_at}
            ))

    def add_subagent(self, subagent: SubAgentInfo):
        """添加子 Agent"""
        self.subagent_pool.append(subagent)
        self.heartbeats[subagent.id] = time.time()

        # 事件
        self._emit(EVENTS['SUBAGENT_ADDED'], TaskEvent(
            event_type=EVENTS['SUBAGENT_ADDED'],
            task_id=subagent.task_id,
            data={'role': subagent.role}
        ))

    def update_heartbeat(self, subagent_id: str):
        """更新子 Agent 心跳"""
        self.heartbeats[subagent_id] = time.time()

    def _release_subagents(self, task_id: str):
        """释放任务的子 Agent"""
        self.subagent_pool = [sa for sa in self.subagent_pool if sa.task_id != task_id]

    def get_status(self) -> StatusResult:
        """获取队列状态（带缓存和管道）"""
        # 缓存检查
        if self.cache:
            cached = self.cache.get()
            if cached:
                return cached

        # 使用管道执行
        result = self.pipeline.execute(
            {},
            lambda ctx: self._do_get_status()
        )

        # 缓存结果
        if self.cache and result.success:
            self.cache.set(result)

        return result

    def _do_get_status(self) -> StatusResult:
        """实际执行状态查询"""
        try:
            active_subagents = sum(t.active_subagents for t in self.running_tasks)

            data = {
                "pending": {
                    "count": len(self.pending_queue),
                    "tasks": [self._task_to_dict(t) for t in self.pending_queue]
                },
                "running": {
                    "count": len(self.running_tasks),
                    "tasks": [self._task_to_dict(t) for t in self.running_tasks],
                    "active_subagents": active_subagents
                },
                "completed": {
                    "count": len(self.completed_tasks),
                    "today": len([t for t in self.completed_tasks if self._is_today(t.completed_at)])
                },
                "resources": {
                    "available_task_slots": self.MAX_CONCURRENT_TASKS - len(self.running_tasks),
                    "available_subagents": self.MAX_SUBAGENTS - active_subagents,
                    "total_subagents": self.MAX_SUBAGENTS,
                    "usage_rate": round(active_subagents / self.MAX_SUBAGENTS, 2) if self.MAX_SUBAGENTS > 0 else 0
                }
            }

            return StatusResult(success=True, data=data)
        except Exception as e:
            return StatusResult(success=False, error=str(e))

    def get_task_detail(self, task_id: str) -> StatusResult:
        """获取任务详情"""
        try:
            all_tasks = self.pending_queue + self.running_tasks + self.completed_tasks
            task = next((t for t in all_tasks if t.id == task_id), None)

            if not task:
                return StatusResult(success=False, error="Task not found")

            task_subagents = [sa for sa in self.subagent_pool if sa.task_id == task_id]

            if task.started_at > 0:
                if task.completed_at > 0:
                    duration = task.completed_at - task.started_at
                else:
                    duration = time.time() - task.started_at
            else:
                duration = 0

            data = {
                "task": self._task_to_dict(task),
                "subagents": [self._subagent_to_dict(sa) for sa in task_subagents],
                "duration_seconds": round(duration, 2),
                "waiting_time": round(task.started_at - self.start_times.get(task.id, 0), 2) if task.started_at > 0 else 0
            }

            return StatusResult(success=True, data=data)
        except Exception as e:
            return StatusResult(success=False, error=str(e))

    def get_all_subagents(self) -> StatusResult:
        """获取所有子 Agent"""
        try:
            return StatusResult(
                success=True,
                data=[self._subagent_to_dict(sa) for sa in self.subagent_pool]
            )
        except Exception as e:
            return StatusResult(success=False, error=str(e))

    def get_timeout_alerts(self, timeout_seconds: int = 300) -> StatusResult:
        """获取超时告警"""
        try:
            alerts = []
            current_time = time.time()

            # 检查子 Agent 超时
            for sa in self.subagent_pool:
                last_heartbeat = self.heartbeats.get(sa.id, sa.created_at)
                if current_time - last_heartbeat > timeout_seconds:
                    alert = {
                        "type": "subagent_timeout",
                        "subagent_id": sa.id,
                        "task_id": sa.task_id,
                        "last_heartbeat": datetime.fromtimestamp(last_heartbeat).isoformat(),
                        "timeout_seconds": round(current_time - last_heartbeat, 2)
                    }
                    alerts.append(alert)

                    # 事件
                    self._emit(EVENTS['TIMEOUT_ALERT'], TaskEvent(
                        event_type=EVENTS['TIMEOUT_ALERT'],
                        task_id=sa.task_id,
                        data=alert
                    ))

            # 检查任务超时
            for task in self.running_tasks:
                if task.started_at > 0:
                    elapsed = current_time - task.started_at
                    if elapsed > 3600:
                        alert = {
                            "type": "task_timeout",
                            "task_id": task.id,
                            "elapsed_seconds": round(elapsed, 2)
                        }
                        alerts.append(alert)

                        # 事件
                        self._emit(EVENTS['TIMEOUT_ALERT'], TaskEvent(
                            event_type=EVENTS['TIMEOUT_ALERT'],
                            task_id=task.id,
                            data=alert
                        ))

            return StatusResult(success=True, data={"alerts": alerts, "count": len(alerts)})
        except Exception as e:
            return StatusResult(success=False, error=str(e))

    def _task_to_dict(self, task: TaskInfo) -> Dict[str, Any]:
        return {
            "id": task.id,
            "name": task.name,
            "status": task.status.value,
            "created_at": datetime.fromtimestamp(task.created_at).isoformat(),
            "started_at": datetime.fromtimestamp(task.started_at).isoformat() if task.started_at > 0 else None,
            "completed_at": datetime.fromtimestamp(task.completed_at).isoformat() if task.completed_at > 0 else None,
            "active_subagents": task.active_subagents,
            "progress": round(task.progress, 2)
        }

    def _subagent_to_dict(self, subagent: SubAgentInfo) -> Dict[str, Any]:
        return {
            "id": subagent.id,
            "task_id": subagent.task_id,
            "role": subagent.role,
            "status": subagent.status,
            "created_at": datetime.fromtimestamp(subagent.created_at).isoformat(),
            "last_heartbeat": datetime.fromtimestamp(
                self.heartbeats.get(subagent.id, subagent.created_at)
            ).isoformat()
        }

    def _is_today(self, timestamp: float) -> bool:
        if timestamp == 0:
            return False
        today = datetime.now().date()
        task_date = datetime.fromtimestamp(timestamp).date()
        return today == task_date

    def clear_cache(self):
        """清除缓存"""
        if self.cache:
            self.cache._cache = None
            self.cache._cache_time = 0


# 模拟数据生成器
def generate_mock_data():
    """生成模拟数据用于演示"""
    return {
        "pending": {
            "count": 2,
            "tasks": [
                {"id": "task-001", "name": "科幻小说创作", "status": "pending", "progress": 0},
                {"id": "task-002", "name": "数据分析报告", "status": "pending", "progress": 0}
            ]
        },
        "running": {
            "count": 1,
            "tasks": [
                {
                    "id": "task-003",
                    "name": "悬疑小说大纲",
                    "status": "running",
                    "active_subagents": 4,
                    "progress": 0.65,
                    "started_at": datetime.now().isoformat()
                }
            ],
            "active_subagents": 4
        },
        "completed": {
            "count": 5,
            "today": 3
        },
        "resources": {
            "available_task_slots": 2,
            "available_subagents": 8,
            "total_subagents": 12,
            "usage_rate": 0.33
        },
        "_version": "2.0",
        "_query_time": datetime.now().isoformat()
    }


# Flask API 接口
if __name__ == "__main__":
    from flask import Flask, jsonify, request

    app = Flask(__name__)
    monitor = QueueMonitor()

    test_task = TaskInfo(
        id="task-001",
        name="测试任务 - 科幻小说创作",
        status=TaskStatus.PENDING,
        created_at=time.time()
    )
    monitor.add_task(test_task)

    @app.route('/dashboard-simple.html')
    def serve_dashboard():
        from flask import send_file
        import os
        dashboard_path = os.path.join(os.path.dirname(__file__), 'dashboard-simple.html')
        return send_file(dashboard_path)

    @app.route('/')
    def index():
        from flask import redirect
        return redirect('/dashboard-simple.html')

    @app.route('/api/queue/status')
    def get_queue_status():
        if request.args.get('mock', 'false').lower() == 'true':
            return jsonify(generate_mock_data())
        result = monitor.get_status()
        return jsonify(result.to_dict())

    @app.route('/api/queue/tasks/<task_id>')
    def get_task_detail(task_id):
        result = monitor.get_task_detail(task_id)
        return jsonify(result.to_dict())

    @app.route('/api/queue/subagents')
    def get_subagents():
        result = monitor.get_all_subagents()
        return jsonify(result.to_dict())

    @app.route('/api/queue/alerts')
    def get_alerts():
        timeout = int(request.args.get('timeout', 300))
        result = monitor.get_timeout_alerts(timeout)
        return jsonify(result.to_dict())

    @app.route('/api/queue/demo/init')
    def init_demo():
        running_task = TaskInfo(
            id="task-running",
            name="悬疑小说大纲设计",
            status=TaskStatus.RUNNING,
            created_at=time.time() - 300,
            started_at=time.time() - 240,
            active_subagents=4,
            progress=0.65
        )
        monitor.running_tasks.append(running_task)

        pending_task = TaskInfo(
            id="task-pending",
            name="科幻小说创作",
            status=TaskStatus.PENDING,
            created_at=time.time() - 60,
            active_subagents=0,
            progress=0
        )
        monitor.pending_queue.append(pending_task)

        roles = ["世界观架构师", "大纲设计师", "角色塑造师", "剧情编织者"]
        for i in range(4):
            sa = SubAgentInfo(
                id=f"subagent-{i+1}",
                task_id="task-running",
                role=roles[i],
                status="working",
                created_at=time.time() - 240,
                last_heartbeat=time.time()
            )
            monitor.add_subagent(sa)

        return jsonify({"success": True, "message": "演示数据已初始化"})

    print("🎯 队列监控服务启动中...")
    print("📊 API 地址：http://localhost:5000/api/queue/status")
    print("🎮 演示模式：http://localhost:5000/api/queue/status?mock=true")
    print("✨ 初始化演示：http://localhost:5000/api/queue/demo/init")
    print("\n按 Ctrl+C 停止服务")

    app.run(debug=True, port=5000, host='0.0.0.0')
