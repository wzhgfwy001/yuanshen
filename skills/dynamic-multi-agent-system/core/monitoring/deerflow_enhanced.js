/**
 * DeerFlow增强版监控系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 实时指标收集 - 延迟、吞吐量、错误率
 * 2. 性能追踪 - 分阶段计时
 * 3. 告警系统 - 异常检测
 * 4. 可视化报告 - 实时仪表盘
 */

const { EventEmitter } = require('events');
const os = require('os');

// ============== 常量定义 ==============
const METRIC_TYPES = {
  COUNTER: 'counter',       // 计数器
  GAUGE: 'gauge',           // 仪表
  HISTOGRAM: 'histogram',   // 直方图
  TIMER: 'timer'            // 计时器
};

const ALERT_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

const MONITORING_EVENTS = {
  METRIC_RECORDED: 'metric_recorded',
  ALERT_TRIGGERED: 'alert_triggered',
  THRESHOLD_EXCEEDED: 'threshold_exceeded',
  ANOMALY_DETECTED: 'anomaly_detected'
};

// ============== MetricsCollector 类 ==============
class MetricsCollector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.timers = new Map();
  }

  /**
   * 记录计数器
   */
  incrementCounter(name, value = 1, tags = {}) {
    const key = this._makeKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.emit(MONITORING_EVENTS.METRIC_RECORDED, {
      type: METRIC_TYPES.COUNTER,
      name,
      value: current + value,
      tags
    });
    
    return current + value;
  }

  /**
   * 记录仪表值
   */
  setGauge(name, value, tags = {}) {
    const key = this._makeKey(name, tags);
    this.gauges.set(key, {
      value,
      timestamp: Date.now()
    });
    
    this.emit(MONITORING_EVENTS.METRIC_RECORDED, {
      type: METRIC_TYPES.GAUGE,
      name,
      value,
      tags
    });
    
    return value;
  }

  /**
   * 记录直方图值
   */
  recordHistogram(name, value, tags = {}) {
    const key = this._makeKey(name, tags);
    const histogram = this.histograms.get(key) || [];
    histogram.push({
      value,
      timestamp: Date.now()
    });
    
    // 限制保留数量
    if (histogram.length > 1000) {
      histogram.shift();
    }
    
    this.histograms.set(key, histogram);
    
    this.emit(MONITORING_EVENTS.METRIC_RECORDED, {
      type: METRIC_TYPES.HISTOGRAM,
      name,
      value,
      count: histogram.length,
      tags
    });
    
    return histogram;
  }

  /**
   * 开始计时
   */
  startTimer(name, tags = {}) {
    const key = this._makeKey(name, tags);
    this.timers.set(key, Date.now());
    return key;
  }

  /**
   * 结束计时并记录
   */
  endTimer(name, tags = {}) {
    const key = this._makeKey(name, tags);
    const startTime = this.timers.get(key);
    
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return null;
    }
    
    const duration = Date.now() - startTime;
    this.timers.delete(key);
    
    this.recordHistogram(name, duration, tags);
    
    return duration;
  }

  /**
   * 获取计数器值
   */
  getCounter(name, tags = {}) {
    const key = this._makeKey(name, tags);
    return this.counters.get(key) || 0;
  }

  /**
   * 获取仪表值
   */
  getGauge(name, tags = {}) {
    const key = this._makeKey(name, tags);
    return this.gauges.get(key)?.value || null;
  }

  /**
   * 获取直方图统计
   */
  getHistogramStats(name, tags = {}) {
    const key = this._makeKey(name, tags);
    const histogram = this.histograms.get(key) || [];
    
    if (histogram.length === 0) {
      return null;
    }
    
    const values = histogram.map(h => h.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: this._percentile(values, 50),
      p90: this._percentile(values, 90),
      p95: this._percentile(values, 95),
      p99: this._percentile(values, 99)
    };
  }

  /**
   * 获取所有指标
   */
  getAllMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([k, v]) => [k, v.length])
      ),
      activeTimers: this.timers.size
    };
  }

  /**
   * 重置指标
   */
  reset(name = null, tags = {}) {
    if (name) {
      const key = this._makeKey(name, tags);
      this.counters.delete(key);
      this.gauges.delete(key);
      this.histograms.delete(key);
      this.timers.delete(key);
    } else {
      this.counters.clear();
      this.gauges.clear();
      this.histograms.clear();
      this.timers.clear();
    }
  }

  _makeKey(name, tags) {
    if (Object.keys(tags).length === 0) {
      return name;
    }
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }

  _percentile(sortedValues, p) {
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }
}

