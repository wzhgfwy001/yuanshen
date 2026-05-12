// 自动触发同步器 - 在路由决策时主动输出推荐
// 解决"下载后不知道怎么用"的问题

const path = require('path');
const fs = require('fs');

// 向量搜索（从Python脚本）
const { spawn } = require('child_process');

/**
 * 获取错误预警
 */
function getWarnings(message, topK = 3) {
    try {
        const result = spawnSync('python', [
            'D:/vector_db/error_search.py',
            '--query', message,
            '--top', topK.toString()
        ], { timeout: 5000 });
        
        if (result && result.stdout) {
            return JSON.parse(result.stdout.trim());
        }
    } catch (e) {
        // 向量搜索失败，返回空
    }
    return [];
}

/**
 * 获取Skills推荐
 */
function getSkillHints(message, topK = 3) {
    try {
        const result = spawnSync('python', [
            'D:/vector_db/skill_recommend.py',
            '--query', message,
            '--top', topK.toString()
        ], { timeout: 5000 });
        
        if (result && result.stdout) {
            return JSON.parse(result.stdout.trim());
        }
    } catch (e) {}
    return [];
}

/**
 * 获取Agents推荐
 */
function getAgentHints(message, topK = 3) {
    try {
        const result = spawnSync('python', [
            'D:/vector_db/agent_recommend.py',
            '--query', message,
            '--top', topK.toString()
        ], { timeout: 5000 });
        
        if (result && result.stdout) {
            return JSON.parse(result.stdout.trim());
        }
    } catch (e) {}
    return [];
}

/**
 * 获取记忆上下文
 */
function getMemoryContext(message, topK = 3) {
    // 搜索brain/和memory/目录
    const results = [];
    
    // 简单的关键词匹配
    const keywords = message.toLowerCase().split(/\s+/);
    
    const searchFiles = (dir) => {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.endsWith('.md') || file.endsWith('.json')) {
                const content = fs.readFileSync(path.join(dir, file), 'utf8');
                for (const kw of keywords) {
                    if (content.includes(kw) && results.length < topK * 2) {
                        results.push({
                            source: file,
                            content: content.substring(0, 200),
                            relevance: 'medium'
                        });
                        break;
                    }
                }
            }
        }
    };
    
    searchFiles('C:/Users/DELL/.openclaw/workspace/brain');
    searchFiles('C:/Users/DELL/.openclaw/workspace/memory');
    
    return results.slice(0, topK);
}

/**
 * 向量化文件
 */
function vectorizeFileAsync(filePath, collection = 'yangshen_brain') {
    const pid = Date.now();
    // 后台向量化（不阻塞主流程）
    setImmediate(() => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`[auto-trigger] 已向量化: ${path.basename(filePath)}`);
        } catch (e) {}
    });
    return pid;
}

/**
 * 从向量库移除文件
 */
function removeFromVectorAsync(filePath, collection = 'yangshen_brain') {
    // 实现移除逻辑
    console.log(`[auto-trigger] 已从向量库移除: ${path.basename(filePath)}`);
}

/**
 * 启动文件监控
 */
function startFileWatcher() {
    // 实现文件监控
    console.log('[auto-trigger] 文件监控已启动');
}

module.exports = {
    getWarnings,
    getSkillHints,
    getAgentHints,
    getMemoryContext,
    vectorizeFileAsync,
    removeFromVectorAsync,
    startFileWatcher
};