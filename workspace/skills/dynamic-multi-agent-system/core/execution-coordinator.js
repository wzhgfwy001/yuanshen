/**
 * execution-coordinator.js - 执行协调器
 * 
 * 【协调统御】功能模块
 * 
 * 功能：
 * - 协调子Agent执行
 * - 管理执行顺序（并行/串行）
 * - 处理子Agent回调
 * - 监控执行状态
 * - 处理超时和错误
 * 
 * 执行流程：
 * 1. 启动子Agent执行
 * 2. 子Agent执行 + 自我检查
 * 3. 主Agent确认 / 审查Agent审查
 * 4. 通过 → 下一环节
 * 5. 失败 → 错误处理
 * 
 * 导出函数：
 * - coordinateExecution(team, taskParts) - 协调执行
 * - startSubAgent(agent, task) - 启动子Agent
 * - monitorExecution(executionId) - 监控执行状态
 * - handleCallback(callback) - 处理回调
 * - waitForCompletion(executionId) - 等待完成
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ===== 配置 =====
const DEFAULT_TIMEOUT = 300; // 5分钟超时
const MAX_RETRIES = 2;
const RETRY_DELAY = 5000; // 5秒重试间隔
const MAX_PARALLEL_AGENTS = 4;

// ===== 执行状态存储 =====
const _executionStore = new Map();

/**
 * 执行状态类
 */
class ExecutionState {
  constructor(executionId) {
    this.executionId = executionId;
    this.status = 'pending'; // pending, running, completed, failed, timeout
    this.agents = new Map();
    this.currentGroupIndex = 0;
    this.startedAt = null;
    this.completedAt = null;
    this.results = [];
    this.errors = [];
  }
  
  getProgress() {
    const totalAgents = this.agents.size;
    let completed = 0;
    
    this.agents.forEach(agent => {
      if (agent.status === 'completed' || agent.status === 'failed') {
        completed++;
      }
    });
    
    return totalAgents > 0 ? completed / totalAgents : 0;
  }
  
  toJSON() {
    return {
      executionId: this.executionId,
      status: this.status,
      progress: this.getProgress(),
      currentGroupIndex: this.currentGroupIndex,
      agents: Array.from(this.agents.values()),
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      results: this.results,
      errors: this.errors
    };
  }
}

/**
 * 启动子Agent
 * @param {Object} agent - Agent配置
 * @param {Object} task - 任务配置
 * @returns {Promise<Object>} 启动结果
 */
async function startSubAgent(agent, task) {
  console.log(`[execution-coordinator] Starting agent: ${agent.id} (${agent.roleName})`);
  
  return new Promise((resolve, reject) => {
    const agentState = {
      id: agent.id,
      role: agent.roleName,
      model: agent.model,
      status: 'starting',
      startedAt: new Date().toISOString(),
      completedAt: null,
      output: null,
      error: null,
      retries: 0
    };
    
    try {
      // 这里应该调用实际的spawn逻辑
      // 根据SKILL.md，spawn语法是：
      // {
      //   "task": "...",
      //   "label": "agent-角色名称-序号",
      //   "model": "...",
      //   "cleanup": "delete",
      //   "mode": "run",
      //   "runTimeoutSeconds": 300,
      //   "thread": true
      // }
      
      const spawnConfig = {
        task: buildTaskPrompt(agent, task),
        label: `agent-${agent.role}-${agent.id}`,
        model: agent.model,
        cleanup: 'delete',
        mode: 'run',
        runTimeoutSeconds: agent.estimatedTime || DEFAULT_TIMEOUT,
        thread: true
      };
      
      console.log(`[execution-coordinator] Spawn config for ${agent.id}:`, JSON.stringify(spawnConfig, null, 2));
      
      // 模拟异步执行（实际应该调用sessions_spawn）
      // 这里返回模拟结果用于测试
      setTimeout(() => {
        agentState.status = 'completed';
        agentState.completedAt = new Date().toISOString();
        agentState.output = {
          success: true,
          data: `Output from ${agent.roleName}`,
          qualityScore: 5
        };
        resolve(agentState);
      }, 100);
      
    } catch (error) {
      agentState.status = 'failed';
      agentState.error = error.message;
      reject(error);
    }
  });
}

