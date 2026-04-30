/**
 * 阳神系统 - 因果链追踪模块 v2.0
 * 
 * 功能：
 * 1. 记录任务执行的因果关系链
 * 2. 从失败中提取教训，创建learnings记录
 * 3. 新任务开始前检查相似历史失败，提供预警
 * 
 * 因果链核心原则：
 * - 不是为了记录而记录，是为了"记住教训，避免重复犯错"
 * - 每次失败都要提取root cause存入learnings/errors.json
 * - 新任务开始前检查相似失败，避免重蹈覆辙
 */

const fs = require('fs');
const path = require('path');

// 路径配置
const CORE_DIR = __dirname;
const CHAIN_FILE = path.join(CORE_DIR, '..', '..', 'state', 'causal-chain.json');
const ERRORS_FILE = path.join(CORE_DIR, '..', '..', '..', 'learnings', 'errors.json');
const BRAIN_LESSONS_DIR = path.join(CORE_DIR, '..', '..', '..', 'brain', 'lessons');

// 确保目录存在
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 加载因果链数据
function loadChain() {
    ensureDir(CHAIN_FILE);
    if (!fs.existsSync(CHAIN_FILE)) {
        return { tasks: {}, rootTasks: [], stats: { total: 0, completed: 0, failed: 0 } };
    }
    try {
        return JSON.parse(fs.readFileSync(CHAIN_FILE, 'utf8'));
    } catch (e) {
        return { tasks: {}, rootTasks: [], stats: { total: 0, completed: 0, failed: 0 } };
    }
}

// 保存因果链数据
function saveChain(chain) {
    ensureDir(CHAIN_FILE);
    fs.writeFileSync(CHAIN_FILE, JSON.stringify(chain, null, 2), 'utf8');
}

