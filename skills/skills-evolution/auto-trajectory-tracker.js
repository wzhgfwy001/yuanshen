/**
 * AutoTrajectoryTracker - 自动轨迹追踪器
 * 
 * 将轨迹追踪自动集成到任务执行流程中
 * 无需手动调用，通过Hook机制自动拦截工具调用
 * 
 * 使用方式：
 *   const autoTracker = require('./auto-trajectory-tracker.js');
 *   autoTracker.start();  // 启动自动追踪
 *   autoTracker.stop();   // 停止追踪
 */

const path = require('path');
const fs = require('fs');

// 尝试加载 trajectory 模块
let TrajectoryRecorder = null;
let CausalAnalyzer = null;
try {
  const trajectoryModule = require('./trajectory/trajectory_recorder.js');
  TrajectoryRecorder = trajectoryModule.TrajectoryRecorder;
} catch (e) {
  console.log('[AutoTracker] TrajectoryRecorder not available');
}

try {
  const analyzerModule = require('./trajectory/causal_analyzer.js');
  CausalAnalyzer = analyzerModule.CausalAnalyzer;
} catch (e) {
  console.log('[AutoTracker] CausalAnalyzer not available');
}

// 活跃追踪的全局状态
let isEnabled = false;
let currentTaskId = null;
let currentRecorder = null;
let toolCallDepth = 0;

// 配置
const CONFIG = {
  maxDepth: 5,                    // 最大嵌套深度
  autoSaveInterval: 60000,        // 自动保存间隔
  highImpactThreshold: 7,          // 高影响阈值
  enableConsoleLog: true          // 控制台日志
};

class AutoTrajectoryTracker {
  constructor() {
    this.analyzer = CausalAnalyzer ? new CausalAnalyzer() : null;
    this.trackedTasks = new Map();    // taskId -> recorder
    this.failedTasks = new Map();     // taskId -> analysis
    this.autoSaveTimers = new Map();  // taskId -> timer
  }

  /**
   * 启动自动追踪
   */
  start() {
    if (isEnabled) {
      console.log('[AutoTracker] Already enabled');
      return;
    }
    
    isEnabled = true;
    this._loadPersistedState();
    this._setupGlobalHooks();
    this._startBackgroundCleaner();
    
    console.log('[AutoTracker] ✅ Auto-tracking enabled');
    console.log('[AutoTracker]   - Tool calls will be tracked automatically');
    console.log('[AutoTracker]   - High-impact failures will trigger skill review');
    console.log('[AutoTracker]   - Trajectories saved to:', this._getRecordsDir());
  }

  /**
   * 停止自动追踪
   */
  stop() {
    if (!isEnabled) {
      console.log('[AutoTracker] Not enabled');
      return;
    }
    
    // 保存所有活跃任务
    for (const [taskId, recorder] of this.trackedTasks) {
      if (recorder && !recorder.ended) {
        recorder.end('interrupted', { reason: 'autoTracker stopped' });
        this._saveTrajectory(taskId, recorder.getTrajectory());
      }
    }
    
    // 清理定时器
    for (const timer of this.autoSaveTimers.values()) {
      clearInterval(timer);
    }
    
    isEnabled = false;
    currentTaskId = null;
    currentRecorder = null;
    
    console.log('[AutoTracker] ⏸ Auto-tracking disabled');
  }

  /**
   * 开始追踪一个任务
   * @param {string} taskId - 任务ID
   * @param {string} taskType - 任务类型
   * @param {object} metadata - 元数据
   */
  startTask(taskId, taskType, metadata = {}) {
    if (!isEnabled || !TrajectoryRecorder) {
      return null;
    }

    // 如果已有活跃任务，先结束
    if (currentRecorder && !currentRecorder.ended) {
      this.endTask(currentTaskId, false, { reason: 'new task started' });
    }

    currentTaskId = taskId;
    currentRecorder = new TrajectoryRecorder(taskId, taskType, metadata);
    this.trackedTasks.set(taskId, currentRecorder);

    // 设置自动保存
    const timer = setInterval(() => {
      if (currentRecorder && !currentRecorder.ended) {
        this._saveTrajectory(taskId, currentRecorder.getTrajectory());
      }
    }, CONFIG.autoSaveInterval);
    this.autoSaveTimers.set(taskId, timer);

    this._log(`Started tracking task: ${taskId} (${taskType})`);
    return currentRecorder;
  }