/**
 * 构建任务Prompt
 * @param {Object} agent - Agent配置
 * @param {Object} task - 任务配置
 * @returns {string} 任务Prompt
 */
function buildTaskPrompt(agent, task) {
  return `你是「${agent.roleName}」，负责执行任务：${task.name || task.description || '通用任务'}

## 任务目标
${task.description || task.name || '完成指定任务'}

## 输入
${JSON.stringify(task.inputs || [], null, 2)}

## 输出要求
- 格式：JSON
- 内容：完整的执行结果
- 质量：专业级

## 约束条件
- 时间：${agent.estimatedTime || DEFAULT_TIMEOUT}秒内完成
- 自我检查后提交结果

## 自我检查
完成任务后，请进行自我检查：
- [ ] 是否完成所有要求
- [ ] 输出格式是否正确
- [ ] 内容质量是否达标`;
}

/**
 * 协调执行
 * @param {Object} team - 团队配置
 * @param {Array} taskParts - 任务列表
 * @returns {Promise<Object>} 执行结果
 */
async function coordinateExecution(team, taskParts) {
  console.log(`[execution-coordinator] Coordinating execution for team: ${team.taskId}`);
  
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const state = new ExecutionState(executionId);
  _executionStore.set(executionId, state);
  
  // 初始化Agent状态
  for (const agent of team.agents) {
    state.agents.set(agent.id, {
      ...agent,
      status: 'pending',
      output: null,
      error: null
    });
  }
  
  state.status = 'running';
  state.startedAt = new Date().toISOString();
  
  console.log(`[execution-coordinator] Execution ${executionId} started with ${team.agents.length} agents`);
  
  try {
    // 按执行顺序执行（处理并行组）
    for (let groupIndex = 0; groupIndex < team.executionOrder.length; groupIndex++) {
      state.currentGroupIndex = groupIndex;
      const groupAgentIds = team.executionOrder[groupIndex];
      
      console.log(`[execution-coordinator] Processing group ${groupIndex + 1}: ${groupAgentIds.join(', ')}`);
      
      // 并行执行组内Agent
      const groupPromises = groupAgentIds.map(agentId => {
        const agent = team.agents.find(a => a.id === agentId);
        if (!agent) {
          console.log(`[execution-coordinator] Agent ${agentId} not found in team`);
          return Promise.resolve({ id: agentId, status: 'skipped', error: 'Agent not found' });
        }
        
        const task = taskParts.find(t => t.id === agent.task?.id) || agent.task || {};
        return executeAgentWithRetry(agent, task, state);
      });
      
      // 等待组内所有Agent完成
      const groupResults = await Promise.all(groupPromises);
      
      // 检查组内是否有失败
      const hasFailure = groupResults.some(r => r.status === 'failed');
      
      if (hasFailure) {
        console.log(`[execution-coordinator] Group ${groupIndex + 1} has failures, handling...`);
        const handled = await handleGroupFailure(groupResults, state);
        if (!handled) {
          // 错误处理决定中止
          state.status = 'failed';
          state.errors.push({ type: 'group-failure', groupIndex, results: groupResults });
          break;
        }
      }
      
      // 收集结果
      state.results.push(...groupResults);
      
      // 准备下一组输入
      await prepareNextGroupInputs(groupResults, groupIndex + 1, team.executionOrder, taskParts);
    }
    
    // 执行完成
    state.status = 'completed';
    state.completedAt = new Date().toISOString();
    
    console.log(`[execution-coordinator] Execution ${executionId} completed`);
    
    return {
      executionId: executionId,
      status: state.status,
      progress: state.getProgress(),
      results: state.results,
      errors: state.errors,
      completedAt: state.completedAt
    };
    
  } catch (error) {
    console.error(`[execution-coordinator] Execution ${executionId} failed:`, error);
    state.status = 'failed';
    state.errors.push({ type: 'execution-error', message: error.message });
    throw error;
  }
}

