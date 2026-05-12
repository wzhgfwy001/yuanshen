/**
 * TrajectoryIntegration - 轨迹追踪深度集成模块
 * 
 * 将auto-trajectory-tracker自动集成到阳神系统的任务执行流程
 * 实现：每次任务自动追踪 → 失败自动分析 → 高影响自动记录教训
 * 
 * 使用方式：
 * const trajectoryIntegration = require('./trajectory-integration.js');
 * trajectoryIntegration.startGlobalTracking();  // 在系统启动时调用一次
 */

const path = require('path');
const fs = require('fs');

// 加载auto-trajectory-tracker
let autoTracker = null;
try {
  // 从 skills-evolution 目录加载
  const trackerPath = path.join(__dirname, '..', '..', 'skills-evolution', 'auto-trajectory-tracker.js');
  autoTracker = require(trackerPath);
} catch (e) {
  console.log('[TrajectoryIntegration] auto-trajectory-tracker not available:', e.message);
}

// 活跃任务映射 (openclaw session id -> taskId)
const activeTaskMap = new Map();

class TrajectoryIntegration {
  constructor() {
    this.enabled = false;
    this.initialized = false;
  }

  /**
   * 启动全局轨迹追踪
   * 在系统启动时调用一次即可
   */
  startGlobalTracking() {
    if (this.enabled) {
      console.log('[TrajectoryIntegration] Already enabled');
      return { success: true, message: 'Already enabled' };
    }

    if (!autoTracker) {
      console.log('[TrajectoryIntegration] auto-trajectory-tracker not available');
      return { success: false, error: 'auto-trajectory-tracker not loaded' };
    }

    try {
      // 启动auto-tracker
      autoTracker.start();
      this.enabled = true;
      this.initialized = true;

      // 设置全局错误拦截
      this._setupGlobalErrorHandler();
      this._setupProcessHooks();

      console.log('[TrajectoryIntegration] ✅ Global tracking enabled');
      console.log('[TrajectoryIntegration]   - All subagent tasks will be tracked automatically');
      console.log('[TrajectoryIntegration]   - High-impact failures (≥7) will trigger skill review');
      console.log('[TrajectoryIntegration]   - Lessons will be saved to brain/lessons/');

      return { 
        success: true, 
        message: 'Global tracking enabled',
        status: autoTracker.getStatus()
      };
    } catch (e) {
      console.error('[TrajectoryIntegration] Failed to start:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * 停止全局追踪
   */
  stopGlobalTracking() {
    if (!this.enabled) {
      return { success: true, message: 'Not enabled' };
    }

    autoTracker.stop();
    this.enabled = false;

    console.log('[TrajectoryIntegration] ⏸ Global tracking disabled');
    return { success: true };
  }

  /**
   * 为任务启动轨迹追踪（自动被fusion-scheduler调用）
   * @param {string} taskId - 任务ID
   * @param {string} taskType - 任务类型 (code_review/data_analysis/writing等)
   * @param {object} metadata - 额外元数据
   */
  startTask(taskId, taskType, metadata = {}) {
    if (!this.enabled || !autoTracker) {
      return null;
    }

    const recorder = autoTracker.startTask(taskId, taskType, metadata);
    console.log(`[TrajectoryIntegration] Started tracking: ${taskId} (${taskType})`);
    return recorder;
  }

  /**
   * 记录工具调用（自动拦截）
   * @param {string} taskId - 任务ID
   * @param {string} toolName - 工具名称 (exec/read/write/message等)
   * @param {object} inputs - 输入参数
   * @param {object} outputs - 输出结果
   * @param {Error|null} error - 错误（如果有）
   */
  recordToolCall(taskId, toolName, inputs, outputs, error = null) {
    if (!this.enabled || !autoTracker) {
      return;
    }

    autoTracker.recordToolCall(toolName, inputs, outputs, error);
  }

  /**
   * 结束任务追踪
   * @param {string} taskId - 任务ID
   * @param {boolean} success - 是否成功
   * @param {object} summary - 任务总结 {duration, result, error等}
   */
  endTask(taskId, success, summary = {}) {
    if (!this.enabled || !autoTracker) {
      return null;
    }

    const result = autoTracker.endTask(taskId, success, summary);
    
    if (result && result.analysis) {
      console.log(`[TrajectoryIntegration] Task ${taskId} ended: ${success ? 'success' : 'failed'}`);
      if (result.analysis.impactScope >= 7) {
        console.log(`[TrajectoryIntegration] ⚠️ High-impact failure detected!`);
        console.log(`[TrajectoryIntegration]   Pattern: ${result.analysis.rootCause.pattern}`);
        console.log(`[TrajectoryIntegration]   Impact: ${result.analysis.impactScope}/10`);
      }
    }

    return result;
  }

  /**
   * 获取当前追踪状态
   */
  getStatus() {
    if (!autoTracker) {
      return { enabled: false, error: 'auto-tracker not available' };
    }
    return {
      enabled: this.enabled,
      tracker: autoTracker.getStatus(),
      stats: autoTracker.getStats()
    };
  }

  /**
   * 生成任务执行报告
   */
  generateReport() {
    if (!autoTracker) {
      return { error: 'auto-tracker not available' };
    }

    const stats = autoTracker.getStats();
    const status = autoTracker.getStatus();

    return {
      trackingEnabled: this.enabled,
      activeTasks: status.currentTask ? 1 : 0,
      totalTracked: stats.totalRecords,
      totalFailures: stats.failedTasksCount,
      message: this.enabled 
        ? `Tracking ${stats.totalRecords} tasks, ${stats.failedTasksCount} failures captured`
        : 'Tracking disabled'
    };
  }

  // ==================== 私有方法 ====================

  _setupGlobalErrorHandler() {
    // 全局未捕获错误处理
    process.on('uncaughtException', (error) => {
      if (this.enabled && autoTracker) {
        console.error('[TrajectoryIntegration] Uncaught exception:', error.message);
        // 记录到当前活跃任务
        const status = autoTracker.getStatus();
        if (status.currentTask) {
          autoTracker.recordToolCall('uncaughtException', 
            { error: error.message }, 
            { stack: error.stack }, 
            error
          );
        }
      }
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      if (this.enabled && autoTracker) {
        console.error('[TrajectoryIntegration] Unhandled rejection:', reason);
      }
    });
  }

  _setupProcessHooks() {
    // 进程退出时保存所有活跃任务
    process.on('exit', () => {
      if (this.enabled && autoTracker) {
        const status = autoTracker.getStatus();
        if (status.currentTask) {
          console.log('[TrajectoryIntegration] Saving active task before exit...');
          autoTracker.endTask(status.currentTask, false, { reason: 'process_exit' });
        }
      }
    });
  }
}

// 导出单例
const trajectoryIntegration = new TrajectoryIntegration();

// 自动启动脚本（用于直接运行测试）
if (require.main === module) {
  console.log('=== TrajectoryIntegration Test ===\n');
  
  const result = trajectoryIntegration.startGlobalTracking();
  console.log('Start result:', result);
  
  // 模拟任务执行
  console.log('\n--- Simulating task execution ---');
  
  trajectoryIntegration.startTask('test-task-001', 'code_review', { userId: 'test' });
  
  // 模拟工具调用
  trajectoryIntegration.recordToolCall('test-task-001', 'read', 
    { path: 'test.js' }, 
    { content: 'console.log("test")' }, 
    null
  );
  
  trajectoryIntegration.recordToolCall('test-task-001', 'exec', 
    { command: 'npm test' }, 
    { stdout: '', stderr: 'npm ERR!' }, 
    new Error('npm ERR! permission denied')
  );
  
  // 结束任务（失败）
  const endResult = trajectoryIntegration.endTask('test-task-001', false, { 
    reason: 'test failed',
    duration: 5000 
  });
  
  console.log('\n--- End task result ---');
  console.log('Analysis:', endResult?.analysis ? {
    pattern: endResult.analysis.rootCause.pattern,
    impact: endResult.analysis.impactScope,
    recommendations: endResult.analysis.recommendations?.length
  } : 'none');
  
  console.log('\n--- Final report ---');
  console.log(trajectoryIntegration.generateReport());
  
  // 5秒后停止
  setTimeout(() => {
    trajectoryIntegration.stopGlobalTracking();
    console.log('\n=== Test Complete ===');
    process.exit(0);
  }, 5000);
}

module.exports = trajectoryIntegration;