  /**
   * 结束追踪一个任务
   * @param {string} taskId - 任务ID
   * @param {boolean} success - 是否成功
   * @param {object} summary - 总结
   */
  endTask(taskId, success, summary = {}) {
    const recorder = this.trackedTasks.get(taskId);
    if (!recorder) {
      this._log(`No recorder found for task: ${taskId}`);
      return null;
    }

    // 结束记录
    recorder.end(success ? 'success' : 'failed', summary);
    
    // 获取并保存轨迹
    const trajectory = recorder.getTrajectory();
    this._saveTrajectory(taskId, trajectory);

    // 清理定时器
    const timer = this.autoSaveTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(taskId);
    }

    // 分析失败
    let analysis = null;
    if (!success && this.analyzer) {
      analysis = this.analyzer.analyzeFailure(trajectory);
      this.failedTasks.set(taskId, analysis);

      // 高影响失败 → 记录教训
      if (analysis.impactScope >= CONFIG.highImpactThreshold && analysis.rootCause.pattern !== 'unknown') {
        this._recordLesson(analysis);
        this._log(`⚠️ High-impact failure detected: ${analysis.rootCause.pattern} (${analysis.impactScope}/10)`);
      }
    }

    // 清理
    this.trackedTasks.delete(taskId);
    if (currentTaskId === taskId) {
      currentTaskId = null;
      currentRecorder = null;
    }

    this._log(`Ended task: ${taskId} (${success ? 'success' : 'failed'})`);

