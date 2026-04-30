/**
 * Skills Evolution Integration - 技能进化系统集成
 * 
 * 将 TrajectoryRecorder 和 CausalAnalyzer 与 skills-evolution-tracker 集成
 * 实现：记录 → 分析 → 建议 → 技能更新 的完整闭环
 * 
 * 使用方式：
 * const integration = require('./skills-evolution-integration.js');
 * integration.startTask(taskId, taskType, metadata);
 * integration.endTask(taskId, success, summary);
 */

const path = require('path');
const tracker = require('./skills-evolution-tracker.js');

// 动态导入 trajectory 模块
let TrajectoryRecorder, CausalAnalyzer;
try {
  const trajectoryModule = require('./trajectory/trajectory_recorder.js');
  TrajectoryRecorder = trajectoryModule.TrajectoryRecorder;
} catch (e) {
  TrajectoryRecorder = null;
}

try {
  const analyzerModule = require('./trajectory/causal_analyzer.js');
  CausalAnalyzer = analyzerModule.CausalAnalyzer;
} catch (e) {
  CausalAnalyzer = null;
}

// 活跃的记录器
const activeRecorders = new Map();

class SkillsEvolutionIntegration {
  constructor() {
    this.analyzer = CausalAnalyzer ? new CausalAnalyzer() : null;
    this.lessonWriter = null;
  }

  /**
   * 开始一个任务的轨迹记录
   * @param {string} taskId - 任务ID
   * @param {string} taskType - 任务类型
   * @param {object} metadata - 额外元数据
   * @returns {object} 记录器（如果可用）
   */
  startTask(taskId, taskType, metadata = {}) {
    if (!TrajectoryRecorder) {
      console.log('[Integration] TrajectoryRecorder not available');
      return null;
    }

    const recorder = new TrajectoryRecorder(taskId, taskType, metadata);
    activeRecorders.set(taskId, recorder);
    
    console.log(`[Integration] Started recording task: ${taskId} (${taskType})`);
    return recorder;
  }

  /**
   * 记录工具调用（before）
   * @param {string} taskId - 任务ID
   * @param {string} toolName - 工具名称
   * @param {object} inputs - 输入参数
   */
  beforeToolCall(taskId, toolName, inputs) {
    const recorder = activeRecorders.get(taskId);
    if (recorder && recorder.beforeToolCall) {
      recorder.beforeToolCall(toolName, inputs);
    }
  }

  /**
   * 记录工具调用（after）
   * @param {string} taskId - 任务ID
   * @param {string} toolName - 工具名称
   * @param {object} outputs - 输出结果
   * @param {Error|null} error - 错误（如果有）
   */
  afterToolCall(taskId, toolName, outputs, error = null) {
    const recorder = activeRecorders.get(taskId);
    if (recorder && recorder.afterToolCall) {
      recorder.afterToolCall(toolName, outputs, error);
    }
  }

  /**
   * 记录Agent决策
   * @param {string} taskId - 任务ID
   * @param {string} agentName - Agent名称
   * @param {string} decision - 决策
   * @param {string} reason - 原因
   */
  recordDecision(taskId, agentName, decision, reason) {
    const recorder = activeRecorders.get(taskId);
    if (recorder && recorder.recordDecision) {
      recorder.recordDecision(agentName, decision, reason);
    }
  }

  /**
   * 结束任务记录
   * @param {string} taskId - 任务ID
   * @param {boolean} success - 是否成功
   * @param {object} summary - 任务总结
   * @returns {object} 分析结果（如果失败）
   */
  endTask(taskId, success, summary = {}) {
    const recorder = activeRecorders.get(taskId);
    
    if (!recorder) {
      console.log(`[Integration] No recorder found for task: ${taskId}`);
      return null;
    }

    // 结束记录
    recorder.end(success ? 'success' : 'failed', summary);
    
    // 获取轨迹
    const trajectory = recorder.getTrajectory();
    
    // 保存轨迹
    const savedPath = recorder.save();
    
    // 分析结果
    let analysis = null;
    if (!success && this.analyzer) {
      analysis = this.analyzer.analyzeFailure(trajectory);
      
      // 如果有高影响失败，记录到 lessons
      if (analysis.impactScope >= 7) {
        this._recordLesson(analysis);
      }
      
      console.log(`[Integration] Failure analysis:`);
      console.log(`  Pattern: ${analysis.rootCause.pattern}`);
      console.log(`  Impact: ${analysis.impactScope}/10`);
      console.log(`  Recommendations: ${analysis.recommendations.length}`);
    }

    // 清理
    activeRecorders.delete(taskId);

    return {
      taskId,
      success,
      trajectory: trajectory,
      analysis: analysis,
      savedPath: savedPath
    };
  }

