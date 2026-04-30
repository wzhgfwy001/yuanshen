/**
 * YangShen System - 统一入口
 * 
 * 提供统一的接口访问阳神系统的所有功能
 * 
 * 【2026-04-27 简化】
 * - 移除 YangShenFlow 存根
 * - 使用 orchestrator-wrapper.js 作为唯一执行入口
 * 
 * 使用方式:
 * const ys = require('./core/index');
 * 
 * // 查询Agent
 * const agents = ys.queryAgents('生成一首歌曲');
 * 
 * // 执行任务
 * const result = await ys.execute('生成一首关于春天的歌曲');
 */

const path = require('path');

// 加载 orchestrator-wrapper.js
let orchestrator = null;
try {
    orchestrator = require('./orchestrator-wrapper.js');
    console.log('✅ YangShen orchestrator loaded');
} catch(e) {
    console.error('❌ orchestrator-wrapper.js 加载失败:', e.message);
    throw e;
}

// ============ 快捷方法 ============

/**
 * 执行任务
 */
async function execute(task, options = {}) {
    return orchestrator.executeTask(task, options);
}

/**
 * 查询匹配的Agent
 */
function queryAgents(task) {
    return orchestrator.queryAgents(task);
}

/**
 * 获取所有Agent
 */
function getAllAgents() {
    return orchestrator.getAllAgents();
}

/**
 * 获取单个Agent
 */
function getAgent(agentId) {
    return orchestrator.getAgent(agentId);
}

/**
 * 生成Spawn配置
 */
function prepareSpawn(task, options = {}) {
    return orchestrator.prepareSpawn(task, options);
}

/**
 * 批量执行任务
 */
async function executeBatch(tasks, options = {}) {
    const results = [];
    for (const task of tasks) {
        results.push(await execute(task, options));
    }
    return results;
}

/**
 * 并行执行任务
 */
async function executeParallel(tasks, options = {}) {
    return Promise.all(tasks.map(task => execute(task, options)));
}

// ============ 信息方法 ============

/**
 * 获取系统信息
 */
function getSystemInfo() {
    return {
        name: 'YangShen System',
        version: '2.0.0',
        engine: 'orchestrator-wrapper.js',
        agentCount: Object.keys(orchestrator.getAllAgents()?.agents || {}).length,
        features: [
            '智能Agent匹配',
            '因果链追踪',
            '主动预防系统',
            '多任务并行执行',
            '子Agent结果记录到阴神'
        ],
        modules: {
            orchestrator: true,
            causalChain: !!orchestrator.causalChain,
            preventionHooks: true,
            taskDecomposer: true,
            qualityChecker: true,
            teamBuilder: true,
            executionCoordinator: true,
            tracker: true,
            unifiedTracker: !!orchestrator.unifiedTracker,
            recordSubagentResult: true
        }
    };
}

/**
 * 获取版本信息
 */
function getVersion() {
    return {
        version: '2.0.0',
        engine: 'orchestrator-wrapper.js',
        status: 'stable'
    };
}

// ============ 导出 ============
module.exports = {
    // 核心执行
    execute,
    executeBatch,
    executeParallel,
    
    // 查询
    queryAgents,
    getAllAgents,
    getAgent,
    prepareSpawn,
    
    // 信息
    getSystemInfo,
    getVersion,
    
    // 原始模块（用于高级用法）
    orchestrator
};