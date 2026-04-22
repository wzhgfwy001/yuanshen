/**
 * DeerFlow增强版可视化监控
 * 
 * 借鉴DeerFlow的设计：
 * 1. 实时数据可视化
 * 2. 图表生成
 * 3. 仪表盘
 * 4. 告警可视化
 */

const { EventEmitter } = require('events');

// ============== 图表配置类 ==============
class ChartConfig {
  constructor(type, options = {}) {
    this.type = type; // line, bar, pie, gauge, table
    this.title = options.title || '';
    this.labels = options.labels || [];
    this.datasets = options.datasets || [];
    this.colors = options.colors || ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6'];
    this.width = options.width || 400;
    this.height = options.height || 300;
    this.options = options;
  }
}

// ============== VisualMonitor 主类 ==============
class VisualMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      refreshInterval: config.refreshInterval || 5000,
      maxDataPoints: config.maxDataPoints || 100,
      theme: config.theme || 'light',
      ...config
    };

    this.dataSources = new Map();
    this.charts = new Map();
    this.alerts = [];
    this.dashboard = null;
  }

  /**
   * 添加数据源
   */
  addDataSource(name, dataFn, options = {}) {
    const source = {
      name,
      dataFn,
      interval: options.interval || this.config.refreshInterval,
      lastValue: null,
      history: [],
      enabled: true
    };

    this.dataSources.set(name, source);

    if (source.interval > 0) {
      source.timer = setInterval(async () => {
        if (source.enabled) {
          await this._fetchDataSource(name);
        }
      }, source.interval);
    }

    return source;
  }

  /**
   * 获取数据源值
   */
  async _fetchDataSource(name) {
    const source = this.dataSources.get(name);
    if (!source) return null;

    try {
      const value = await source.dataFn();
      source.lastValue = value;
      
      // 添加到历史
      source.history.push({
        value,
        timestamp: Date.now()
      });

      // 限制历史大小
      if (source.history.length > this.config.maxDataPoints) {
        source.history.shift();
      }

      this.emit('data_updated', { source: name, value, history: source.history });

      return value;
    } catch (error) {
      this.emit('data_error', { source: name, error: error.message });
      return null;
    }
  }

  /**
   * 创建图表
   */
  createChart(id, type, options = {}) {
    const chart = new ChartConfig(type, options);
    this.charts.set(id, chart);
    return chart;
  }

  /**
   * 更新图表数据
   */
  updateChart(id, data) {
    const chart = this.charts.get(id);
    if (!chart) return false;

    if (data.labels) {
      chart.labels = data.labels;
    }
    if (data.datasets) {
      chart.datasets = data.datasets;
    }

    this.emit('chart_updated', { id, chart });
    return true;
  }

  /**
   * 添加告警
   */
  addAlert(alert) {
    const alertItem = {
      id: `alert-${Date.now()}`,
      ...alert,
      createdAt: Date.now(),
      acknowledged: false
    };

    this.alerts.push(alertItem);
    this.emit('alert_added', alertItem);

    return alertItem;
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * 清除告警
   */
  clearAlert(alertId) {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      this.alerts.splice(index, 1);
      this.emit('alert_cleared', { id: alertId });
      return true;
    }
    return false;
  }

  /**
   * 创建仪表盘
   */
  createDashboard(config) {
    this.dashboard = {
      id: config.id || `dash-${Date.now()}`,
      title: config.title || 'Dashboard',
      layout: config.layout || 'grid',
      widgets: config.widgets || [],
      createdAt: Date.now()
    };

    return this.dashboard;
  }

  /**
   * 生成HTML报告
   */
  generateHTMLReport() {
    const alerts = this.alerts.filter(a => !a.acknowledged);
    const dataSources = Array.from(this.dataSources.entries()).map(([name, source]) => ({
      name,
      currentValue: source.lastValue,
      history: source.history.slice(-10)
    }));

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>System Monitor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: ${this.config.theme === 'dark' ? '#1a1a1a' : '#f5f5f5'}; color: ${this.config.theme === 'dark' ? '#fff' : '#333'}; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .alert { padding: 10px; margin: 5px 0; border-radius: 4px; background: ${this.config.theme === 'dark' ? '#333' : '#fff'}; }
    .alert-critical { border-left: 4px solid #e74c3c; }
    .alert-warning { border-left: 4px solid #f1c40f; }
    .metric { display: inline-block; padding: 15px; margin: 5px; background: ${this.config.theme === 'dark' ? '#333' : '#fff'}; border-radius: 8px; min-width: 150px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .metric-label { font-size: 12px; color: #888; }
    .chart { background: ${this.config.theme === 'dark' ? '#2a2a2a' : '#fff'}; padding: 15px; margin: 10px 0; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>System Monitor</h1>
    <span>${new Date().toLocaleString()}</span>
  </div>

  ${alerts.length > 0 ? `
  <h2>Active Alerts (${alerts.length})</h2>
  ${alerts.map(a => `
    <div class="alert alert-${a.level || 'warning'}">
      <strong>${a.level || 'WARNING'}</strong>: ${a.message || a.content || 'Alert'}
      ${a.timestamp ? `<br><small>${new Date(a.timestamp).toLocaleString()}</small>` : ''}
    </div>
  `).join('')}
  ` : ''}

  <h2>Metrics</h2>
  <div>
    ${dataSources.map(ds => `
      <div class="metric">
        <div class="metric-value">${ds.currentValue !== null ? JSON.stringify(ds.currentValue) : 'N/A'}</div>
        <div class="metric-label">${ds.name}</div>
      </div>
    `).join('')}
  </div>

  <h2>Charts</h2>
  ${Array.from(this.charts.entries()).map(([id, chart]) => `
    <div class="chart">
      <h3>${chart.title || id}</h3>
      <canvas id="${id}" width="${chart.width}" height="${chart.height}"></canvas>
    </div>
  `).join('')}

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    // Initialize charts here
  </script>
</body>
</html>
    `;

    return html;
  }

  /**
   * 获取快照
   */
  getSnapshot() {
    const dataSources = {};
    for (const [name, source] of this.dataSources) {
      dataSources[name] = {
        currentValue: source.lastValue,
        historyLength: source.history.length
      };
    }

    return {
      timestamp: new Date().toISOString(),
      dataSources,
      activeAlerts: this.alerts.filter(a => !a.acknowledged).length,
      totalAlerts: this.alerts.length,
      chartsCount: this.charts.size,
      dashboard: this.dashboard
    };
  }

  /**
   * 获取数据源历史
   */
  getDataSourceHistory(name, limit = 100) {
    const source = this.dataSources.get(name);
    if (!source) return [];

    return source.history.slice(-limit);
  }

  /**
   * 禁用数据源
   */
  disableDataSource(name) {
    const source = this.dataSources.get(name);
    if (source) {
      source.enabled = false;
      return true;
    }
    return false;
  }

  /**
   * 启用数据源
   */
  enableDataSource(name) {
    const source = this.dataSources.get(name);
    if (source) {
      source.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * 关闭
   */
  shutdown() {
    for (const source of this.dataSources.values()) {
      if (source.timer) {
        clearInterval(source.timer);
      }
    }
    this.emit('shutdown');
  }
}

// ============== 导出 ==============
module.exports = {
  VisualMonitor,
  ChartConfig
};
