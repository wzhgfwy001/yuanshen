/**
 * Unified Tracker - 统一追踪器
 * 
 * 【2026-04-27 新建】
 * 功能：合并因果链(causal-chain)和Tracker(tracker-increment)的追踪功能
 * 
 * 解决Conflict 4: 因果链和Tracker重复的问题
 * 
 * 使用方式：
 * const tracker = require('./unified-tracker.js');
 * 
 * const trackInfo = tracker.start('任务描述', options);
 * // trackInfo = { id, taskId, startTime }
 * 
 * tracker.complete(trackInfo, { success: true, duration: 1000 });
 */

const path = require('path');
const fs = require('fs');

// 延迟加载依赖
let causalChain = null;
let trackerIncrement = null;

/**
 * 初始化加载因果链和Tracker
 */
function init() {
    if (!causalChain) {
        try {
            causalChain = require('./causal-chain.js');
            console.log('[UnifiedTracker] ✅ causal-chain loaded');
        } catch(e) {
            console.log('[UnifiedTracker] ⚠️ causal-chain not available:', e.message);
            causalChain = null;
        }
    }
    
    if (!trackerIncrement) {
        try {
            trackerIncrement = require('./subagent-manager/tracker-increment.js');
            console.log('[UnifiedTracker] ✅ tracker-increment loaded');
        } catch(e) {
            console.log('[UnifiedTracker] ⚠️ tracker-increment not available:', e.message);
            trackerIncrement = null;
        }
    }
}

/**
 * 启动追踪 - 同时启动因果链和Tracker记录
 * @param {string} taskDescription - 任务描述
 * @param {object} options - 选项 { taskType, agentName, ... }
 * @returns {object} { id, taskId, startTime }
 */
function start(taskDescription, options = {}) {
    init();
    
    const now = new Date();
    const taskId = 'task-' + Date.now();
    let chainId = null;
    
    // 1. 启动因果链
    if (causalChain && causalChain.start) {
        try {
            const chain = causalChain.start(taskDescription);
            chainId = chain.id;
            console.log('[UnifiedTracker] 因果链已启动:', chainId);
        } catch(e) {
            console.log('[UnifiedTracker] ⚠️ 因果链启动失败:', e.message);
        }
    }
    
    // 2. 初始化Tracker记录
    if (trackerIncrement && trackerIncrement.increment) {
        try {
            trackerIncrement.increment({
                taskId: taskId,
                category: options.taskType || 'unknown',
                agentName: options.agentName || 'orchestrator',
                success: null // 未知，待完成
            });
            console.log('[UnifiedTracker] Tracker记录已初始化:', taskId);
        } catch(e) {
            console.log('[UnifiedTracker] ⚠️ Tracker记录失败:', e.message);
        }
    }
    
    return {
        id: chainId,           // 因果链ID
        taskId: taskId,        // Tracker任务ID
        startTime: now.toISOString()
    };
}

/**
 * 完成追踪 - 同时结束因果链和更新Tracker记录
 * @param {object} trackInfo - start()返回的追踪信息 { id, taskId }
 * @param {object} result - 执行结果 { success, duration, ... }
 */
function complete(trackInfo, result) {
    init();
    
    const now = new Date();
    
    // 1. 完成因果链
    if (causalChain && causalChain.complete && trackInfo.id) {
        try {
            causalChain.complete(trackInfo.id, {
                success: result.success,
                duration: result.duration,
                agentsCount: result.agentsCount || 0,
                error: result.error || null
            });
            console.log('[UnifiedTracker] 因果链已完成:', trackInfo.id);
        } catch(e) {
            console.log('[UnifiedTracker] ⚠️ 因果链完成失败:', e.message);
        }
    }
    
    // 2. 更新Tracker记录
    if (trackerIncrement && trackerIncrement.increment && trackInfo.taskId) {
        try {
            trackerIncrement.increment({
                taskId: trackInfo.taskId,
                category: result.taskType || 'unknown',
                agentName: 'orchestrator',
                success: result.success
            });
            console.log('[UnifiedTracker] Tracker记录已更新:', trackInfo.taskId);
        } catch(e) {
            console.log('[UnifiedTracker] ⚠️ Tracker更新失败:', e.message);
        }
    }
}

/**
 * 记录子Agent执行结果
 * @param {object} subagentResult - 子Agent执行结果
 */
function recordSubagent(subagentResult) {
    init();
    
    if (trackerIncrement && trackerIncrement.increment) {
        try {
            trackerIncrement.increment({
                taskId: 'subagent-' + Date.now(),
                category: subagentResult.category || 'subagent',
                agentName: subagentResult.agentName || 'unknown',
                success: subagentResult.success
            });
            console.log('[UnifiedTracker] 子Agent记录已添加:', subagentResult.agentName);
        } catch(e) {
            console.log('[UnifiedTracker] ⚠️ 子Agent记录失败:', e.message);
        }
    }
}

/**
 * 获取追踪状态
 * @param {string} trackId - 追踪ID
 * @returns {object|null} 追踪状态
 */
function getStatus(trackId) {
    init();
    
    if (causalChain && causalChain.get) {
        try {
            return causalChain.get(trackId);
        } catch(e) {
            return null;
        }
    }
    return null;
}

// 初始化
init();

// ============ 导出 ============
module.exports = {
    start,
    complete,
    recordSubagent,
    getStatus
};