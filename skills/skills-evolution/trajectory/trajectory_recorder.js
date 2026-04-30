/**
 * TrajectoryRecorder - 轨迹记录器
 * 
 * 记录Agent执行过程中的完整因果链：
 * - 用户prompt
 * - Agent决策
 * - 工具调用（输入、输出、错误）
 * - 中间状态变化
 * 
 * 使用方式：
 *   const recorder = new TrajectoryRecorder(taskId, taskType);
 *   recorder.beforeToolCall('read', { path: 'xxx' });
 *   // ... 执行工具 ...
 *   recorder.afterToolCall('read', { content: '...' }, null);
 *   // 任务结束时
 *   const trajectory = recorder.getTrajectory();
 */

const fs = require('fs');
const path = require('path');

// 轨迹存储目录
const TRAJECTORY_DIR = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  '.openclaw', 'workspace', 'skills', 'skills-evolution', 'trajectory', 'records'
);

// 确保目录存在
function ensureDir() {
  if (!fs.existsSync(TRAJECTORY_DIR)) {
    fs.mkdirSync(TRAJECTORY_DIR, { recursive: true });
  }
}

/**
 * 步骤类型枚举
 */
const StepType = {
  AGENT_DECISION: 'agent_decision',
  TOOL_CALL: 'tool_call',
  USER_FEEDBACK: 'user_feedback',
  SYSTEM_EVENT: 'system_event',
  TASK_START: 'task_start',
  TASK_END: 'task_end'
};

/**
 * 工具调用状态枚举
 */
const StepStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

class TrajectoryRecorder {
  /**
   * 创建轨迹记录器
   * @param {string} taskId - 任务ID
   * @param {string} taskType - 任务类型（如 'code_review', 'writing'）
   * @param {object} metadata - 额外元数据
   */
  constructor(taskId, taskType, metadata = {}) {
    this.taskId = taskId;
    this.taskType = taskType;
    this.startTime = new Date().toISOString();
    this.steps = [];
    this.stepCounter = 0;
    this.metadata = metadata;
    this.ended = false;
    this.endTime = null;
    this.finalStatus = null;
    
    // 记录任务开始
    this._addStep({
      type: StepType.TASK_START,
      taskId: taskId,
      taskType: taskType,
      metadata: metadata
    });
  }

  /**
   * 添加步骤
   * @private
   */
  _addStep(stepData) {
    this.stepCounter++;
    const step = {
      id: this.stepCounter,
      timestamp: new Date().toISOString(),
      ...stepData
    };
    this.steps.push(step);
    return step;
  }

  /**
   * 记录工具调用前的状态
   * @param {string} toolName - 工具名称
   * @param {object} inputs - 输入参数（脱敏后）
   */
  beforeToolCall(toolName, inputs) {
    if (this.ended) {
      console.warn(`[TrajectoryRecorder] Task ${this.taskId} has ended, ignoring beforeToolCall`);
      return;
    }
    
    // 脱敏敏感信息
    const sanitizedInputs = this._sanitizeInputs(toolName, inputs);
    
    return this._addStep({
      type: StepType.TOOL_CALL,
      tool: toolName,
      action: 'call',
      inputs: sanitizedInputs,
      status: StepStatus.PENDING
    });
  }

  /**
   * 记录工具调用后的状态
   * @param {string} toolName - 工具名称
   * @param {object} outputs - 输出结果（脱敏后）
   * @param {Error|null} error - 错误对象（如果有）
   */
  afterToolCall(toolName, outputs, error = null) {
    if (this.ended) {
      console.warn(`[TrajectoryRecorder] Task ${this.taskId} has ended, ignoring afterToolCall`);
      return;
    }
    
    // 找到对应的pending步骤
    const pendingStep = this._findPendingStep(toolName);
    
    if (pendingStep) {
      // 更新现有步骤
      pendingStep.outputs = this._sanitizeOutputs(toolName, outputs);
      pendingStep.error = error ? this._sanitizeError(error) : null;
      pendingStep.duration = this._calculateDuration(pendingStep);
      pendingStep.status = error ? StepStatus.FAILED : StepStatus.SUCCESS;
    } else {
      // 如果没有找到pending步骤，创建一个新步骤（表示直接调用）
      this._addStep({
        type: StepType.TOOL_CALL,
        tool: toolName,
        action: 'response',
        outputs: this._sanitizeOutputs(toolName, outputs),
        error: error ? this._sanitizeError(error) : null,
        status: error ? StepStatus.FAILED : StepStatus.SUCCESS
      });
    }
  }