// ============== AlertManager 类 ==============
class AlertManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.alerts = [];
    this.thresholds = new Map();
    this.alertHistory = [];
    this.maxHistory = config.maxHistory || 1000;
  }

  /**
   * 设置告警阈值
   */
  setThreshold(name, threshold, options = {}) {
    this.thresholds.set(name, {
      value: threshold,
      comparison: options.comparison || 'gt', // gt, lt, eq, gte, lte
      level: options.level || ALERT_LEVELS.WARNING,
      message: options.message || `Threshold exceeded for ${name}`,
      enabled: options.enabled !== false
    });
  }

  /**
   * 检查指标并触发告警
   */
  checkMetric(name, value, tags = {}) {
    const threshold = this.thresholds.get(name);
    
    if (!threshold || !threshold.enabled) {
      return null;
    }
    
    let exceeded = false;
    
    switch (threshold.comparison) {
      case 'gt':
        exceeded = value > threshold.value;
        break;
      case 'lt':
        exceeded = value < threshold.value;
        break;
      case 'gte':
        exceeded = value >= threshold.value;
        break;
      case 'lte':
        exceeded = value <= threshold.value;
        break;
      case 'eq':
        exceeded = value === threshold.value;
        break;
    }
    
    if (exceeded) {
      return this._triggerAlert({
        name,
        value,
        threshold: threshold.value,
        level: threshold.level,
        message: threshold.message,
        tags
      });
    }
    
    return null;
  }

  /**
   * 触发告警
   */
  _triggerAlert(alert) {
    alert.id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    alert.timestamp = new Date().toISOString();
    
    this.alerts.push(alert);
    this.alertHistory.push(alert);
    
    // 限制历史大小
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory.shift();
    }
    
    this.emit(MONITORING_EVENTS.ALERT_TRIGGERED, alert);
    
    return alert;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(level = null) {
    if (level) {
      return this.alerts.filter(a => a.level === level);
    }
    return [...this.alerts];
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(options = {}) {
    let history = [...this.alertHistory];
    
    if (options.since) {
      const sinceTime = new Date(options.since).getTime();
      history = history.filter(a => 
        new Date(a.timestamp).getTime() >= sinceTime
      );
    }
    
    if (options.level) {
      history = history.filter(a => a.level === options.level);
    }
    
    if (options.limit) {
      history = history.slice(-options.limit);
    }
    
    return history;
  }

  /**
   * 清除告警
   */
  clearAlert(alertId) {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      this.alerts.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取告警统计
   */
  getAlertStats() {
    const stats = {
      total: this.alertHistory.length,
      active: this.alerts.length,
      byLevel: {}
    };
    
    for (const alert of this.alertHistory) {
      stats.byLevel[alert.level] = (stats.byLevel[alert.level] || 0) + 1;
    }
    
    return stats;
  }
}

// ============== PerformanceTracker 类 ==============
class PerformanceTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    this.tracks = new Map();
    this.activeTracks = new Map();
  }

  /**
   * 开始追踪
   */
  startTrack(trackId, operation, metadata = {}) {
    const track = {
      id: trackId,
      operation,
      metadata,
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      startCPU: process.cpuUsage(),
      phases: []
    };
    
    this.activeTracks.set(trackId, track);
    
    return trackId;
  }

  /**
   * 添加阶段
   */
  addPhase(trackId, phaseName, metadata = {}) {
    const track = this.activeTracks.get(trackId);
    if (!track) {
      console.warn(`Track ${trackId} not found`);
      return;
    }
    
    const lastPhase = track.phases[track.phases.length - 1];
    const startTime = lastPhase ? lastPhase.endTime : track.startTime;
    
    track.phases.push({
      name: phaseName,
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      metadata
    });
  }

  /**
   * 结束追踪
   */
  endTrack(trackId) {
    const track = this.activeTracks.get(trackId);
    if (!track) {
      console.warn(`Track ${trackId} not found`);
      return null;
    }
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const endCPU = process.cpuUsage();
    
    track.endTime = endTime;
    track.duration = endTime - track.startTime;
    track.endMemory = endMemory;
    track.endCPU = endCPU;
    track.memoryDelta = {
      heapUsed: endMemory.heapUsed - track.startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - track.startMemory.heapTotal,
      rss: endMemory.rss - track.startMemory.rss
    };
    track.cpuDelta = {
      user: endCPU.user - track.startCPU.user,
      system: endCPU.system - track.startCPU.system
    };
    
    this.activeTracks.delete(trackId);
    this.tracks.set(trackId, track);
    
    return track;
  }

  /**
   * 获取追踪结果
   */
  getTrack(trackId) {
    return this.tracks.get(trackId) || null;
  }

  /**
   * 获取所有追踪
   */
  getAllTracks(options = {}) {
    let tracks = Array.from(this.tracks.values());
    
    if (options.operation) {
      tracks = tracks.filter(t => t.operation === options.operation);
    }
    
    if (options.since) {
      const sinceTime = new Date(options.since).getTime();
      tracks = tracks.filter(t => t.startTime >= sinceTime);
    }
    
    if (options.limit) {
      tracks = tracks.slice(-options.limit);
    }
    
    return tracks;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(operation = null) {
    const tracks = operation 
      ? this.getAllTracks({ operation })
      : Array.from(this.tracks.values());
    
    if (tracks.length === 0) {
      return null;
    }
    
    const durations = tracks.map(t => t.duration).sort((a, b) => a - b);
    const sums = durations.reduce((a, b) => a + b, 0);
    
    return {
      count: tracks.length,
      totalDuration: sums,
      avgDuration: sums / tracks.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p90: durations[Math.floor(durations.length * 0.9)],
      p95: durations[Math.floor(durations.length * 0.95)]
    };
  }
}

