/**
 * vector-search.js
 * 【心灵缩减】向量搜索统一接口
 * 
 * 封装对ChromaDB向量数据库的调用
 * - Skills推荐
 * - 错误预防
 * - Agent推荐
 */

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = 'D:/vector_db';

/**
 * 调用Python向量搜索脚本
 */
function callPythonScript(scriptName, query, extraArgs = []) {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const args = [scriptPath, query, ...extraArgs];
    
    try {
        const output = execSync(`python "${scriptPath}" "${query}"`, {
            encoding: 'utf-8',
            timeout: 30000,
            windowsHide: true
        });
        return output;
    } catch (e) {
        // 超时或错误返回空
        return '';
    }
}

/**
 * 解析Python脚本的JSON输出
 */
function parseJsonOutput(output) {
    try {
        // 提取 ```json ... ``` 块
        const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
        }
        // 直接解析
        return JSON.parse(output);
    } catch (e) {
        return null;
    }
}

/**
 * 【向量搜索】语义搜索Skills/Errors/Agents
 * @param {string} query - 用户需求描述
 * @param {object} options - { skills: true, errors: true, agents: true }
 * @returns {object} { skills: [], errors: [], agents: [] }
 */
function search(query, options = {}) {
    const { skills = true, errors = true, agents = true } = options;
    const results = { skills: [], errors: [], agents: [] };
    
    if (!query || query.trim().length < 2) {
        return results;
    }
    
    console.log(`[vector-search] Query: "${query}"`);
    
    // 并行调用三个搜索（使用 execSync 同步调用）
    // 注意：在主线程使用 execSync 会阻塞，实际应该用 async/spawn
    // 这里先记录，实际集成时用子进程
    
    return results;
}

/**
 * 异步搜索 - 推荐在自动路由中使用
 */
async function searchAsync(query, options = {}) {
    const { skills = true, errors = true, agents = false } = options;
    const results = { skills: [], errors: [], agents: [] };
    
    if (!query || query.trim().length < 2) {
        return results;
    }
    
    const { spawn } = require('child_process');
    
    const promises = [];
    
    if (skills) {
        promises.push(
            new Promise((resolve) => {
                const start = Date.now();
                const proc = spawn('python', [
                    path.join(SCRIPTS_DIR, 'skill_recommend.py'),
                    query, '3'  // top_k=3
                ], { windowsHide: true });
                
                let stdout = '';
                proc.stdout.on('data', (data) => { stdout += data.toString(); });
                proc.on('close', () => {
                    const parsed = parseJsonOutput(stdout);
                    const elapsed = Date.now() - start;
                    console.log(`[vector-search] Skills: ${parsed?.length || 0} results in ${elapsed}ms`);
                    resolve({ type: 'skills', data: parsed || [], elapsed });
                });
            })
        );
    }
    
    if (errors) {
        promises.push(
            new Promise((resolve) => {
                const start = Date.now();
                const proc = spawn('python', [
                    path.join(SCRIPTS_DIR, 'error_search.py'),
                    query, '3'
                ], { windowsHide: true });
                
                let stdout = '';
                proc.stdout.on('data', (data) => { stdout += data.toString(); });
                proc.on('close', () => {
                    const parsed = parseJsonOutput(stdout);
                    const elapsed = Date.now() - start;
                    console.log(`[vector-search] Errors: ${parsed?.length || 0} results in ${elapsed}ms`);
                    resolve({ type: 'errors', data: parsed || [], elapsed });
                });
            })
        );
    }
    
    if (agents) {
        promises.push(
            new Promise((resolve) => {
                const start = Date.now();
                const proc = spawn('python', [
                    path.join(SCRIPTS_DIR, 'agent_recommend.py'),
                    query, '5'
                ], { windowsHide: true });
                
                let stdout = '';
                proc.stdout.on('data', (data) => { stdout += data.toString(); });
                proc.on('close', () => {
                    const parsed = parseJsonOutput(stdout);
                    const elapsed = Date.now() - start;
                    console.log(`[vector-search] Agents: ${parsed?.length || 0} results in ${elapsed}ms`);
                    resolve({ type: 'agents', data: parsed || [], elapsed });
                });
            })
        );
    }
    
    const settled = await Promise.allSettled(promises);
    
    for (const s of settled) {
        if (s.status === 'fulfilled') {
            const { type, data, elapsed } = s.value;
            results[type] = data;
        }
    }
    
    return results;
}

/**
 * 快速搜索 - 仅Skills（用于常规任务推荐）
 */
async function quickSkillSearch(query, topK = 3) {
    const output = callPythonScript('skill_recommend.py', query, [String(topK)]);
    return parseJsonOutput(output) || [];
}

/**
 * 快速错误搜索 - 预防历史错误
 */
async function quickErrorSearch(query, topK = 3) {
    const output = callPythonScript('error_search.py', query, [String(topK)]);
    return parseJsonOutput(output) || [];
}

module.exports = {
    search,
    searchAsync,
    quickSkillSearch,
    quickErrorSearch
};