  /**
   * 将失败教训写入 lessons
   */
  _recordLesson(analysis) {
    const lessonPath = path.join(
      process.env.USERPROFILE || process.env.HOME || '',
      '.openclaw', 'workspace', 'brain', 'lessons',
      `lesson_${Date.now()}.md`
    );

    const content = `# 失败教训 - ${analysis.rootCause.pattern}

**时间：** ${new Date().toISOString()}
**任务：** ${analysis.taskId}
**任务类型：** ${analysis.taskType}

## 失败模式

${analysis.rootCause.pattern}

## 根因

- 工具：${analysis.rootCause.tool}
- 错误：${analysis.rootCause.error?.message || 'unknown'}

## 失败步骤

${analysis.failedStepCount} 个失败步骤

## 改进建议

${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## 因果链

- 长度：${analysis.causalChain?.length || 0} 步
- 第一个失败：step ${analysis.causalChain?.firstFailureAt || 'unknown'}

---
*自动记录 by SkillsEvolutionIntegration*
`;

    try {
      const fs = require('fs');
      const lessonsDir = path.dirname(lessonPath);
      if (!fs.existsSync(lessonsDir)) {
        fs.mkdirSync(lessonsDir, { recursive: true });
      }
      fs.writeFileSync(lessonPath, content, 'utf8');
      console.log(`[Integration] Lesson saved to: ${lessonPath}`);
    } catch (e) {
      console.error(`[Integration] Failed to save lesson: ${e.message}`);
    }
  }

  /**
   * 分析轨迹文件
   * @param {string} trajectoryPath - 轨迹文件路径
   */
  analyzeTrajectoryFile(trajectoryPath) {
    if (!this.analyzer) {
      return { error: 'CausalAnalyzer not available' };
    }

    try {
      const fs = require('fs');
      const trajectory = JSON.parse(fs.readFileSync(trajectoryPath, 'utf8'));
      return this.analyzer.analyzeFailure(trajectory);
    } catch (e) {
      return { error: `Failed to read trajectory: ${e.message}` };
    }
  }

  /**
   * 批量分析轨迹
   * @param {string} recordsDir - 轨迹目录
   */
  batchAnalyze(recordsDir) {
    if (!this.analyzer) {
      return { error: 'CausalAnalyzer not available' };
    }

    const trajectoryModule = require('./trajectory/trajectory_recorder.js');
    const recordsPath = trajectoryModule.TRAJECTORY_DIR;

    try {
      const fs = require('fs');
      if (!fs.existsSync(recordsPath)) {
        return { error: 'No records found' };
      }

      const files = fs.readdirSync(recordsPath).filter(f => f.endsWith('.json'));
      const trajectories = [];

      for (const file of files) {
        try {
          const data = fs.readFileSync(path.join(recordsPath, file), 'utf8');
          trajectories.push(JSON.parse(data));
        } catch (e) {
          // 跳过无效文件
        }
      }

      return this.analyzer.aggregateAnalysis(trajectories);
    } catch (e) {
      return { error: `Batch analysis failed: ${e.message}` };
    }
  }

  /**
   * 获取活跃记录器数量
   */
  getActiveCount() {
    return activeRecorders.size;
  }

  /**
   * 健康检查
   */
  healthCheck() {
    return {
      trajectoryAvailable: !!TrajectoryRecorder,
      analyzerAvailable: !!this.analyzer,
      activeRecorders: this.getActiveCount(),
      status: 'ok'
    };
  }
}

// 导出单例
const integration = new SkillsEvolutionIntegration();

module.exports = integration;