// ============== SystemMonitor 类 ==============
class SystemMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.collector = new MetricsCollector();
    this.interval = null;
    this.collectInterval = config.collectInterval || 5000;
  }

  /**
   * 开始系统监控
   */
  start() {
    if (this.interval) {
      return; // Already running
    }
    
    this.interval = setInterval(() => {
      this._collectSystemMetrics();
    }, this.collectInterval);
    
    this._collectSystemMetrics(); // Initial collection
  }

  /**
   * 停止监控
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * 收集系统指标
   */
  _collectSystemMetrics() {
    // CPU使用率
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    
    const cpuUsage = 100 - (100 * totalIdle / totalTick);
    this.collector.setGauge('system.cpu.usage', cpuUsage);
    this.collector.setGauge('system.cpu.cores', cpus.length);
    
    // 内存使用
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    this.collector.setGauge('system.memory.total', totalMemory);
    this.collector.setGauge('system.memory.used', usedMemory);
    this.collector.setGauge('system.memory.free', freeMemory);
    this.collector.setGauge('system.memory.usage_percent', (usedMemory / totalMemory) * 100);
    
    // Node.js内存
    const nodeMemory = process.memoryUsage();
    this.collector.setGauge('process.memory.heap_used', nodeMemory.heapUsed);
    this.collector.setGauge('process.memory.heap_total', nodeMemory.heapTotal);
    this.collector.setGauge('process.memory.rss', nodeMemory.rss);
    this.collector.setGauge('process.memory.external', nodeMemory.external);
    
    // 负载均值
    this.collector.setGauge('system.loadavg.1m', os.loadavg()[0]);
    this.collector.setGauge('system.loadavg.5m', os.loadavg()[1]);
    this.collector.setGauge('system.loadavg.15m', os.loadavg()[2]);
    
    // 运行时长
    this.collector.setGauge('process.uptime', process.uptime());
  }

  /**
   * 获取系统状态快照
   */
  getSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: this.collector.getGauge('system.cpu.usage'),
        cores: this.collector.getGauge('system.cpu.cores'),
        loadavg: [
          this.collector.getGauge('system.loadavg.1m'),
          this.collector.getGauge('system.loadavg.5m'),
          this.collector.getGauge('system.loadavg.15m')
        ]
      },
      memory: {
        total: this.collector.getGauge('system.memory.total'),
        used: this.collector.getGauge('system.memory.used'),
        free: this.collector.getGauge('system.memory.free'),
        usagePercent: this.collector.getGauge('system.memory.usage_percent')
      },
      process: {
        uptime: this.collector.getGauge('process.uptime'),
        memory: {
          heapUsed: this.collector.getGauge('process.memory.heap_used'),
          heapTotal: this.collector.getGauge('process.memory.heap_total'),
          rss: this.collector.getGauge('process.memory.rss')
        }
      }
    };
  }
}

