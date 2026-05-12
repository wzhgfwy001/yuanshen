// 【气流顺引+】Gust of Wind+ - 自动路由增强版（含向量触发器）

/**
 * Skills意图自动路由器 + 三位一体触发机制
 * 
 * 增强功能：
 * - 路由决策时自动注入错误预警（来自learnings/errors.json）
 * - 路由决策时自动推荐Skills（来自yangshen_skills向量库）
 * - 路由决策时自动推荐Agents（来自yangshen_agents向量库）
 */

const path = require('path');
const hub = require(path.join(__dirname, '../skill-hub/skill-hub.js'));

// 向量触发器模块
let trigger = null;
try {
    trigger = require('./auto-trigger-sync.js');
} catch(e) {
    console.log('[auto-router+] Warning: auto-trigger-sync not available:', e.message);
}

/**
 * 分析用户消息，返回推荐的技能 + 向量预警
 * @param {string} userMessage - 用户消息
 * @param {object} options - { vector: true } 启用向量搜索预警
 */
function route(userMessage, options = {}) {
    const enableVector = options.vector !== false && trigger;
    const msg = userMessage.toLowerCase();
    const recommendations = [];
    
    // ========================================
    // 第一层：情绪检测（始终执行，高优先级）
    // ========================================
    const frustration = hub.detectFrustration ? hub.detectFrustration(userMessage) : { level: 'none' };
    const frLevel = frustration.level;
    const isFrustrated = (typeof frLevel === 'string' && frLevel !== 'none' && frLevel !== 'light') ||
                         (typeof frLevel === 'number' && frLevel >= 2);
    if (isFrustrated) {
        recommendations.push({
            skill: 'frustration',
            reason: `检测到用户${frLevel === 'high' || frLevel >= 3 ? '高' : '中'}度不满信号`,
            method: 'detectFrustration',
            priority: 'high'
        });
    }
    
    // ========================================
    // 第二层：关键词匹配路由
    // ========================================
    if (msg.includes('代码') || msg.includes('review') || msg.includes('审查') || msg.includes('检查代码')) {
        recommendations.push({ skill: 'codeReview', reason: '代码审查请求', method: 'reviewCode', priority: 'normal' });
    }
    if (msg.includes('博客') || msg.includes('文章') || msg.includes('写一篇')) {
        recommendations.push({ skill: 'blog', reason: '博客/文章写作', method: 'writeBlog', priority: 'normal' });
    }
    if (msg.includes('分析') || msg.includes('数据') || msg.includes('统计')) {
        recommendations.push({ skill: 'analysis', reason: '数据分析请求', method: 'analyze', priority: 'normal' });
    }
    if (msg.includes('规划') || msg.includes('计划') || msg.includes('项目')) {
        recommendations.push({ skill: 'planner', reason: '项目规划请求', method: 'planProject', priority: 'normal' });
    }
    if (msg.includes('研究') || msg.includes('调研') || msg.includes('调查')) {
        recommendations.push({ skill: 'research', reason: '研究调研请求', method: 'research', priority: 'normal' });
    }
    if (msg.includes('图表') || msg.includes('可视化') || msg.includes('dashboard')) {
        recommendations.push({ skill: 'visual', reason: '可视化请求', method: 'createChart', priority: 'normal' });
    }
    if (msg.includes('小红书') || msg.includes('种草')) {
        recommendations.push({ skill: 'xiaohongshu', reason: '小红书写作', method: 'writeXiaohongshu', priority: 'normal' });
    }
    if (msg.includes('任务') || msg.includes('分类')) {
        recommendations.push({ skill: 'classifier', reason: '任务分类', method: 'classifyTask', priority: 'normal' });
    }
    
    // ========================================
    // 第三层：向量触发器（路由决策增强）
    // ========================================
    const vectorContext = {
        warnings: [],      // 错误预警
        skillHints: [],    // Skills推荐
        agentHints: [],    // Agents推荐
        memoryContext: []  // 记忆上下文
    };
    
    if (enableVector && trigger && recommendations.length > 0) {
        const primaryTask = recommendations[0].reason || userMessage;
        
        try {
            // 获取错误预警（防止重蹈覆辙）
            vectorContext.warnings = trigger.getWarnings(userMessage, 3);
        } catch(e) {
            // 向量查询失败不影响主流程
        }
        
        try {
            // 获取Skills推荐（增强路由）
            vectorContext.skillHints = trigger.getSkillHints(userMessage, 3);
        } catch(e) {}
        
        try {
            // 获取Agents推荐（复杂任务时提示）
            vectorContext.agentHints = trigger.getAgentHints(userMessage, 3);
        } catch(e) {}
        
        try {
            // 获取记忆上下文（新增！）- 搜索brain和memory
            vectorContext.memoryContext = trigger.getMemoryContext(userMessage, 3);
        } catch(e) {}
    }
    
    // ========================================
    // 第四层：默认fallback
    // ========================================
    if (recommendations.length === 0) {
        recommendations.push({
            skill: 'general',
            reason: '通用任务',
            method: null,
            priority: 'low'
        });
    }
    
    return {
        recommendations,
        vector: vectorContext,
        metadata: {
            messageLength: userMessage.length,
            hasFrustration: isFrustrated,
            vectorEnabled: enableVector,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * 自动执行推荐的技能（增强版）
 */
function autoExecute(userMessage, options = {}) {
    const { vector = true, ...opts } = options;
    const result = route(userMessage, { vector });
    const recommendations = result.recommendations;
    const warnings = result.vector.warnings;
    
    // 如果有错误预警，打印出来
    if (warnings && warnings.length > 0) {
        console.log('\n⚠️ 【自动预警】检测到相关历史错误：');
        for (const w of warnings) {
            console.log(`  • ${w.id}: ${w.type}`);
            if (w.hint) console.log(`    → ${w.hint.substring(0, 100)}...`);
        }
    }
    
    if (recommendations.length === 0) {
        return { routed: false, message: '未识别到特定技能请求', ...result };
    }
    
    // 优先执行情绪检测
    const frustrationRec = recommendations.find(r => r.priority === 'high');
    if (frustrationRec) {
        const res = hub[frustrationRec.method] ? hub[frustrationRec.method](userMessage) : {};
        return { routed: true, skill: 'frustration', result: res, ...result };
    }
    
    // 执行第一个匹配的技能
    const primary = recommendations[0];
    const skill = hub[primary.method];
    
    if (typeof skill === 'function') {
        try {
            const res = skill(userMessage, opts);
            return { routed: true, skill: primary.skill, result: res, ...result };
        } catch (e) {
            return { routed: false, error: e.message, ...result };
        }
    }
    
    return { routed: false, message: '技能方法不可调用', ...result };
}

/**
 * 获取所有技能状态
 */
function getSkillsStatus() {
    return hub.getAllSkillStatus();
}

/**
 * 启动文件监控（后台运行）
 */
function startWatcher() {
    if (trigger) {
        return trigger.startFileWatcher();
    }
    return null;
}

/**
 * 向量化单个文件
 */
function vectorizeFile(filePath, collection = 'yangshen_brain') {
    if (trigger) {
        return trigger.vectorizeFileAsync(filePath, collection);
    }
    return null;
}

/**
 * 【删除同步】删除文件并从向量数据库中移除
 * 
 * 使用场景：
 * - 删除 brain/ 目录下的文件后同步
 * - 删除 memory/ 目录下的文件后同步
 * - 任何需要保持向量库一致性的文件删除
 * 
 * @param {string} filePath - 文件完整路径
 * @param {string} collection - 向量集合 (默认: yangshen_brain)
 * @returns {object} - { deleted: bool, removed: bool }
 */
function deleteAndRemoveVector(filePath, collection = 'yangshen_brain') {
    const result = { deleted: false, removed: false };
    
    try {
        // 1. 删除物理文件
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            result.deleted = true;
            console.log(`[deleteAndRemoveVector] 已删除文件: ${path.basename(filePath)}`);
        } else {
            console.log(`[deleteAndRemoveVector] 文件不存在（跳过删除）: ${filePath}`);
        }
        
        // 2. 从向量库中移除
        if (trigger) {
            trigger.removeFromVectorAsync(filePath, collection);
            result.removed = true;
            console.log(`[deleteAndRemoveVector] 已从向量库移除: ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`[deleteAndRemoveVector] 错误: ${e.message}`);
    }
    
    return result;
}

/**
 * 【写时同步】写入文件并立即更新向量数据库
 * 
 * 使用场景：
 * - 写 brain/ 目录下的文件后同步
 * - 写 memory/ 目录下的文件后同步
 * - 任何需要保持向量库一致性的文件写入
 * 
 * @param {string} filePath - 文件完整路径
 * @param {string} content - 文件内容
 * @param {string} collection - 向量集合 (默认: yangshen_brain)
 * @returns {object} - { written: bool, vectorized: bool, pid: number }
 */
const fs = require('fs');

function writeAndVectorize(filePath, content, collection = 'yangshen_brain') {
    const result = { written: false, vectorized: false, pid: null };
    
    try {
        // 1. 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // 2. 写入文件
        fs.writeFileSync(filePath, content, 'utf-8');
        result.written = true;
        
        // 3. 立即触发向量化
        if (trigger) {
            const pid = trigger.vectorizeFileAsync(filePath, collection);
            result.vectorized = true;
            result.pid = pid;
            console.log(`[writeAndVectorize] 已写入并触发向量化: ${path.basename(filePath)}`);
        } else {
            console.log(`[writeAndVectorize] 已写入但未触发向量化 (trigger不可用): ${path.basename(filePath)}`);
        }
    } catch (e) {
        console.error(`[writeAndVectorize] 错误: ${e.message}`);
    }
    
    return result;
}

module.exports = {
    route,
    autoExecute,
    getSkillsStatus,
    startWatcher,
    vectorizeFile,
    writeAndVectorize,  // 写时同步
    deleteAndRemoveVector  // 新增：删除同步
};

// 测试模式
if (require.main === module) {
    const tests = [
        '帮我写一篇博客',
        '分析一下销售数据',
        '开发一个新的向量数据库功能',
        '代码有bug帮我看看'
    ];
    
    console.log('\n=== Auto-Router+ 测试 ===\n');
    for (const msg of tests) {
        console.log(`\n输入: "${msg}"`);
        const result = route(msg, { vector: true });
        console.log('路由:', result.recommendations.map(r => r.skill).join(', '));
        if (result.vector.warnings.length > 0) {
            console.log('⚠️ 预警:', result.vector.warnings.map(w => w.id).join(', '));
        }
        if (result.vector.skillHints.length > 0) {
            console.log('📦 Skills:', result.vector.skillHints.map(s => s.skill_name).join(', '));
        }
        console.log('---');
    }
}