// 加载learnings/errors.json
function loadErrors() {
    if (!fs.existsSync(ERRORS_FILE)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(ERRORS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

// 保存learnings/errors.json
function saveErrors(errors) {
    ensureDir(ERRORS_FILE);
    fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2), 'utf8');
}

// 生成唯一ID
function generateId(prefix = 'ct') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取下一个错误ID
function getNextErrorId() {
    const errors = loadErrors();
    const ids = errors.map(e => {
        const match = e.id.match(/err-(\d+)/);
        return match ? parseInt(match[1]) : 0;
    });
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `err-${String(maxId + 1).padStart(3, '0')}`;
}

// 从任务描述提取关键词（用于相似度匹配）- 支持中英文
function extractKeywords(taskDescription) {
    const stopWords = new Set(['我', '你', '他', '的', '了', '是', '在', '和', '就', '都', '这', '那', '上', '下', '个', '不', '要', '会', '能', '有', '做', '给', '让', '对', '把', '被', '用', '到', '去', '来', '说', '看', '想', '知道', '也', '很', '一个', '我们', '你们', '他们', '这个', '那个', '什么', '怎么', '为什么', '自己', '因为', '所以', '但是', '而且', '或者', '如果', '虽然']);
    
    // 先按标点和空格分割
    let parts = taskDescription.split(/[\s,\.;!?，。、；！？""''（）()【】\[\]]+/);
    
    const keywords = new Set();
    
    for (const part of parts) {
        if (!part || part.length < 2) continue;
        
        // 检查是否包含中文字符
        if (/[\u4e00-\u9fa5]/.test(part)) {
            // 中文：使用2-3字符的n-gram
            for (let i = 0; i <= part.length - 2; i++) {
                const bigram = part.substring(i, i + 2);
                if (!stopWords.has(bigram)) {
                    keywords.add(bigram);
                }
            }
            // 也添加3-gram（如果长度足够）
            if (part.length >= 3) {
                const trigram = part.substring(0, 3);
                if (!stopWords.has(trigram)) {
                    keywords.add(trigram);
                }
            }
        } else {
            // 英文：直接使用，转小写
            const word = part.toLowerCase();
            if (!stopWords.has(word)) {
                keywords.add(word);
            }
        }
    }
    
    return [...keywords];
}

// 计算两个任务描述的相似度
function calculateSimilarity(task1, task2) {
    const kw1 = extractKeywords(task1);
    const kw2 = extractKeywords(task2);
    if (kw1.length === 0 || kw2.length === 0) return 0;
    
    const intersection = kw1.filter(k => kw2.includes(k)).length;
    const union = new Set([...kw1, ...kw2]).size;
    return intersection / union;
}

/**
 * 开始一个任务
 * @param {string} taskDescription - 任务描述
 * @param {string} parentId - 父任务ID（可选）
 * @returns {object} 任务记录
 */
function start(taskDescription, parentId = null) {
    const chain = loadChain();
    const id = generateId('ct');
    const now = new Date().toISOString();
    
    const taskRecord = {
        id,
        task: taskDescription,
        keywords: extractKeywords(taskDescription),
        parentId,
        status: 'running',
        startTime: now,
        endTime: null,
        result: null,
        error: null,
        errorType: null,
        rootCause: null,
        resolution: null,
        children: [],
        success: null,
        lessonsApplied: [],
        pastFailureWarnings: []
    };
    
    chain.tasks[id] = taskRecord;
    
    if (parentId && chain.tasks[parentId]) {
        chain.tasks[parentId].children.push(id);
    } else {
        chain.rootTasks.push(id);
    }
    
    chain.stats.total++;
    saveChain(chain);
    
    // 检查相似历史失败
    const warnings = getWarningsForTask(taskDescription);
    if (warnings.length > 0) {
        console.log(`⚠️ 因果链预警: 发现 ${warnings.length} 条相似历史失败`);
        warnings.forEach(w => {
            console.log(`  - [${w.errorType}] ${w.errorMessage}`);
            console.log(`    教训: ${w.rootCause}`);
        });
    }
    
    console.log(`🔗 因果链开始: ${id} - "${taskDescription.substring(0, 50)}..."`);
    return taskRecord;
}

/**
 * 标记任务完成
 * @param {string} taskId - 因果链任务ID
 * @param {object} options - 完成选项
 * @param {object} options.result - 执行结果
 * @param {object} options.tracker - Tracker记录信息（可选）
 * @param {string} options.tracker.taskId - 追踪任务ID（如 'creative-003'）
 * @param {string} options.tracker.category - 任务类型（如 'creative'）
 * @param {string} options.tracker.agentName - Agent名称
 * @param {boolean} options.tracker.success - 是否成功
 * @param {number} options.tracker.duration - 执行时长（毫秒）
 * @param {string[]} options.lessons - 教训记录（可选）
 * @returns {object} 任务记录
 */
function complete(taskId, options = {}) {
    const { result = {}, tracker = null, lessons = [] } = options;
    const chain = loadChain();
    
    if (!chain.tasks[taskId]) {
        console.log(`⚠️ 因果链: 任务 ${taskId} 不存在`);
        return null;
    }
    
    const now = new Date().toISOString();
    chain.tasks[taskId].status = 'completed';
    chain.tasks[taskId].endTime = now;
    chain.tasks[taskId].result = result;
    chain.tasks[taskId].success = true;
    chain.tasks[taskId].duration = getDuration(chain.tasks[taskId]);
    chain.stats.completed++;
    
    // 记录教训（如果有）
    if (lessons && lessons.length > 0) {
        chain.tasks[taskId].lessons = lessons;
        console.log(`📝 因果链记录教训: ${lessons.length} 条`);
        lessons.forEach(l => console.log(`  - ${l}`));
    }
    
    saveChain(chain);
    
    // 调用tracker.increment()（如果提供了tracker信息）
    if (tracker && tracker.taskId) {
        try {
            const trackerModule = require('./subagent-manager/tracker-increment.js');
            trackerModule.increment({
                taskId: tracker.taskId,
                category: tracker.category || 'unknown',
                agentName: tracker.agentName || 'main-agent',
                success: tracker.success !== false,
                duration: tracker.duration || chain.tasks[taskId].duration,
                metadata: {
                    causalChainId: taskId,
                    lessons: lessons
                }
            });
            console.log(`📊 Tracker已记录: ${tracker.taskId} | ${tracker.category || 'unknown'} | ${tracker.success !== false ? 'SUCCESS' : 'FAIL'}`);
        } catch (e) {
            console.log(`⚠️ Tracker记录失败: ${e.message}`);
        }
    }
    
    console.log(`✅ 因果链完成: ${taskId} - 耗时 ${chain.tasks[taskId].duration}ms`);
    return chain.tasks[taskId];
}

/**
 * 标记任务失败 - 同时创建教训记录
 * @param {string} taskId - 因果链任务ID
 * @param {string} errorMessage - 错误信息
 * @param {string} errorType - 错误类型（可选，自动提取）
 * @param {string} rootCause - 根本原因（可选，自动提取）
 * @param {object} options - 额外选项（可选）
 * @param {object} options.tracker - Tracker记录信息（可选）
 * @param {string} options.tracker.taskId - 追踪任务ID
 * @param {string} options.tracker.category - 任务类型
 * @param {string} options.tracker.agentName - Agent名称
 * @param {number} options.tracker.duration - 执行时长（毫秒）
 * @param {string[]} options.lessons - 教训记录（可选）
 */
function fail(taskId, errorMessage, errorType = null, rootCause = null, options = {}) {
    const { tracker = null, lessons = [] } = options;
    const chain = loadChain();
    
    if (!chain.tasks[taskId]) {
        console.log(`⚠️ 因果链: 任务 ${taskId} 不存在`);
        return null;
    }
    
    const now = new Date().toISOString();
    chain.tasks[taskId].status = 'failed';
    chain.tasks[taskId].endTime = now;
    chain.tasks[taskId].error = errorMessage;
    chain.tasks[taskId].errorType = errorType || extractErrorType(errorMessage);
    chain.tasks[taskId].rootCause = rootCause || extractRootCause(errorMessage);
    chain.tasks[taskId].success = false;
    chain.tasks[taskId].duration = getDuration(chain.tasks[taskId]);
    chain.stats.failed++;
    
    // 记录教训（如果有）
    if (lessons && lessons.length > 0) {
        chain.tasks[taskId].lessons = lessons;
    }
    
    saveChain(chain);
    
    // 自动创建教训记录
    createErrorFromFailure(chain.tasks[taskId]);
    
    // 调用tracker.increment()记录失败（如果提供了tracker信息）
    if (tracker && tracker.taskId) {
        try {
            const trackerModule = require('./subagent-manager/tracker-increment.js');
            trackerModule.recordError({
                taskId: tracker.taskId,
                category: tracker.category || 'unknown',
                agentName: tracker.agentName || 'main-agent',
                error: errorMessage,
                metadata: {
                    causalChainId: taskId,
                    rootCause: chain.tasks[taskId].rootCause,
                    lessons: lessons
                }
            });
            console.log(`📊 Tracker失败记录: ${tracker.taskId} | ${tracker.category || 'unknown'} | FAIL`);
        } catch (e) {
            console.log(`⚠️ Tracker记录失败: ${e.message}`);
        }
    }
    
    console.log(`❌ 因果链失败: ${taskId} - ${errorMessage}`);
    console.log(`📝 教训已创建: ${chain.tasks[taskId].rootCause}`);
    
    return chain.tasks[taskId];
}

/**
 * 从错误信息中提取根本原因（简单实现）
 */
function extractRootCause(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('not defined') || message.includes('undefined')) {
        return '变量/函数未定义：可能是因为没有正确引入模块或变量名拼写错误';
    }
    if (message.includes('cannot find') || message.includes('not found')) {
        return '文件/模块找不到：路径错误或文件不存在';
    }
    if (message.includes('permission')) {
        return '权限问题：没有足够的权限执行操作';
    }
    if (message.includes('timeout')) {
        return '超时：操作花费时间过长，可能是网络问题或程序卡死';
    }
    if (message.includes('syntax')) {
        return '语法错误：代码语法不正确';
    }
    if (message.includes('typeerror') || message.includes('type error')) {
        return '类型错误：数据类型不匹配';
    }
    if (message.includes('referenceerror')) {
        return '引用错误：使用了未定义的变量或函数';
    }
    
    return '未知错误：需要进一步分析';
}

