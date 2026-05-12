/**
 * 阳神系统 - 执行入口（修复版）
 * 
 * 功能：确保所有生成任务都通过阳神系统执行
 * 
 * 正确流程：
 * 1. 主Agent接收任务
 * 2. 主Agent调用 orchestrator.executeTask() 或 prepareSpawn()
 * 3. orchestrator 自动：
 *    - 启动 causalChain.start()
 *    - 调用 preventionHooks.beforeTask()
 *    - 匹配 agency-registry 中的专业Agent
 *    - 生成 spawn 配置
 * 4. 主Agent使用 sessions_spawn 启动子Agent
 * 5. 子Agent完成后，主Agent调用：
 *    - tracker.increment() 记录到 category-validation-tracker.json
 *    - causalChain.complete() 完成因果链
 * 
 * 使用方法：
 * const executor = require('./execution-entry.js');
 * const result = executor.execute(taskDescription, sessions_spawn_fn);
 */

const path = require('path');

// 核心模块路径
const CORE_DIR = path.join(__dirname);
const ORCHESTRATOR_PATH = path.join(CORE_DIR, 'orchestrator-wrapper.js');  // 使用修复后的版本
const CAUSAL_CHAIN_PATH = path.join(CORE_DIR, 'causal-chain.js');
const PREVENTION_HOOKS_PATH = path.join(CORE_DIR, 'prevention-hooks.js');
const TRACKER_PATH = path.join(CORE_DIR, 'subagent-manager', 'tracker-increment.js');

// 延迟加载模块
let orchestrator = null;
let causalChain = null;
let preventionHooks = null;
let tracker = null;

function loadModules() {
    if (!orchestrator) {
        try {
            orchestrator = require(ORCHESTRATOR_PATH);
            console.log('✅ orchestrator loaded');
        } catch(e) {
            console.log('❌ orchestrator load failed:', e.message);
        }
    }
    if (!causalChain) {
        try {
            causalChain = require(CAUSAL_CHAIN_PATH);
            console.log('✅ causal-chain loaded');
        } catch(e) {
            console.log('⚠️ causal-chain load failed:', e.message);
        }
    }
    if (!preventionHooks) {
        try {
            preventionHooks = require(PREVENTION_HOOKS_PATH);
            console.log('✅ prevention-hooks loaded');
        } catch(e) {
            console.log('⚠️ prevention-hooks load failed:', e.message);
        }
    }
    if (!tracker) {
        try {
            tracker = require(TRACKER_PATH);
            console.log('✅ tracker loaded');
        } catch(e) {
            console.log('⚠️ tracker load failed:', e.message);
        }
    }
    return { orchestrator, causalChain, preventionHooks, tracker };
}

/**
 * 主执行函数 - 所有任务都走这个
 * @param {string} taskDescription - 任务描述（必须包含模型配置）
 * @param {function} sessionsSpawnFn - sessions_spawn函数
 * @param {object} options - 选项
 * @returns {object} 执行结果
 */
