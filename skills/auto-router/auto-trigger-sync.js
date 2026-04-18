/**
 * auto-trigger-sync.js
 * 【自动触发器】同步版 - 向auto-router提供即时预警
 * 
 * 提供3个同步函数，供auto-router在路由决策时即时调用：
 * - getWarnings(task): 返回错误预警
 * - getSkillHints(task): 返回Skills推荐
 * - getMemoryContext(task): 返回相关记忆上下文
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = 'D:/vector_db';

function parseJson(output) {
    try {
        const m = output.match(/```json\s*([\s\S]*?)\s*```/);
        return JSON.parse(m ? m[1] : output);
    } catch (e) {
        // 尝试直接解析
        try {
            return JSON.parse(output);
        } catch(e2) {
            return null;
        }
    }
}

/**
 * 获取错误预警（同步）
 * 返回: [{id, type, doc, hint}]
 */
function getWarnings(taskDescription, topK = 3) {
    try {
        const out = execSync(
            `python "${path.join(SCRIPTS_DIR, 'error_search.py')}" "${taskDescription.replace(/"/g, '\\"')}" ${topK}`,
            { encoding: 'utf-8', timeout: 15000, windowsHide: true }
        );
        const results = parseJson(out);
        if (!results || !Array.isArray(results)) return [];
        
        return results.map(r => ({
            id: r.id,
            type: r.type,
            hint: r.doc ? r.doc.substring(0, 150) : ''
        }));
    } catch (e) {
        return [];
    }
}

/**
 * 获取Skills推荐（同步）
 * 返回: [{skill_name, description, category}]
 */
function getSkillHints(taskDescription, topK = 3) {
    try {
        const out = execSync(
            `python "${path.join(SCRIPTS_DIR, 'skill_recommend.py')}" "${taskDescription.replace(/"/g, '\\"')}" ${topK}`,
            { encoding: 'utf-8', timeout: 15000, windowsHide: true }
        );
        const results = parseJson(out);
        if (!results || !Array.isArray(results)) return [];
        
        return results.map(r => ({
            skill_name: r.skill_name || r.name,
            description: r.description || '',
            category: r.category || ''
        }));
    } catch (e) {
        return [];
    }
}

/**
 * 获取Agent推荐（同步）
 * 返回: [{agent_name, description, category}]
 */
function getAgentHints(taskDescription, topK = 3) {
    try {
        const out = execSync(
            `python "${path.join(SCRIPTS_DIR, 'agent_recommend.py')}" "${taskDescription.replace(/"/g, '\\"')}" ${topK}`,
            { encoding: 'utf-8', timeout: 15000, windowsHide: true }
        );
        const results = parseJson(out);
        if (!results || !Array.isArray(results)) return [];
        
        return results.map(r => ({
            agent_name: r.agent_name || r.name,
            description: r.description || '',
            category: r.category || ''
        }));
    } catch (e) {
        return [];
    }
}

/**
 * 获取记忆上下文（同步） - 搜索brain/memory
 * 返回: [{source, id, content, relevance}]
 */
function getMemoryContext(taskDescription, topK = 5) {
    try {
        const out = execSync(
            `python "${path.join(SCRIPTS_DIR, 'memory_search.py')}" "${taskDescription.replace(/"/g, '\\"')}" ${topK}`,
            { encoding: 'utf-8', timeout: 30000, windowsHide: true }
        );
        const results = parseJson(out);
        if (!results || !results.results) return [];
        
        return results.results.map(r => ({
            source: r.source,        // 'brain' | 'memory'
            id: r.id,               // 文件ID
            content: r.content,     // 内容片段
            relevance: r.relevance  // 相关度 0-1
        }));
    } catch (e) {
        console.log('[memory_search] Warning:', e.message);
        return [];
    }
}

/**
 * 向量化单个文件（异步，通过spawn）
 */
const { spawn } = require('child_process');
const fs = require('fs');

function vectorizeFileAsync(filePath, collection = 'yangshen_brain') {
    const proc = spawn('python', [
        path.join(SCRIPTS_DIR, 'vectorize_file.py'),
        filePath,
        collection,
        '{}'
    ], { windowsHide: true, detached: false });

    proc.unref(); // 不等待进程退出
    return proc.pid; // 返回PID表示已启动
}

/**
 * 从向量库中删除文件记录（异步）
 */
function removeFromVectorAsync(filePath, collection = 'yangshen_brain') {
    const proc = spawn('python', [
        path.join(SCRIPTS_DIR, 'delete_from_vector.py'),
        filePath,
        collection
    ], { windowsHide: true, detached: false });

    proc.unref();
    return proc.pid;
}

/**
 * 初始化触发器 - 启动后台文件监控
 */
let watcherPid = null;

function startFileWatcher(intervalMs = 60000) {
    const proc = spawn('node', [
        path.join(__dirname, 'file-watcher.js'),
        '--daemon'
    ], { windowsHide: true, detached: true });

    watcherPid = proc.pid;
    proc.unref();
    return watcherPid;
}

function stopFileWatcher() {
    if (watcherPid) {
        try {
            process.kill(watcherPid, 'SIGTERM');
        } catch (e) {}
        watcherPid = null;
    }
}

// 测试
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args[0] === '--warnings') {
        const task = args.slice(1).join(' ') || '开发新功能';
        console.log('Task:', task);
        console.log('Warnings:', JSON.stringify(getWarnings(task), null, 2));
    } else if (args[0] === '--skills') {
        const task = args.slice(1).join(' ') || '数据分析';
        console.log('Task:', task);
        console.log('Skills:', JSON.stringify(getSkillHints(task), null, 2));
    } else if (args[0] === '--agents') {
        const task = args.slice(1).join(' ') || '写代码';
        console.log('Task:', task);
        console.log('Agents:', JSON.stringify(getAgentHints(task), null, 2));
    } else if (args[0] === '--test') {
        const task = '开发一个新的向量数据库集成功能';
        console.log('Task:', task);
        console.log('\nWarnings:');
        console.log(JSON.stringify(getWarnings(task), null, 2));
        console.log('\nSkill Hints:');
        console.log(JSON.stringify(getSkillHints(task), null, 2));
        console.log('\nAgent Hints:');
        console.log(JSON.stringify(getAgentHints(task), null, 2));
    } else {
        console.log(`
Usage: node auto-trigger-sync.js [command]

Commands:
  --warnings [task]   Get error warnings for task
  --skills [task]     Get skill recommendations
  --agents [task]     Get agent recommendations
  --test              Test all three with sample task
        `);
    }
}

module.exports = {
    getWarnings,
    getSkillHints,
    getAgentHints,
    getMemoryContext,
    vectorizeFileAsync,
    removeFromVectorAsync,
    startFileWatcher,
    stopFileWatcher
};