/**
 * 从错误信息中提取错误类型
 */
function extractErrorType(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('not defined') || message.includes('undefined') || message.includes('is not defined')) {
        return 'ReferenceError - 引用错误';
    }
    if (message.includes('cannot find module') || message.includes('cannot find') || message.includes('modulenotfounderror')) {
        return 'ModuleNotFoundError - 模块找不到';
    }
    if (message.includes('syntax') || message.includes('syntaxerror')) {
        return 'SyntaxError - 语法错误';
    }
    if (message.includes('typeerror') || message.includes('type error') || message.includes('expected') || message.includes('got ')) {
        return 'TypeError - 类型错误';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
        return 'TimeoutError - 超时错误';
    }
    if (message.includes('permission') || message.includes('access denied') || message.includes('epermission')) {
        return 'PermissionError - 权限错误';
    }
    if (message.includes('network') || message.includes('connection') || message.includes('ECONNREFUSED')) {
        return 'NetworkError - 网络错误';
    }
    if (message.includes('memory') || message.includes('heap') || message.includes('out of memory')) {
        return 'MemoryError - 内存错误';
    }
    if (message.includes('disk') || message.includes('enoent') || message.includes('no such file')) {
        return 'IOError - 文件操作错误';
    }
    if (message.includes('registry') || message.includes('not found')) {
        return 'RegistryError - 注册表/配置错误';
    }
    if (message.includes('spawn') || message.includes('child process')) {
        return 'ProcessError - 进程错误';
    }
    
    return 'UnknownError - 未知错误';
}

