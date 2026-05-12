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
const fs = require('fs');
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
    // 第二层：关键词匹配路由（按优先级排序）
    // ========================================
    
    // 代码相关
    if (msg.includes('代码') || msg.includes('review') || msg.includes('审查') || msg.includes('检查代码') || msg.includes('bug')) {
        recommendations.push({ skill: 'codeReview', reason: '代码审查请求', method: 'reviewCode', priority: 'normal' });
    }
    
    // 博客/文章写作
    if (msg.includes('博客') || msg.includes('文章') || msg.includes('写一篇')) {
        recommendations.push({ skill: 'blog', reason: '博客/文章写作', method: 'writeBlog', priority: 'normal' });
    }
    
    // 内容采集（优先于泛化的数据分析）
    if (msg.includes('采集') || msg.includes('抓取') || msg.includes('scrape')) {
        recommendations.push({ skill: 'collector', reason: '内容采集', method: 'collectContent', priority: 'normal' });
    }
    
    // 小红书
    if (msg.includes('小红书') || msg.includes('种草')) {
        recommendations.push({ skill: 'xiaohongshu', reason: '小红书写作', method: 'writeXiaohongshu', priority: 'normal' });
    }
    
    // 小说
    if (msg.includes('小说') || msg.includes('写小说') || msg.includes('第一章') || msg.includes('剧情')) {
        recommendations.push({ skill: 'novel', reason: '小说写作', method: 'writeNovel', priority: 'normal' });
    }
    
    // 数据处理和分析
    if (msg.includes('分析') || msg.includes('统计')) {
        recommendations.push({ skill: 'analysis', reason: '数据分析请求', method: 'analyze', priority: 'normal' });
    }
    
    // 项目规划
    if (msg.includes('规划') || msg.includes('计划') || msg.includes('项目')) {
        recommendations.push({ skill: 'planner', reason: '项目规划请求', method: 'planProject', priority: 'normal' });
    }
    
    // 研究调研
    if (msg.includes('研究') || msg.includes('调研') || msg.includes('调查')) {
        recommendations.push({ skill: 'research', reason: '研究调研请求', method: 'research', priority: 'normal' });
    }
    
    // 可视化/图表
    if (msg.includes('图表') || msg.includes('可视化') || msg.includes('dashboard')) {
        recommendations.push({ skill: 'visual', reason: '可视化请求', method: 'createChart', priority: 'normal' });
    }
    
    // PPT
    if (msg.includes('ppt') || msg.includes('幻灯片') || msg.includes('演示')) {
        recommendations.push({ skill: 'ppt', reason: 'PPT制作', method: 'createPPT', priority: 'normal' });
    }
    
    // 任务分类
    if (msg.includes('任务') || msg.includes('分类')) {
        recommendations.push({ skill: 'classifier', reason: '任务分类', method: 'classifyTask', priority: 'normal' });
    }
    
    // 自动化
    if (msg.includes('自动化') || msg.includes('自动执行') || msg.includes('自动化流程')) {
        recommendations.push({ skill: 'automation', reason: '自动化操作', method: 'automate', priority: 'normal' });
    }
    
    // 发布
    if (msg.includes('发布') || msg.includes('上传') || msg.includes('发表')) {
        recommendations.push({ skill: 'publisher', reason: '内容发布', method: 'publishContent', priority: 'normal' });
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
            vectorContext.warnings = trigger.getWarnings(userMessage, 3);
        } catch(e) {}
        
        try {
            vectorContext.skillHints = trigger.getSkillHints(userMessage, 3);
        } catch(e) {}
        
        try {
            vectorContext.agentHints = trigger.getAgentHints(userMessage, 3);
        } catch(e) {}
        
        try {
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
    
    const frustrationRec = recommendations.find(r => r.priority === 'high');
    if (frustrationRec) {
        const res = hub[frustrationRec.method] ? hub[frustrationRec.method](userMessage) : {};
        return { routed: true, skill: 'frustration', result: res, ...result };
    }
    
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
 * 删除文件并从向量数据库中移除
 */
function deleteAndRemoveVector(filePath, collection = 'yangshen_brain') {
    const result = { deleted: false, removed: false };
    
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            result.deleted = true;
            console.log(`[deleteAndRemoveVector] 已删除文件: ${path.basename(filePath)}`);
        }
        
        if (trigger) {
            trigger.removeFromVectorAsync(filePath, collection);
            result.removed = true;
        }
    } catch (e) {
        console.error(`[deleteAndRemoveVector] 错误: ${e.message}`);
    }
    
    return result;
}

/**
 * 写入文件并立即更新向量数据库
 */
function writeAndVectorize(filePath, content, collection = 'yangshen_brain') {
    const result = { written: false, vectorized: false, pid: null };
    
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
        result.written = true;
        
        if (trigger) {
            const pid = trigger.vectorizeFileAsync(filePath, collection);
            result.vectorized = true;
            result.pid = pid;
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
    writeAndVectorize,
    deleteAndRemoveVector
};

// 测试模式
if (require.main === module) {
    const tests = [
        '帮我写一篇博客',
        '分析一下销售数据',
        '开发一个新的向量数据库功能',
        '代码有bug帮我看看',
        '帮我写小说第一章',
        '帮我采集一些数据',
        '我想自动化这个操作',
    ];
    
    console.log('\n=== Auto-Router+ 测试 ===\n');
    for (const msg of tests) {
        const result = route(msg, { vector: false });
        const skill = result.recommendations[0]?.skill || 'general';
        console.log(`"${msg}" -> ${skill}`);
    }
}