  /**
   * 记录Agent决策点
   * @param {string} agentName - Agent名称
   * @param {string} decision - 决策内容
   * @param {string} reason - 决策原因
   * @param {object} context - 决策上下文
   */
  recordDecision(agentName, decision, reason, context = {}) {
    if (this.ended) {
      console.warn(`[TrajectoryRecorder] Task ${this.taskId} has ended, ignoring recordDecision`);
      return;
    }
    
    return this._addStep({
      type: StepType.AGENT_DECISION,
      agent: agentName,
      decision: decision,
      reason: reason,
      context: context
    });
  }

  /**
   * 记录用户反馈
   * @param {string} feedback - 反馈内容
   * @param {string} feedbackType - 反馈类型（correction/approval/rejection）
   */
  recordUserFeedback(feedback, feedbackType = 'general') {
    if (this.ended) {
      console.warn(`[TrajectoryRecorder] Task ${this.taskId} has ended, ignoring recordUserFeedback`);
      return;
    }
    
    return this._addStep({
      type: StepType.USER_FEEDBACK,
      feedback: feedback,
      feedbackType: feedbackType
    });
  }

  /**
   * 记录系统事件
   * @param {string} event - 事件类型
   * @param {object} data - 事件数据
   */
  recordSystemEvent(event, data = {}) {
    if (this.ended) {
      console.warn(`[TrajectoryRecorder] Task ${this.taskId} has ended, ignoring recordSystemEvent`);
      return;
    }
    
    return this._addStep({
      type: StepType.SYSTEM_EVENT,
      event: event,
      data: data
    });
  }

  /**
   * 结束任务记录
   * @param {string} status - 最终状态（'success'/'failed'/'cancelled'）
   * @param {object} summary - 任务总结
   */
  end(status, summary = {}) {
    if (this.ended) {
      console.warn(`[TrajectoryRecorder] Task ${this.taskId} already ended`);
      return;
    }
    
    this.ended = true;
    this.endTime = new Date().toISOString();
    this.finalStatus = status;
    
    this._addStep({
      type: StepType.TASK_END,
      status: status,
      summary: summary,
      totalDuration: this._getTotalDuration(),
      totalSteps: this.steps.length
    });
  }

  /**
   * 获取完整轨迹
   */
  getTrajectory() {
    return {
      taskId: this.taskId,
      taskType: this.taskType,
      startedAt: this.startTime,
      endedAt: this.endTime,
      finalStatus: this.finalStatus,
      totalDuration: this._getTotalDuration(),
      stepCount: this.steps.length,
      steps: this.steps,
      metadata: this.metadata
    };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const toolCalls = this.steps.filter(s => s.type === StepType.TOOL_CALL);
    const failedSteps = toolCalls.filter(s => s.status === StepStatus.FAILED);
    const successfulSteps = toolCalls.filter(s => s.status === StepStatus.SUCCESS);
    
    return {
      totalSteps: this.steps.length,
      toolCallCount: toolCalls.length,
      successCount: successfulSteps.length,
      failedCount: failedSteps.length,
      decisionCount: this.steps.filter(s => s.type === StepType.AGENT_DECISION).length,
      userFeedbackCount: this.steps.filter(s => s.type === StepType.USER_FEEDBACK).length,
      totalDuration: this._getTotalDuration()
    };
  }

  /**
   * 保存轨迹到文件
   */
  save() {
    ensureDir();
    
    const trajectory = this.getTrajectory();
    const filename = `${this.taskId}_${Date.now()}.json`;
    const filepath = path.join(TRAJECTORY_DIR, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(trajectory, null, 2), 'utf-8');
    
    console.log(`[TrajectoryRecorder] Saved trajectory to ${filepath}`);
    return filepath;
  }

