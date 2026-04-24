"""
队列可视化监控 - 后端实现
实时监控多 Agent 队列状态
"""
import time
import json
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
from enum import Enum


class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class TaskInfo:
    """任务信息"""
    id: str
    name: str
    status: TaskStatus
    created_at: float
    started_at: float = 0
    completed_at: float = 0
    active_subagents: int = 0
    progress: float = 0.0


@dataclass
class SubAgentInfo:
    """子 Agent 信息"""
    id: str
    task_id: str
    role: str
    status: str
    created_at: float
    last_heartbeat: float = 0


class QueueMonitor:
    """队列监控器"""
    
    # 系统限制
    MAX_CONCURRENT_TASKS = 3
    MAX_SUBAGENTS = 12
    MAX_SUBAGENTS_PER_TASK = 6
    
    def __init__(self):
        self.pending_queue: List[TaskInfo] = []
        self.running_tasks: List[TaskInfo] = []
        self.completed_tasks: List[TaskInfo] = []
        self.subagent_pool: List[SubAgentInfo] = []
        
        self.start_times: Dict[str, float] = {}
        self.heartbeats: Dict[str, float] = {}
    
    def add_task(self, task: TaskInfo):
        """添加任务到待处理队列"""
        self.pending_queue.append(task)
        self.start_times[task.id] = time.time()
    
    def start_task(self, task_id: str, subagent_count: int):
        """启动任务"""
        # 从待处理队列移除
        task = next((t for t in self.pending_queue if t.id == task_id), None)
        if task:
            self.pending_queue.remove(task)
            task.status = TaskStatus.RUNNING
            task.started_at = time.time()
            task.active_subagents = subagent_count
            self.running_tasks.append(task)
    
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
    
    def add_subagent(self, subagent: SubAgentInfo):
        """添加子 Agent"""
        self.subagent_pool.append(subagent)
        self.heartbeats[subagent.id] = time.time()
    
    def update_heartbeat(self, subagent_id: str):
        """更新子 Agent 心跳"""
        self.heartbeats[subagent_id] = time.time()
    
    def _release_subagents(self, task_id: str):
        """释放任务的子 Agent"""
        self.subagent_pool = [sa for sa in self.subagent_pool if sa.task_id != task_id]
    
    def get_status(self) -> Dict[str, Any]:
        """获取队列状态"""
        active_subagents = sum(t.active_subagents for t in self.running_tasks)
        
        return {
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
                "usage_rate": active_subagents / self.MAX_SUBAGENTS
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def get_task_detail(self, task_id: str) -> Dict[str, Any]:
        """获取任务详情"""
        # 在所有队列中查找
        all_tasks = self.pending_queue + self.running_tasks + self.completed_tasks
        task = next((t for t in all_tasks if t.id == task_id), None)
        
        if not task:
            return {"error": "Task not found"}
        
        # 获取相关子 Agent
        task_subagents = [sa for sa in self.subagent_pool if sa.task_id == task_id]
        
        # 计算耗时
        if task.started_at > 0:
            if task.completed_at > 0:
                duration = task.completed_at - task.started_at
            else:
                duration = time.time() - task.started_at
        else:
            duration = 0
        
        return {
            "task": self._task_to_dict(task),
            "subagents": [self._subagent_to_dict(sa) for sa in task_subagents],
            "duration_seconds": duration,
            "waiting_time": task.started_at - self.start_times.get(task.id, 0) if task.started_at > 0 else 0
        }
    
    def get_all_subagents(self) -> List[Dict[str, Any]]:
        """获取所有子 Agent"""
        return [self._subagent_to_dict(sa) for sa in self.subagent_pool]
    
    def get_timeout_alerts(self, timeout_seconds: int = 300) -> List[Dict[str, Any]]:
        """获取超时告警"""
        alerts = []
        current_time = time.time()
        
        # 检查子 Agent 超时
        for sa in self.subagent_pool:
            last_heartbeat = self.heartbeats.get(sa.id, sa.created_at)
            if current_time - last_heartbeat > timeout_seconds:
                alerts.append({
                    "type": "subagent_timeout",
                    "subagent_id": sa.id,
                    "task_id": sa.task_id,
                    "last_heartbeat": datetime.fromtimestamp(last_heartbeat).isoformat(),
                    "timeout_seconds": current_time - last_heartbeat
                })
        
        # 检查任务超时
        for task in self.running_tasks:
            if task.started_at > 0:
                elapsed = current_time - task.started_at
                if elapsed > 3600:  # 任务超时 1 小时
                    alerts.append({
                        "type": "task_timeout",
                        "task_id": task.id,
                        "elapsed_seconds": elapsed
                    })
        
        return alerts
    
    def _task_to_dict(self, task: TaskInfo) -> Dict[str, Any]:
        """任务对象转字典"""
        return {
            "id": task.id,
            "name": task.name,
            "status": task.status.value,
            "created_at": datetime.fromtimestamp(task.created_at).isoformat(),
            "started_at": datetime.fromtimestamp(task.started_at).isoformat() if task.started_at > 0 else None,
            "completed_at": datetime.fromtimestamp(task.completed_at).isoformat() if task.completed_at > 0 else None,
            "active_subagents": task.active_subagents,
            "progress": task.progress
        }
    
    def _subagent_to_dict(self, subagent: SubAgentInfo) -> Dict[str, Any]:
        """子 Agent 对象转字典"""
        return {
            "id": subagent.id,
            "task_id": subagent.task_id,
            "role": subagent.role,
            "status": subagent.status,
            "created_at": datetime.fromtimestamp(subagent.created_at).isoformat(),
            "last_heartbeat": datetime.fromtimestamp(self.heartbeats.get(subagent.id, subagent.created_at)).isoformat()
        }
    
    def _is_today(self, timestamp: float) -> bool:
        """判断是否为今天"""
        if timestamp == 0:
            return False
        today = datetime.now().date()
        task_date = datetime.fromtimestamp(timestamp).date()
        return today == task_date


# 模拟数据生成器（用于演示）
def generate_mock_data():
    """生成模拟数据用于演示"""
    import random
    
    mock_status = {
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
        "timestamp": datetime.now().isoformat()
    }
    return mock_status


# Flask API 接口
if __name__ == "__main__":
    from flask import Flask, jsonify, request
    
    app = Flask(__name__)
    monitor = QueueMonitor()
    
    # 添加一些测试数据
    test_task = TaskInfo(
        id="task-001",
        name="测试任务 - 科幻小说创作",
        status=TaskStatus.PENDING,
        created_at=time.time()
    )
    monitor.add_task(test_task)
    
    @app.route('/dashboard-simple.html')
    def serve_dashboard():
        """服务监控大屏 HTML"""
        from flask import send_file
        import os
        dashboard_path = os.path.join(os.path.dirname(__file__), 'dashboard-simple.html')
        return send_file(dashboard_path)
    
    @app.route('/')
    def index():
        """首页重定向到监控大屏"""
        from flask import redirect
        return redirect('/dashboard-simple.html')
    
    @app.route('/api/queue/status')
    def get_queue_status():
        """获取队列状态"""
        # 如果是演示模式，返回模拟数据
        if request.args.get('mock', 'false').lower() == 'true':
            return jsonify(generate_mock_data())
        return jsonify(monitor.get_status())
    
    @app.route('/api/queue/tasks/<task_id>')
    def get_task_detail(task_id):
        """获取任务详情"""
        return jsonify(monitor.get_task_detail(task_id))
    
    @app.route('/api/queue/subagents')
    def get_subagents():
        """获取子 Agent 列表"""
        return jsonify(monitor.get_all_subagents())
    
    @app.route('/api/queue/alerts')
    def get_alerts():
        """获取告警"""
        timeout = int(request.args.get('timeout', 300))
        return jsonify(monitor.get_timeout_alerts(timeout))
    
    @app.route('/api/queue/demo/init')
    def init_demo():
        """初始化演示数据"""
        # 添加运行中任务
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
        
        # 添加待处理任务
        pending_task = TaskInfo(
            id="task-pending",
            name="科幻小说创作",
            status=TaskStatus.PENDING,
            created_at=time.time() - 60,
            active_subagents=0,
            progress=0
        )
        monitor.pending_queue.append(pending_task)
        
        # 添加子 Agent
        for i in range(4):
            roles = ["世界观架构师", "大纲设计师", "角色塑造师", "剧情编织者"]
            sa = SubAgentInfo(
                id=f"subagent-{i+1}",
                task_id="task-running",
                role=roles[i],
                status="working",
                created_at=time.time() - 240,
                last_heartbeat=time.time()
            )
            monitor.subagent_pool.append(sa)
        
        return jsonify({"success": True, "message": "演示数据已初始化"})
    
    print("🎯 队列监控服务启动中...")
    print("📊 API 地址：http://localhost:5000/api/queue/status")
    print("🎮 演示模式：http://localhost:5000/api/queue/status?mock=true")
    print("✨ 初始化演示：http://localhost:5000/api/queue/demo/init")
    print("\n按 Ctrl+C 停止服务")
    
    # 启动服务器
    app.run(debug=True, port=5000, host='0.0.0.0')