    return { trajectory, analysis };
  }

  /**
   * 记录工具调用（自动拦截点）
   * @param {string} toolName - 工具名称
   * @param {object} inputs - 输入参数
   * @param {object} outputs - 输出结果
   * @param {Error|null} error - 错误
   */
  recordToolCall(toolName, inputs, outputs, error = null) {
    if (!isEnabled || !currentRecorder) {
      return;
    }

    toolCallDepth++;
    if (toolCallDepth > CONFIG.maxDepth) {
      this._log(`Max depth exceeded, skipping tool call: ${toolName}`);
      toolCallDepth--;
      return;
    }

    // 记录调用前
    currentRecorder.beforeToolCall(toolName, inputs);
    
    // 记录调用后
    currentRecorder.afterToolCall(toolName, outputs, error);
    
    toolCallDepth--;
  }

  /**
   * 获取追踪状态
   */
  getStatus() {
    return {
      enabled: isEnabled,
      activeTasks: this.trackedTasks.size,
      trackedTasks: Array.from(this.trackedTasks.keys()),
      failedTasks: this.failedTasks.size,
      currentTask: currentTaskId
    };
  }

  /**
   * 获取统计数据
   */
  getStats() {
    const recordsDir = this._getRecordsDir();
    let totalRecords = 0;
    let totalFailures = 0;

    try {
      if (fs.existsSync(recordsDir)) {
        const files = fs.readdirSync(recordsDir).filter(f => f.endsWith('.json'));
        totalRecords = files.length;
        
        for (const file of files) {
          if (file.includes('failed')) {
            totalFailures++;
          }
        }
      }
    } catch (e) {
      // Ignore
    }

    return {
      totalRecords,
      totalFailures,
      activeTasks: this.trackedTasks.size,
      failedTasksCount: this.failedTasks.size
    };
  }

  // ==================== 私有方法 ====================

  _log(message) {
    if (CONFIG.enableConsoleLog) {
      console.log(`[AutoTracker] ${message}`);
    }
  }

  _getRecordsDir() {
    const recordsDir = path.join(
      process.env.USERPROFILE || process.env.HOME || '',
      '.openclaw', 'workspace', 'skills', 'skills-evolution', 'trajectory', 'records'
    );
    
    if (!fs.existsSync(recordsDir)) {
      fs.mkdirSync(recordsDir, { recursive: true });
    }
    return recordsDir;
  }

  _saveTrajectory(taskId, trajectory) {
    try {
      const recordsDir = this._getRecordsDir();
      const filename = `${taskId}_${Date.now()}.json`;
      const filepath = path.join(recordsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(trajectory, null, 2), 'utf8');
      this._log(`Saved trajectory: ${filename}`);
    } catch (e) {
      this._log(`Failed to save trajectory: ${e.message}`);
    }
  }

  _recordLesson(analysis) {
    const lessonsDir = path.join(
      process.env.USERPROFILE || process.env.HOME || '',
      '.openclaw', 'workspace', 'brain', 'lessons'
    );

    if (!fs.existsSync(lessonsDir)) {
      fs.mkdirSync(lessonsDir, { recursive: true });
    }

    const lessonPath = path.join(lessonsDir, `lesson_${Date.now()}.md`);

    const content = `# 失败教训 - ${analysis.rootCause.pattern}

**时间：** ${new Date().toISOString()}
**任务：** ${analysis.taskId}
**任务类型：** ${analysis.taskType}

## 失败模式

${analysis.rootCause.pattern}

## 根因

- 工具：${analysis.rootCause.tool}
- 错误：${analysis.rootCause.error?.message || 'unknown'}

## 影响范围

${analysis.impactScope}/10

## 改进建议

${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## 因果链

- 长度：${analysis.causalChain?.length || 0} 步
- 第一个失败：step ${analysis.causalChain?.firstFailureAt || 'unknown'}

---
*自动记录 by AutoTrajectoryTracker*
`;

    try {
      fs.writeFileSync(lessonPath, content, 'utf8');
      this._log(`📝 Lesson saved: ${path.basename(lessonPath)}`);
    } catch (e) {
      this._log(`Failed to save lesson: ${e.message}`);
    }
  }

  _setupGlobalHooks() {
    // 设置全局错误处理器
    process.on('uncaughtException', (error) => {
      if (currentRecorder && isEnabled) {
        currentRecorder.recordSystemEvent('uncaught_exception', {
          error: error.message,
          stack: error.stack
        });
      }
    });

    // 设置退出钩子
    process.on('exit', () => {
      if (isEnabled && currentRecorder) {
        this.endTask(currentTaskId, false, { reason: 'process exit' });
      }
    });

    this._log('Global hooks registered');
  }

  _loadPersistedState() {
    // 加载之前的状态（如果需要恢复）
    // 目前暂时不需要
  }

  _startBackgroundCleaner() {
    // 定期清理旧的轨迹文件（保留最近100个）
    setInterval(() => {
      try {
        const recordsDir = this._getRecordsDir();
        const files = fs.readdirSync(recordsDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse();

        // 只保留最近100个
        if (files.length > 100) {
          const toDelete = files.slice(100);
          for (const file of toDelete) {
            fs.unlinkSync(path.join(recordsDir, file));
          }
          this._log(`Cleaned up ${toDelete.length} old trajectory files`);
        }
      } catch (e) {
        // Ignore
      }
    }, 300000); // 每5分钟检查一次
  }
}

// 导出单例
const autoTracker = new AutoTrajectoryTracker();

// 自动启动（如果配置启用）
const configPath = path.join(__dirname, 'auto-tracker-config.json');
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.autoStart) {
      autoTracker.start();
    }
  } catch (e) {
    // Ignore
  }
}

module.exports = autoTracker;

// 自动启动脚本（用于直接运行）
if (require.main === module) {
  autoTracker.start();
  
  // 示例：模拟追踪
  setTimeout(() => {
    autoTracker.startTask('demo-task-001', 'code_review', { userId: 'demo' });
    autoTracker.recordToolCall('read', { path: 'test.js' }, { content: '...' }, null);
    autoTracker.recordToolCall('exec', { command: 'npm test' }, { stdout: 'error' }, new Error('npm ERR!'));
    autoTracker.endTask('demo-task-001', false, { reason: 'test failed' });
    
    console.log('\n=== AutoTracker Demo Complete ===');
    console.log('Stats:', autoTracker.getStats());
    
    // 5秒后退出
    setTimeout(() => {
      autoTracker.stop();
      process.exit(0);
    }, 5000);
  }, 1000);
}