  // ========== 私有方法 ==========

  /**
   * 找到对应的pending步骤
   */
  _findPendingStep(toolName) {
    // 从后往前找最近的pending步骤
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];
      if (step.type === StepType.TOOL_CALL && 
          step.tool === toolName && 
          step.status === StepStatus.PENDING) {
        return step;
      }
    }
    return null;
  }

  /**
   * 计算步骤持续时间
   */
  _calculateDuration(step) {
    const stepTime = new Date(step.timestamp).getTime();
    const now = Date.now();
    return now - stepTime;
  }

  /**
   * 计算总持续时间
   */
  _getTotalDuration() {
    if (!this.endTime) {
      return Date.now() - new Date(this.startTime).getTime();
    }
    return new Date(this.endTime).getTime() - new Date(this.startTime).getTime();
  }

  /**
   * 脱敏输入（移除敏感信息）
   */
  _sanitizeInputs(toolName, inputs) {
    if (!inputs) return {};
    
    const sanitized = { ...inputs };
    
    // 通用脱敏
    const sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'authorization'];
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    }
    
    // 工具特定脱敏
    switch (toolName) {
      case 'exec':
        // 保留命令但不保留可能包含敏感信息的部分
        if (sanitized.command) {
          // 移除可能的密码参数
          sanitized.command = sanitized.command.replace(/--password\s+\S+/g, '--password ***');
          sanitized.command = sanitized.command.replace(/-p\s+\S+/g, '-p ***');
        }
        break;
      case 'message':
        // 消息内容脱敏
        if (sanitized.token) sanitized.token = '***REDACTED***';
        break;
    }
    
    return sanitized;
  }

  /**
   * 脱敏输出
   */
  _sanitizeOutputs(toolName, outputs) {
    if (!outputs) return null;
    
    const sanitized = { ...outputs };
    
    // 通用脱敏
    const sensitiveKeys = ['password', 'token', 'api_key', 'secret'];
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    }
    
    // 限制输出大小（防止过大）
    if (typeof sanitized === 'string' && sanitized.length > 10000) {
      return sanitized.substring(0, 10000) + '\n... [truncated]';
    }
    
    if (sanitized.stdout && typeof sanitized.stdout === 'string' && sanitized.stdout.length > 5000) {
      sanitized.stdout = sanitized.stdout.substring(0, 5000) + '\n... [truncated]';
    }
    
    return sanitized;
  }

  /**
   * 脱敏错误信息
   */
  _sanitizeError(error) {
    if (!error) return null;
    
    let message = error.message || String(error);
    
    // 移除可能的敏感信息
    message = message.replace(/password["\s:=]+\S+/gi, 'password=***');
    message = message.replace(/token["\s:=]+\S+/gi, 'token=***');
    message = message.replace(/api[_-]?key["\s:=]+\S+/gi, 'api_key=***');
    
    return {
      name: error.name || 'Error',
      message: message,
      stack: error.stack ? error.stack.substring(0, 2000) : null
    };
  }
}

/**
 * 辅助函数：创建带自动保存的记录器
 */
function createAutoSavingRecorder(taskId, taskType, metadata = {}, autoSaveInterval = 60000) {
  const recorder = new TrajectoryRecorder(taskId, taskType, metadata);
  
  // 设置自动保存
  const autoSaveTimer = setInterval(() => {
    if (!recorder.ended) {
      try {
        recorder.save();
        console.log(`[TrajectoryRecorder] Auto-saved trajectory for task ${taskId}`);
      } catch (err) {
        console.error(`[TrajectoryRecorder] Auto-save failed: ${err.message}`);
      }
    }
  }, autoSaveInterval);
  
  // 确保持续任务也能保存
  recorder.save = (() => {
    const originalSave = recorder.save.bind(recorder);
    return () => {
      clearInterval(autoSaveTimer);
      return originalSave();
    };
  })();
  
  return recorder;
}

module.exports = {
  TrajectoryRecorder,
  createAutoSavingRecorder,
  StepType,
  StepStatus,
  TRAJECTORY_DIR
};