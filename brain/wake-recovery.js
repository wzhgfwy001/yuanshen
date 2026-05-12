/**
 * Wake Recovery - 断点恢复系统
 * 基于 Anthropic Managed Agents Wake 理念
 * 崩溃后自动恢复到 Session 断点
 */

const fs = require('fs');
const path = require('path');

const CHECKPOINT_DIR = path.join(__dirname, 'checkpoints');
const STATE_FILE = path.join(CHECKPOINT_DIR, 'recovery-state.json');

/**
 * Checkpoint - 断点记录
 */
class Checkpoint {
  constructor(sessionId, taskId, state, metadata = {}) {
    this.id = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.sessionId = sessionId;
    this.taskId = taskId;
    this.state = state;  // 执行状态
    this.stepNumber = metadata.stepNumber || 0;
    this.lastAction = metadata.lastAction || null;
    this.contextSnapshot = metadata.contextSnapshot || {};
    this.createdAt = new Date().toISOString();
    this.version = '1.0';
  }

  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      taskId: this.taskId,
      state: this.state,
      stepNumber: this.stepNumber,
      lastAction: this.lastAction,
      contextSnapshot: this.contextSnapshot,
      createdAt: this.createdAt,
      version: this.version
    };
  }

  /**
   * 获取摘要
   */
  getSummary() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      taskId: this.taskId,
      state: this.state,
      stepNumber: this.stepNumber,
      createdAt: this.createdAt
    };
  }
}

/**
 * Wake Recovery 主类
 */