// ============== DeerFlowMonitor 主类 ==============
class DeerFlowMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.metrics = new MetricsCollector();
    this.alerts = new AlertManager(config.alertConfig);
    this.tracker = new PerformanceTracker();
    this.systemMonitor = new SystemMonitor(config.systemConfig);
    
    this.config = {
      enableSystemMonitor: config.enableSystemMonitor !== false,
      ...config
    };
    
    if (this.config.enableSystemMonitor) {
      this.systemMonitor.start();
    }
  }

  /**
   * 记录指标
   */
  recordMetric(type, name, value, tags = {}) {
    switch (type) {
      case METRIC_TYPES.COUNTER:
        return this.metrics.incrementCounter(name, value, tags);
      case METRIC_TYPES.GAUGE:
        return this.metrics.setGauge(name, value, tags);
      case METRIC_TYPES.HISTOGRAM:
        return this.metrics.recordHistogram(name, value, tags);
      default:
        console.warn(`Unknown metric type: ${type}`);
    }
  }

  /**
   * 开始追踪操作
   */
  startTracking(operationId, operation, metadata = {}) {
    return this.tracker.startTrack(operationId, operation, metadata);
  }

  /**
   * 结束追踪
   */
  endTracking(operationId) {
    return this.tracker.endTrack(operationId);
  }

  /**
   * 设置告警阈值
   */
  setAlertThreshold(name, threshold, options = {}) {
    this.alerts.setThreshold(name, threshold, options);
  }

  /**
   * 检查告警
   */
  checkAlerts(name, value, tags = {}) {
    const alert = this.alerts.checkMetric(name, value, tags);
    if (alert) {
      this.emit(MONITORING_EVENTS.ALERT_TRIGGERED, alert);
    }
    return alert;
  }

  /**
   * 获取完整报告
   */
  getReport() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics.getAllMetrics(),
      alerts: this.alerts.getAlertStats(),
      performance: this.tracker.getPerformanceStats(),
      system: this.systemMonitor.getSnapshot()
    };
  }

  /**
   * 导出Prometheus格式
   */
  exportPrometheus() {
    const lines = [];
    const metrics = this.metrics;
    
    // Counters
    for (const [key, value] of metrics.counters) {
      lines.push(`${key} ${value}`);
    }
    
    // Gauges
    for (const [key, data] of metrics.gauges) {
      lines.push(`${key} ${data.value}`);
    }
    
    // Histograms
    for (const [key, values] of metrics.histograms) {
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b.value, 0);
        lines.push(`${key}_sum ${sum}`);
        lines.push(`${key}_count ${values.length}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 关闭监控
   */
  shutdown() {
    this.systemMonitor.stop();
    this.emit('shutdown');
  }
}

// ============== 导出 ==============
module.exports = {
  DeerFlowMonitor,
  MetricsCollector,
  AlertManager,
  PerformanceTracker,
  SystemMonitor,
  METRIC_TYPES,
  ALERT_LEVELS,
  MONITORING_EVENTS
};
