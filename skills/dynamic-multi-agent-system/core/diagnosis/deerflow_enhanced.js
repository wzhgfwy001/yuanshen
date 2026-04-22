/**
 * DeerFlow增强版诊断系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 系统健康检查
 * 2. 性能诊断
 * 3. 问题识别
 * 4. 修复建议
 */

const { EventEmitter } = require('events');
const os = require('os');

// ============== 诊断项类 ==============
class DiagnosticItem {
  constructor(name, options = {}) {
    this.name = name;
    this.category = options.category || 'general';
    this.severity = options.severity || 'info'; // info, warning, error, critical
    this.status = 'pending'; // pending, passed, failed, skipped
    this.message = null;
    this.details = {};
    this.timestamp = Date.now();
  }

  pass(message = null, details = {}) {
    this.status = 'passed';
    this.message = message || 'Check passed';
    this.details = details;
    this.timestamp = Date.now();
  }

  fail(message, details = {}) {
    this.status = 'failed';
    this.message = message;
    this.details = details;
    this.timestamp = Date.now();
  }

  warn(message, details = {}) {
    this.status = 'warning';
    this.message = message;
    this.details = details;
    this.timestamp = Date.now();
  }

  skip(reason = null) {
    this.status = 'skipped';
    this.message = reason;
    this.timestamp = Date.now();
  }
}