async function execute(taskDescription, sessionsSpawnFn, options = {}) {
    loadModules();
    
    const startTime = Date.now();
    const taskId = 'task-' + Date.now();
    
    console.log('\n========== 阳神系统执行入口 ==========');
    console.log('Task ID:', taskId);
    console.log('任务:', taskDescription.substring(0, 80) + '...');
    
    // 0. 【强制】任务描述必须包含模型配置
    const hasModelConfig = 
        taskDescription.includes('minimax/music-2.6') ||
        taskDescription.includes('minimax/image-01') ||
        taskDescription.includes('minimax/speech-2.8-hd');
    
    if (!hasModelConfig && options.requireModelConfig !== false) {
        console.log('⚠️ 警告: 任务描述缺少模型配置！');
        console.log('   应该包含: minimax/music-2.6 或 minimax/image-01');
    }
    
    // 1. 【强制】启动因果链
    let chainId = null;
    if (causalChain) {
        try {
            const chain = causalChain.start(taskDescription);
            chainId = chain.id;
            console.log('✅ 因果链已启动:', chainId);
        } catch(e) {
            console.log('⚠️ 因果链启动失败:', e.message);
        }
    }
    
    // 2. 【强制】预防检查
    if (preventionHooks) {
        try {
            const tools = detectToolsFromTask(taskDescription);
            preventionHooks.beforeTask({
                taskType: 'creative',
                command: taskDescription,
                tools: tools,
                environment: 'openclaw'
            });
            console.log('✅ 预防检查通过');
        } catch(e) {
            console.log('⚠️ 预防检查失败:', e.message);
            // 机械拦截 - 如果preventionHooks抛出错误，这里会捕获
            if (e.message.includes('机械拦截') || e.code === 'ORCHESTRATOR_NOT_CALLED') {
                console.log('⛔ 任务被拦截 -', e.message);
                return {
                    success: false,
                    error: e.message,
                    code: e.code || 'PREVENTION_BLOCKED',
                    chainId
                };
            }
        }
    }
    
    // 3. 【强制】获取spawn配置
    let spawnConfigs = [];
    if (orchestrator) {
        try {
            const spawnInfo = orchestrator.prepareSpawn(taskDescription, {
                maxAgents: options.maxAgents || 2,
                autoSelectAgents: true
            });
            spawnConfigs = spawnInfo.agents || [];
            console.log('✅ 匹配到', spawnConfigs.length, '个Agent配置');
            
            // 如果没有匹配到agent，用默认配置
            if (spawnConfigs.length === 0) {
                console.log('⚠️ 没有匹配到模板Agent，使用默认配置');
                spawnConfigs = [{
                    task: taskDescription,
                    runtime: 'subagent',
                    mode: 'run'
                }];
            }
        } catch(e) {
            console.log('⚠️ prepareSpawn失败:', e.message);
            spawnConfigs = [{
                task: taskDescription,
                runtime: 'subagent',
                mode: 'run'
            }];
        }
    } else {
        spawnConfigs = [{
            task: taskDescription,
            runtime: 'subagent',
            mode: 'run'
        }];
    }
    
    // 4. 【强制】Spawn子Agent
    const spawnResults = [];
    console.log('🚀 开始Spawn', spawnConfigs.length, '个子Agent...');
    
    for (let i = 0; i < spawnConfigs.length; i++) {
        const config = spawnConfigs[i];
        const label = `yangshen-${taskId}-${i}`;
        
        try {
            console.log(`   Spawning agent ${i+1}:`, label);
            const result = await sessionsSpawnFn({
                task: config.task || taskDescription,
                label: label,
                runtime: config.runtime || 'subagent',
                mode: config.mode || 'run',
                runTimeoutSeconds: config.runTimeoutSeconds || 300
            });
            
            spawnResults.push({
                index: i,
                success: true,
                sessionKey: result.sessionKey,
                runId: result.runId,
                metadata: config.metadata
            });
            
            console.log(`   ✅ Agent ${i+1} spawned successfully`);
        } catch(e) {
            console.log(`   ❌ Agent ${i+1} spawn failed:`, e.message);
            spawnResults.push({
                index: i,
                success: false,
                error: e.message
            });
        }
    }
    
    // 5. 【强制】记录到Tracker
    if (tracker) {
        try {
            tracker.increment({
                taskId: taskId,
                category: 'creative',
                agentName: 'orchestrator',
                success: spawnResults.some(r => r.success),
                duration: Date.now() - startTime,
                metadata: {
                    spawnCount: spawnConfigs.length,
                    spawnResults: spawnResults.map(r => ({
                        success: r.success,
                        sessionKey: r.sessionKey
                    }))
                }
            });
            console.log('✅ Tracker记录完成');
        } catch(e) {
            console.log('⚠️ Tracker记录失败:', e.message);
        }
    }
    
    // 6. 【强制】完成因果链
    const hasFailure = spawnResults.some(r => !r.success);
    if (causalChain && chainId) {
        try {
            if (hasFailure) {
                causalChain.fail(chainId, '部分子Agent spawn失败');
            } else {
                causalChain.complete(chainId, {
                    success: true,
                    duration: Date.now() - startTime,
                    agentsSpawned: spawnConfigs.length,
                    spawnResults: spawnResults.map(r => ({
                        index: r.index,
                        success: r.success,
                        sessionKey: r.sessionKey
                    }))
                });
            }
            console.log('✅ 因果链已完成');
        } catch(e) {
            console.log('⚠️ 因果链结束失败:', e.message);
        }
    }
    
    console.log('========== 阳神系统执行入口完成 ==========\n');
    
    return {
        success: spawnResults.some(r => r.success),
        taskId: taskId,
        chainId: chainId,
        spawnConfigs: spawnConfigs.length,
        spawnResults: spawnResults,
        duration: Date.now() - startTime
    };
}

/**
 * 检测任务中使用的工具
 */
function detectToolsFromTask(taskDescription) {
    const tools = [];
    const desc = taskDescription.toLowerCase();
    
    if (desc.includes('歌曲') || desc.includes('音乐') || desc.includes('music')) {
        tools.push('music_generate');
    }
    if (desc.includes('海报') || desc.includes('图片') || desc.includes('图像') || desc.includes('image')) {
        tools.push('image_generate');
    }
    if (desc.includes('视频') || desc.includes('video')) {
        tools.push('video_generate');
    }
    if (desc.includes('语音') || desc.includes('tts') || desc.includes('speech')) {
        tools.push('tts');
    }
    
    return tools;
}

/**
 * 快速执行 - 用于简单的spawn不需要复杂配置
 */
async function quickSpawn(taskDescription, sessionsSpawnFn, options = {}) {
    return execute(taskDescription, sessionsSpawnFn, {
        requireModelConfig: options.requireModelConfig !== false,
        maxAgents: options.maxAgents || 1
    });
}

module.exports = {
    execute,
    quickSpawn,
    loadModules,
    detectToolsFromTask
};