/**
 * 带重试的Agent执行
 * @param {Object} agent - Agent配置
 * @param {Object} task - 任务配置
 * @param {Object} state - 执行状态
 * @returns {Promise<Object>} 执行结果
 */
async function executeAgentWithRetry(agent, task, state) {
  let lastError = null;
  
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    try {
      console.log(`[execution-coordinator] ${agent.id} execution attempt ${retry + 1}`);
      
      const result = await startSubAgent(agent, task);
      
      // 更新状态
      const agentState = state.agents.get(agent.id);
      if (agentState) {
        agentState.status = result.status;
        agentState.output = result.output;
        agentState.error = result.error;
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`[execution-coordinator] ${agent.id} attempt ${retry + 1} failed:`, error.message);
      
      const agentState = state.agents.get(agent.id);
      if (agentState) {
        agentState.retries = retry + 1;
        agentState.lastError = error.message;
      }
      
      if (retry < MAX_RETRIES) {
        console.log(`[execution-coordinator] ${agent.id} retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  // 所有重试都失败
  return {
    id: agent.id,
    status: 'failed',
    error: lastError?.message || 'Unknown error',
    retries: MAX_RETRIES
  };
}

/**
 * 处理组内失败
 * @param {Array} results - 组内执行结果
 * @param {Object} state - 执行状态
 * @returns {boolean} 是否继续执行
 */
async function handleGroupFailure(results, state) {
  const failures = results.filter(r => r.status === 'failed');
  
  console.log(`[execution-coordinator] Handling ${failures.length} failures in group`);
  
  for (const failure of failures) {
    // 错误处理策略：
    // 1. 简单任务：主Agent接手
    // 2. 复杂任务：重试（增加超时时间）
    // 3. 严重失败：中止
    
    const agentState = state.agents.get(failure.id);
    if (!agentState) continue;
    
    if (failure.retries < MAX_RETRIES) {
      // 可重试 - 增加超时重试
      console.log(`[execution-coordinator] ${failure.id} will retry with extended timeout`);
      agentState.status = 'pending';
      agentState.retryWithExtendedTimeout = true;
    } else {
      // 不可重试 - 降级处理
      console.log(`[execution-coordinator] ${failure.id} marked for degradation`);
      agentState.status = 'degraded';
      agentState.degradedReason = 'max-retries-exceeded';
    }
  }
  
  // 检查是否所有Agent都已失败
  const allFailed = Array.from(state.agents.values()).every(a => 
    a.status === 'failed' || a.status === 'degraded'
  );
  
  return !allFailed; // 如果不是全失败，返回true继续执行
}

/**
 * 准备下一组输入
 * @param {Array} completedResults - 已完成组的结果
 * @param {number} nextGroupIndex - 下一组索引
 * @param {Array} executionOrder - 执行顺序
 * @param {Array} taskParts - 任务列表
 */
async function prepareNextGroupInputs(completedResults, nextGroupIndex, executionOrder, taskParts) {
  if (nextGroupIndex >= executionOrder.length) return;
  
  const nextGroupAgentIds = executionOrder[nextGroupIndex];
  
  for (const agentId of nextGroupAgentIds) {
    // 查找该Agent的输入来源
    const agent = taskParts.find(t => t.id === agentId);
    if (!agent || !agent.inputs) continue;
    
    // 收集依赖的输出作为输入
    const inputs = [];
    for (const inputOf of agent.inputs) {
      const inputResult = completedResults.find(r => r.id === inputOf);
      if (inputResult && inputResult.output) {
        inputs.push(inputResult.output);
      }
    }
    
    console.log(`[execution-coordinator] Prepared inputs for ${agentId}: ${inputs.length} items`);
    
    // 这里应该更新taskParts中的对应任务的输入数据
    // 实际实现中会写入共享记忆层
  }
}

/**
 * 监控执行状态
 * @param {string} executionId - 执行ID
 * @returns {Object|null} 执行状态
 */
function monitorExecution(executionId) {
  const state = _executionStore.get(executionId);
  
  if (!state) {
    console.log(`[execution-coordinator] Execution ${executionId} not found`);
    return null;
  }
  
  return state.toJSON();
}

/**
 * 处理回调
 * @param {Object} callback - 回调数据
 * @returns {Object} 处理结果
 */
function handleCallback(callback) {
  console.log('[execution-coordinator] Handling callback:', JSON.stringify(callback, null, 2));
  
  const { type, agentId, executionId, data } = callback;
  
  const state = executionId ? _executionStore.get(executionId) : null;
  
  switch (type) {
    case 'progress-update':
      // 子Agent进度更新
      if (state && agentId) {
        const agentState = state.agents.get(agentId);
        if (agentState) {
          agentState.progress = data.progress;
          agentState.status = data.status || agentState.status;
        }
      }
      return { handled: true, type: 'progress-update' };
      
    case 'quality-check-request':
      // 质量检查请求
      if (state && agentId) {
        const agentState = state.agents.get(agentId);
        if (agentState) {
          // 调用质量检查器
          const qualityResult = performQualityCheck(agentState, data);
          return {
            handled: true,
            type: 'quality-check-result',
            approved: qualityResult.approved,
            feedback: qualityResult.feedback
          };
        }
      }
      return { handled: false, reason: 'agent-not-found' };
      
    case 'authority-escalation':
      // 决策边界升级
      console.log('[execution-coordinator] Authority escalation from', agentId);
      return {
        handled: true,
        type: 'authority-escalation',
        requiresDecision: true,
        context: data
      };
      
    case 'error-report':
      // 错误报告
      if (state && agentId) {
        const agentState = state.agents.get(agentId);
        if (agentState) {
          agentState.error = data.error;
          agentState.status = 'failed';
        }
        state.errors.push({ agentId, error: data.error, timestamp: new Date().toISOString() });
      }
      return { handled: true, type: 'error-report' };
      
    case 'completion-notification':
      // 完成通知
      if (state && agentId) {
        const agentState = state.agents.get(agentId);
        if (agentState) {
          agentState.status = 'completed';
          agentState.output = data.output;
          agentState.completedAt = new Date().toISOString();
        }
      }
      return { handled: true, type: 'completion-notification' };
      
    default:
      console.log('[execution-coordinator] Unknown callback type:', type);
      return { handled: false, reason: 'unknown-type' };
  }
}

/**
 * 执行质量检查
 * @param {Object} agentState - Agent状态
 * @param {Object} data - 检查数据
 * @returns {Object} 质量检查结果
 */
function performQualityCheck(agentState, data) {
  // 简单的质量检查逻辑
  const output = data.output || agentState.output;
  
  if (!output) {
    return { approved: false, feedback: 'No output to check' };
  }
  
  // 检查输出是否有意义
  if (typeof output === 'string' && output.length < 10) {
    return { approved: false, feedback: 'Output too short, may be incomplete' };
  }
  
  // 检查是否有错误标记
  if (output.error || output.status === 'failed') {
    return { approved: false, feedback: 'Output contains error indication' };
  }
  
  return { approved: true, feedback: 'Quality check passed' };
}

/**
 * 等待完成
 * @param {string} executionId - 执行ID
 * @param {number} timeoutMs - 超时毫秒
 * @returns {Promise<Object>} 执行结果
 */
async function waitForCompletion(executionId, timeoutMs = 300000) {
  const startTime = Date.now();
  const pollInterval = 1000; // 1秒轮询
  
  console.log(`[execution-coordinator] Waiting for execution ${executionId} to complete...`);
  
  while (Date.now() - startTime < timeoutMs) {
    const state = _executionStore.get(executionId);
    
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    if (state.status === 'completed' || state.status === 'failed') {
      console.log(`[execution-coordinator] Execution ${executionId} finished with status: ${state.status}`);
      return state.toJSON();
    }
    
    // 等待一段时间
    await sleep(pollInterval);
  }
  
  // 超时
  const state = _executionStore.get(executionId);
  if (state) {
    state.status = 'timeout';
    state.errors.push({ type: 'timeout', message: `Execution exceeded ${timeoutMs}ms` });
  }
  
  throw new Error(`Execution ${executionId} timed out after ${timeoutMs}ms`);
}

/**
 * 清理执行记录
 * @param {string} executionId - 执行ID
 */
function clearExecution(executionId) {
  const state = _executionStore.get(executionId);
  if (state) {
    // 保存最终结果到日志
    const logPath = path.join(__dirname, 'execution-logs', `${executionId}.json`);
    const logDir = path.dirname(logPath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.writeFileSync(logPath, JSON.stringify(state.toJSON(), null, 2));
    console.log(`[execution-coordinator] Execution ${executionId} logged to ${logPath}`);
    
    // 从内存中移除
    _executionStore.delete(executionId);
  }
}

/**
 * 获取活动执行列表
 * @returns {Array} 执行列表
 */
function getActiveExecutions() {
  const actives = [];
  _executionStore.forEach((state, id) => {
    if (state.status === 'running' || state.status === 'pending') {
      actives.push(state.toJSON());
    }
  });
  return actives;
}

/**
 * 睡眠函数
 * @param {number} ms - 毫秒
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 导出 =====
module.exports = {
  coordinateExecution,
  startSubAgent,
  monitorExecution,
  handleCallback,
  waitForCompletion,
  clearExecution,
  getActiveExecutions,
  
  // 导出状态类供外部使用
  ExecutionState
};

// ===== 快速测试 =====
if (require.main === module) {
  console.log('=== execution-coordinator.js 快速测试 ===\n');
  
  // 模拟团队和任务
  const mockTeam = {
    taskId: 'test-team-001',
    agents: [
      { id: 'agent-001', role: 'data-analyst', roleName: '数据分析师', model: 'qwen3.5-plus', estimatedTime: 60 },
      { id: 'agent-002', role: 'writer', roleName: '内容撰写', model: 'qwen3.5-plus', estimatedTime: 120 },
      { id: 'agent-003', role: 'qa', roleName: '质量审查', model: 'MiniMax-M2.5', estimatedTime: 60 }
    ],
    executionOrder: [['agent-001'], ['agent-002'], ['agent-003']]
  };
  
  const mockTaskParts = [
    { id: 'agent-001', name: '数据收集', description: '收集并整理数据', inputs: [], estimatedTime: 60 },
    { id: 'agent-002', name: '报告撰写', description: '撰写数据分析报告', inputs: ['agent-001'], estimatedTime: 120 },
    { id: 'agent-003', name: '质量审查', description: '检查报告质量', inputs: ['agent-002'], estimatedTime: 60 }
  ];
  
  // 测试协调执行
  console.log('1. 测试协调执行:');
  coordinateExecution(mockTeam, mockTaskParts).then(result => {
    console.log(`   执行ID: ${result.executionId}`);
    console.log(`   状态: ${result.status}`);
    console.log(`   进度: ${(result.progress * 100).toFixed(1)}%`);
    console.log(`   结果数: ${result.results.length}\n`);
    
    // 测试监控
    console.log('2. 测试监控:');
    const monitored = monitorExecution(result.executionId);
    console.log(`   监控状态: ${monitored?.status}\n`);
    
    // 测试回调处理
    console.log('3. 测试回调处理:');
    const callbackResult = handleCallback({
      type: 'progress-update',
      agentId: 'agent-001',
      executionId: result.executionId,
      data: { progress: 0.5, status: 'running' }
    });
    console.log(`   回调处理结果: ${JSON.stringify(callbackResult)}\n`);
    
    // 测试活动执行列表
    console.log('4. 测试活动执行列表:');
    const actives = getActiveExecutions();
    console.log(`   活动执行数: ${actives.length}\n`);
    
    console.log('=== 测试完成 ===');
  }).catch(error => {
    console.error('测试失败:', error);
  });
}