/**
 * 从失败任务创建learnings/errors.json条目
 */
function createErrorFromFailure(taskRecord) {
    const errors = loadErrors();
    
    // 检查是否已有完全相同的错误
    const existingError = errors.find(e => 
        e.error_message === taskRecord.error && 
        e.context?.task === taskRecord.task
    );
    
    if (existingError) {
        console.log(`⚠️ 相同错误已记录: ${existingError.id}`);
        return existingError;
    }
    
    const errorEntry = {
        id: getNextErrorId(),
        timestamp: taskRecord.startTime,
        error_type: taskRecord.errorType || '执行错误',
        error_message: taskRecord.error || '未知错误',
        context: {
            task: taskRecord.task,
            keywords: taskRecord.keywords,
            causalChainId: taskRecord.id
        },
        root_cause: taskRecord.rootCause || extractRootCause(taskRecord.error),
        resolution: null,
        status: 'recorded'
    };
    
    errors.push(errorEntry);
    saveErrors(errors);
    
    // 同时创建brain/lessons/目录下的教训文件
    saveLessonFile(errorEntry);
    
    return errorEntry;
}

/**
 * 保存教训到brain/lessons/目录
 */
function saveLessonFile(errorEntry) {
    const date = new Date(errorEntry.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const lessonFile = path.join(BRAIN_LESSONS_DIR, `${dateStr}-${errorEntry.id}.md`);
    
    ensureDir(lessonFile);
    
    const content = `# 教训记录: ${errorEntry.id}

## 错误类型
${errorEntry.error_type}

## 错误信息
${errorEntry.error_message}

## 任务描述
${errorEntry.context?.task || '未知'}

## 根本原因
${errorEntry.root_cause}

## 时间
${errorEntry.timestamp}

## 状态
${errorEntry.status}

---
此教训由因果链自动生成
`;

    fs.writeFileSync(lessonFile, content, 'utf8');
    console.log(`📄 教训文件已创建: ${lessonFile}`);
}

/**
 * 获取任务的预警信息（基于历史相似失败）
 */
function getWarningsForTask(taskDescription) {
    const chain = loadChain();
    const errors = loadErrors();
    const warnings = [];
    
    // 1. 检查因果链中的历史失败
    const failedTasks = Object.values(chain.tasks).filter(t => t.status === 'failed');
    for (const failedTask of failedTasks) {
        const similarity = calculateSimilarity(taskDescription, failedTask.task);
        if (similarity > 0.2) { // 降低阈值到20%
            warnings.push({
                source: 'causal-chain',
                causalChainId: failedTask.id,
                errorType: failedTask.errorType,
                errorMessage: failedTask.error,
                rootCause: failedTask.rootCause,
                task: failedTask.task,
                similarity,
                date: failedTask.endTime
            });
        }
    }
    
    // 2. 检查learnings/errors.json中的错误
    for (const error of errors) {
        if (error.status === 'resolved') continue; // 已解决的错误不需要警告
        
        const errorTask = error.context?.task || '';
        const similarity = calculateSimilarity(taskDescription, errorTask);
        if (similarity > 0.2) {
            warnings.push({
                source: 'learnings',
                errorId: error.id,
                errorType: error.error_type,
                errorMessage: error.error_message,
                rootCause: error.root_cause,
                task: errorTask,
                similarity,
                date: error.timestamp
            });
        }
    }
    
    // 按相似度排序
    warnings.sort((a, b) => b.similarity - a.similarity);
    
    return warnings;
}

/**
 * 获取任务执行时长
 */
function getDuration(taskRecord) {
    if (!taskRecord.startTime) return 0;
    const start = new Date(taskRecord.startTime).getTime();
    const end = taskRecord.endTime ? new Date(taskRecord.endTime).getTime() : Date.now();
    return end - start;
}

/**
 * 获取任务链
 */
function getChain(taskId) {
    const chain = loadChain();
    const result = [];
    
    function traverse(id) {
        if (chain.tasks[id]) {
            result.push(chain.tasks[id]);
            chain.tasks[id].children.forEach(childId => traverse(childId));
        }
    }
    
    traverse(taskId);
    return result;
}

/**
 * 获取统计信息
 */
function getStats() {
    const chain = loadChain();
    const { total, completed, failed } = chain.stats;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
    
    return {
        total,
        completed,
        failed,
        pending: total - completed - failed,
        successRate: `${successRate}%`
    };
}

/**
 * 获取最近的执行记录
 */
function getRecent(limit = 10) {
    const chain = loadChain();
    const allTasks = Object.values(chain.tasks);
    
    allTasks.sort((a, b) => {
        const timeA = new Date(a.startTime || 0).getTime();
        const timeB = new Date(b.startTime || 0).getTime();
        return timeB - timeA;
    });
    
    return allTasks.slice(0, limit);
}

/**
 * 清理旧的记录（保留最近N条）
 */
function prune(keep = 100) {
    const chain = loadChain();
    const allTasks = Object.values(chain.tasks);
    
    allTasks.sort((a, b) => {
        const timeA = new Date(a.startTime || 0).getTime();
        const timeB = new Date(b.startTime || 0).getTime();
        return timeB - timeA;
    });
    
    const toKeep = new Set(allTasks.slice(0, keep).map(t => t.id));
    
    for (const task of Object.values(chain.tasks)) {
        task.children = task.children.filter(cid => toKeep.has(cid));
    }
    
    chain.rootTasks = chain.rootTasks.filter(id => toKeep.has(id));
    
    for (const id of Object.keys(chain.tasks)) {
        if (!toKeep.has(id)) {
            delete chain.tasks[id];
        }
    }
    
    saveChain(chain);
    console.log(`🧹 因果链清理完成，保留 ${keep} 条记录`);
}

module.exports = {
    start,
    complete,
    fail,
    getChain,
    getStats,
    getRecent,
    prune,
    getWarningsForTask,
    createErrorFromFailure,
    extractKeywords,
    calculateSimilarity
};
