---
name: deerflow-monitoring
description: DeerFlow增强版监控系统 - 实时指标、告警、性能追踪、系统监控
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | monitoring=true | performance_tracking=true | alerts=true
---

# DeerFlow增强版监控系统

**【附魔·改】Monitor Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 监控启用 | `monitoring=true` | 启用监控系统 |
| 性能追踪 | `performance_tracking=true` | 追踪操作性能 |
| 告警系统 | `alerts=true` | 启用异常告警 |
| 系统指标 | `system_metrics=true` | 收集系统指标 |

## 核心功能

### 1. 指标收集

```javascript
const { DeerFlowMonitor, METRIC_TYPES } = require('./deerflow_enhanced.js');

const monitor = new DeerFlowMonitor();

// 记录计数器
monitor.recordMetric(METRIC_TYPES.COUNTER, 'requests.total', 1, { method: 'GET' });
monitor.recordMetric(METRIC_TYPES.COUNTER, 'requests.success', 1, { status: 200 });

// 记录仪表值
monitor.recordMetric(METRIC_TYPES.GAUGE, 'queue.size', 42);

// 记录直方图（延迟等）
monitor.recordMetric(METRIC_TYPES.HISTOGRAM, 'request.duration', 150); // ms
```

### 2. 告警管理

```javascript
// 设置告警阈值
monitor.setAlertThreshold('request.duration', 1000, {
  comparison: 'gt',
  level: 'warning',
  message: 'Request duration exceeded 1s'
});

monitor.setAlertThreshold('error.rate', 0.05, {
  comparison: 'gt',
  level: 'error',
  message: 'Error rate exceeds 5%'
});

// 检查指标
monitor.checkAlerts('request.duration', 1500); // 触发告警
```

### 3. 性能追踪

```javascript
// 开始追踪
const trackId = monitor.startTracking('op-001', 'task-execution', { taskType: 'code' });

// 添加阶段
monitor.tracker.addPhase(trackId, 'decomposition');
monitor.tracker.addPhase(trackId, 'subagent-execution');
monitor.tracker.addPhase(trackId, 'aggregation');

// 结束追踪
const track = monitor.endTracking(trackId);

console.log(`总耗时: ${track.duration}ms`);
console.log('阶段详情:', track.phases);
```

### 4. 系统监控

```javascript
// 获取系统快照
const snapshot = monitor.systemMonitor.getSnapshot();

console.log(`
CPU使用率: ${snapshot.cpu.usage}%
内存使用: ${snapshot.memory.usagePercent}%
进程内存: ${snapshot.process.memory.heapUsed / 1024 / 1024}MB
进程运行时长: ${snapshot.process.uptime}s
`);
```

### 5. 获取完整报告

```javascript
const report = monitor.getReport();

console.log(report);
// {
//   timestamp: '2026-04-22T14:00:00.000Z',
//   metrics: { counters: {...}, gauges: {...}, histograms: {...} },
//   alerts: { total: 5, active: 2, byLevel: {...} },
//   performance: { count: 100, avgDuration: 250, ... },
//   system: { cpu: {...}, memory: {...}, process: {...} }
// }
```

### 6. 导出Prometheus格式

```javascript
const prometheusMetrics = monitor.exportPrometheus();

console.log(prometheusMetrics);
// requests_total{method="GET"} 1234
// queue_size 42
// request_duration_sum 25000
// request_duration_count 100
```

## 事件系统

```javascript
monitor.on('metric_recorded', ({ type, name, value }) => {
  console.log(`指标: ${name} = ${value}`);
});

monitor.on('alert_triggered', (alert) => {
  console.log(`告警[${alert.level}]: ${alert.message}`);
  if (alert.level === 'critical') {
    // 发送通知
    notifyAdmin(alert);
  }
});

monitor.on('anomaly_detected', ({ metric, value, expected }) => {
  console.log(`异常检测: ${metric} = ${value} (预期: ${expected})`);
});
```

## 集成到主系统

```javascript
const monitor = new DeerFlowMonitor({
  enableSystemMonitor: true,
  systemConfig: { collectInterval: 5000 },
  alertConfig: { maxHistory: 1000 }
});

// 追踪任务执行
async function executeWithMonitoring(task) {
  const trackId = monitor.startTracking(task.id, 'task-execution');
  
  try {
    monitor.incrementCounter('tasks.started');
    
    const result = await task.execute();
    
    monitor.incrementCounter('tasks.completed');
    monitor.recordHistogram('task.duration', Date.now() - task.startTime);
    
    return result;
  } catch (error) {
    monitor.incrementCounter('tasks.failed');
    monitor.checkAlerts('tasks.failed', 1);
    throw error;
  } finally {
    monitor.endTracking(trackId);
  }
}

// 设置关键告警
monitor.setAlertThreshold('task.duration', 60000, {
  comparison: 'gt',
  level: 'warning',
  message: 'Task exceeded 60s'
});

monitor.setAlertThreshold('memory.usage_percent', 90, {
  comparison: 'gt',
  level: 'critical',
  message: 'System memory critical'
});
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