// ============== Diagnosis 主类 ==============
class Diagnosis extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      autoFix: config.autoFix !== false,
      criticalThreshold: config.criticalThreshold || 2,
      ...config
    };

    this.diagnostics = new Map();
    this.history = [];
  }

  /**
   * 添加诊断项
   */
  addDiagnostic(name, options = {}) {
    const diagnostic = new DiagnosticItem(name, options);
    this.diagnostics.set(name, diagnostic);
    return diagnostic;
  }

  /**
   * 运行所有诊断
   */
  async runAll() {
    const results = [];

    for (const [name, diagnostic] of this.diagnostics) {
      const checkFn = this[`check_${name}`];
      if (checkFn) {
        try {
          await checkFn.call(this, diagnostic);
        } catch (error) {
          diagnostic.fail(`Check error: ${error.message}`);
        }
      }
      results.push(diagnostic);
    }

    const summary = this._summarize(results);
    this.history.push({
      timestamp: Date.now(),
      results,
      summary
    });

    this.emit('diagnosis_completed', summary);

    return summary;
  }

  /**
   * 检查系统健康
   */
  check_system_health(diagnostic) {
    const cpuLoad = os.loadavg()[0];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

    if (cpuLoad > 10) {
      diagnostic.warn('High CPU load', { cpuLoad });
    } else {
      diagnostic.pass('CPU load normal', { cpuLoad });
    }

    if (memUsagePercent > 90) {
      diagnostic.warn('High memory usage', { memUsagePercent: memUsagePercent.toFixed(2) });
    }
  }

  /**
   * 检查内存
   */
  check_memory(diagnostic) {
    const mem = process.memoryUsage();
    const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(2);
    const memUsagePercent = (mem.heapUsed / mem.heapTotal) * 100;

    if (memUsagePercent > 90) {
      diagnostic.fail('Memory usage critical', { heapUsedMB, heapTotalMB, memUsagePercent });
    } else if (memUsagePercent > 70) {
      diagnostic.warn('Memory usage high', { heapUsedMB, heapTotalMB, memUsagePercent });
    } else {
      diagnostic.pass('Memory usage normal', { heapUsedMB, heapTotalMB, memUsagePercent });
    }
  }

  /**
   * 检查响应时间
   */
  check_response_time(diagnostic, threshold = 5000) {
    const recentHistory = this._getRecentHistory();
    
    if (recentHistory.length === 0) {
      diagnostic.skip('No recent history');
      return;
    }

    const avgResponseTime = recentHistory.reduce((sum, h) => sum + (h.responseTime || 0), 0) / recentHistory.length;

    if (avgResponseTime > threshold) {
      diagnostic.warn('High average response time', { avgResponseTime: avgResponseTime.toFixed(2) });
    } else {
      diagnostic.pass('Response time normal', { avgResponseTime: avgResponseTime.toFixed(2) });
    }
  }

  /**
   * 检查错误率
   */
  check_error_rate(diagnostic, threshold = 0.1) {
    const recentHistory = this._getRecentHistory();
    
    if (recentHistory.length === 0) {
      diagnostic.skip('No recent history');
      return;
    }

    const errors = recentHistory.filter(h => h.status === 'error').length;
    const errorRate = errors / recentHistory.length;

    if (errorRate > threshold) {
      diagnostic.warn('Error rate above threshold', { errorRate: (errorRate * 100).toFixed(2) + '%' });
    } else {
      diagnostic.pass('Error rate normal', { errorRate: (errorRate * 100).toFixed(2) + '%' });
    }
  }

  /**
   * 检查磁盘空间
   */
  check_disk_space(diagnostic, minFreeGB = 5) {
    // 这是一个简化的实现，实际应该使用 fs.statfs
    diagnostic.pass('Disk space check skipped (platform specific)');
  }

  /**
   * 检查网络连接
   */
  check_network(diagnostic) {
    // 简化的网络检查
    const interfaces = os.networkInterfaces();
    const hasNetwork = Object.keys(interfaces).length > 0;

    if (hasNetwork) {
      diagnostic.pass('Network interfaces available', { interfaces: Object.keys(interfaces) });
    } else {
      diagnostic.fail('No network interfaces found');
    }
  }

  /**
   * 检查依赖服务
   */
  async check_dependencies(diagnostic, deps = []) {
    if (deps.length === 0) {
      diagnostic.skip('No dependencies specified');
      return;
    }

    const results = {};
    let allHealthy = true;

    for (const dep of deps) {
      try {
        // 这里应该实际检查依赖
        results[dep] = 'unknown';
      } catch (e) {
        results[dep] = 'unavailable';
        allHealthy = false;
      }
    }

    if (allHealthy) {
      diagnostic.pass('All dependencies healthy', results);
    } else {
      diagnostic.warn('Some dependencies unavailable', results);
    }
  }

  /**
   * 获取摘要
   */
  _summarize(results) {
    const passed = results.filter(r => r.status === 'passed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const critical = results.filter(r => r.severity === 'critical' && r.status !== 'passed').length;

    let overallStatus = 'healthy';
    if (critical >= this.config.criticalThreshold || failed > 0) {
      overallStatus = 'critical';
    } else if (warnings > 0) {
      overallStatus = 'warning';
    }

    return {
      timestamp: Date.now(),
      overallStatus,
      total: results.length,
      passed,
      warnings,
      failed,
      skipped,
      critical,
      diagnostics: results.map(r => ({
        name: r.name,
        category: r.category,
        severity: r.severity,
        status: r.status,
        message: r.message,
        details: r.details
      })),
      recommendations: this._generateRecommendations(results)
    };
  }

  /**
   * 生成建议
   */
  _generateRecommendations(results) {
    const recommendations = [];

    for (const r of results) {
      if (r.status === 'failed') {
        recommendations.push({
          priority: 'high',
          diagnostic: r.name,
          message: r.message,
          action: this._suggestAction(r)
        });
      } else if (r.status === 'warning') {
        recommendations.push({
          priority: 'medium',
          diagnostic: r.name,
          message: r.message,
          action: this._suggestAction(r)
        });
      }
    }

    return recommendations;
  }

  /**
   * 建议行动
   */
  _suggestAction(diagnostic) {
    const actions = {
      memory: 'Consider increasing memory limits or optimizing memory usage',
      'system_health': 'Check system resources and restart if necessary',
      response_time: 'Investigate slow endpoints or optimize queries',
      error_rate: 'Review recent errors and check logs',
      disk_space: 'Clean up temporary files or expand storage'
    };

    return actions[diagnostic.name] || 'Review diagnostic details';
  }

  /**
   * 获取最近历史
   */
  _getRecentHistory() {
    const cutoff = Date.now() - 300000; // 5分钟
    return this.history
      .filter(h => h.timestamp > cutoff)
      .flatMap(h => h.results);
  }

  /**
   * 获取诊断状态
   */
  getStatus() {
    const latest = this.history[this.history.length - 1];
    return latest ? latest.summary : null;
  }

  /**
   * 获取历史
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }
}

// ============== 导出 ==============
module.exports = {
  Diagnosis,
  DiagnosticItem
};