class WakeRecovery {
  constructor() {
    this.currentSessionId = null;
    this.currentTaskId = null;
    this.checkpoints = new Map();
    this.autoSaveInterval = null;
    this.lastCheckpoint = null;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }
  }

  /**
   * 开始会话（创建新Session）
   */
  startSession(sessionId) {
    this.currentSessionId = sessionId || `session-${Date.now()}`;
    this.currentTaskId = null;
    
    const sessionFile = this.getSessionFile();
    const initData = {
      sessionId: this.currentSessionId,
      startedAt: new Date().toISOString(),
      checkpoints: []
    };
    
    fs.writeFileSync(sessionFile, JSON.stringify(initData, null, 2));
    
    console.log(`[Wake] Session started: ${this.currentSessionId}`);
    return this.currentSessionId;
  }

  /**
   * 获取会话文件路径
   */
  getSessionFile(sessionId = this.currentSessionId) {
    return path.join(CHECKPOINT_DIR, `session-${sessionId}.json`);
  }

  /**
   * 开始任务
   */
  startTask(taskId, initialState = {}) {
    if (!this.currentSessionId) {
      this.startSession();
    }
    
    this.currentTaskId = taskId;
    
    const checkpoint = new Checkpoint(this.currentSessionId, taskId, {
      status: 'running',
      progress: 0,
      ...initialState
    }, {
      stepNumber: 0,
      lastAction: 'task_started'
    });
    
    this.saveCheckpoint(checkpoint);
    console.log(`[Wake] Task started: ${taskId}`);
    
    return checkpoint;
  }

  /**
   * 保存断点
   */
  saveCheckpoint(checkpoint) {
    if (!(checkpoint instanceof Checkpoint)) {
      checkpoint = new Checkpoint(
        this.currentSessionId,
        this.currentTaskId,
        checkpoint.state || checkpoint,
        checkpoint.metadata || {}
      );
    }

    // 保存到内存
    const key = `${checkpoint.sessionId}:${checkpoint.taskId}`;
    this.checkpoints.set(key, checkpoint);
    this.lastCheckpoint = checkpoint;

    // 持久化到文件
    const sessionFile = this.getSessionFile();
    let sessionData = {};
    
    try {
      if (fs.existsSync(sessionFile)) {
        sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      }
    } catch (e) {
      // ignore
    }

    if (!sessionData.checkpoints) sessionData.checkpoints = [];
    sessionData.checkpoints.push(checkpoint.toJSON());
    
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    // 保存最新的recovery-state
    this.saveRecoveryState();
    
    console.log(`[Wake] Checkpoint saved: ${checkpoint.id}`);
    return checkpoint.id;
  }

  /**
   * 保存恢复状态
   */
  saveRecoveryState() {
    const state = {
      currentSessionId: this.currentSessionId,
      currentTaskId: this.currentTaskId,
      lastCheckpointId: this.lastCheckpoint?.id || null,
      lastCheckpointAt: this.lastCheckpoint?.createdAt || null,
      savedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }

  /**
   * Wake - 从断点恢复
   * @param {string} sessionId - 会话ID
   * @param {string} taskId - 任务ID（可选，不提供则恢复最后一个任务）
   */
  wake(sessionId = null, taskId = null) {
    // 读取恢复状态
    let state = {};
    try {
      if (fs.existsSync(STATE_FILE)) {
        state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      }
    } catch (e) {
      // ignore
    }

    // 确定恢复目标
    const targetSession = sessionId || state.currentSessionId;
    const targetTask = taskId || state.currentTaskId;

    if (!targetSession) {
      throw new Error('[Wake] No session to recover from');
    }

    // 读取会话文件
    const sessionFile = this.getSessionFile(targetSession);
    if (!fs.existsSync(sessionFile)) {
      throw new Error(`[Wake] Session not found: ${targetSession}`);
    }

    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    
    // 找到目标任务的最新断点
    let targetCheckpoint = null;
    if (sessionData.checkpoints && sessionData.checkpoints.length > 0) {
      const checkpoints = sessionData.checkpoints.filter(cp => 
        !taskId || cp.taskId === targetTask
      );
      
      if (checkpoints.length > 0) {
        targetCheckpoint = checkpoints[checkpoints.length - 1];
      }
    }

    if (!targetCheckpoint) {
      throw new Error(`[Wake] No checkpoint found for task: ${targetTask || 'last'}`);
    }

    // 恢复状态
    this.currentSessionId = targetSession;
    this.currentTaskId = targetCheckpoint.taskId;

    const checkpoint = new Checkpoint(
      targetCheckpoint.sessionId,
      targetCheckpoint.taskId,
      targetCheckpoint.state,
      {
        stepNumber: targetCheckpoint.stepNumber,
        lastAction: targetCheckpoint.lastAction
      }
    );
    checkpoint.id = targetCheckpoint.id;
    checkpoint.createdAt = targetCheckpoint.createdAt;

    console.log(`[Wake] Recovered: session=${targetSession}, task=${checkpoint.taskId}, step=${checkpoint.stepNumber}`);
    
    return {
      checkpoint,
      context: checkpoint.contextSnapshot,
      state: checkpoint.state,
      recoveredAt: new Date().toISOString()
    };
  }

  /**
   * 更新任务进度
   */
  updateProgress(stepNumber, lastAction, contextDelta = {}) {
    if (!this.lastCheckpoint) {
      console.warn('[Wake] No active checkpoint to update');
      return null;
    }

    // 创建新的checkpoint
    const checkpoint = new Checkpoint(
      this.currentSessionId,
      this.currentTaskId,
      this.lastCheckpoint.state,
      {
        stepNumber,
        lastAction,
        contextSnapshot: {
          ...this.lastCheckpoint.contextSnapshot,
          ...contextDelta
        }
      }
    );

    return this.saveCheckpoint(checkpoint);
  }

  /**
   * 完成任务
   */
  completeTask(result = {}) {
    if (!this.lastCheckpoint) {
      return false;
    }

    const checkpoint = new Checkpoint(
      this.currentSessionId,
      this.currentTaskId,
      {
        status: 'completed',
        ...this.lastCheckpoint.state,
        result
      },
      {
        stepNumber: this.lastCheckpoint.stepNumber,
        lastAction: 'task_completed'
      }
    );

    this.saveCheckpoint(checkpoint);
    console.log(`[Wake] Task completed: ${this.currentTaskId}`);
    
    this.currentTaskId = null;
    return true;
  }

  /**
   * 失败记录
   */
  failTask(error) {
    if (!this.lastCheckpoint) {
      return false;
    }

    const checkpoint = new Checkpoint(
      this.currentSessionId,
      this.currentTaskId,
      {
        status: 'failed',
        ...this.lastCheckpoint.state,
        error: error.message || String(error)
      },
      {
        stepNumber: this.lastCheckpoint.stepNumber,
        lastAction: 'task_failed'
      }
    );

    this.saveCheckpoint(checkpoint);
    console.log(`[Wake] Task failed: ${this.currentTaskId}`);
    
    return true;
  }

  /**
   * 获取活跃会话列表
   */
  listSessions() {
    const files = fs.readdirSync(CHECKPOINT_DIR).filter(f => f.startsWith('session-'));
    const sessions = [];
    
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CHECKPOINT_DIR, file), 'utf8'));
        sessions.push({
          sessionId: data.sessionId,
          startedAt: data.startedAt,
          checkpointCount: data.checkpoints?.length || 0,
          lastCheckpoint: data.checkpoints?.[data.checkpoints.length - 1]
        });
      } catch (e) {
        // ignore
      }
    }
    
    return sessions;
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      currentSessionId: this.currentSessionId,
      currentTaskId: this.currentTaskId,
      lastCheckpoint: this.lastCheckpoint?.getSummary() || null,
      savedCheckpoints: this.checkpoints.size,
      recoveryStateExists: fs.existsSync(STATE_FILE)
    };
  }

  /**
   * 清除旧会话
   */
  cleanup(olderThanDays = 7) {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    
    const files = fs.readdirSync(CHECKPOINT_DIR);
    for (const file of files) {
      const filePath = path.join(CHECKPOINT_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }
    
    console.log(`[Wake] Cleaned ${cleaned} old session files`);
    return { cleaned };
  }
}

const wakeRecovery = new WakeRecovery();

module.exports = { wakeRecovery, WakeRecovery, Checkpoint };

// 使用示例
if (require.main === module) {
  // 开始会话
  const sessionId = wakeRecovery.startSession();
  
  // 开始任务
  wakeRecovery.startTask('task-001', { description: '搜索合同' });
  
  // 模拟执行过程
  wakeRecovery.updateProgress(1, 'search_started');
  wakeRecovery.updateProgress(2, 'search_results_received');
  wakeRecovery.updateProgress(3, 'processing_results');
  
  // 完成
  wakeRecovery.completeTask({ found: 12 });
  
  // 模拟崩溃后恢复
  console.log('\n--- Simulating crash and recovery ---');
  const recovery = wakeRecovery.wake();
  console.log('Recovered:', recovery.checkpoint.taskId, 'at step', recovery.checkpoint.stepNumber);
  
  console.log('Status:', wakeRecovery.getStatus());
}