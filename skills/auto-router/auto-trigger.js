/**
 * auto-trigger.js
 * 【自动触发器】三位一体触发系统
 * 
 * 1. 文件写入触发 - 新文件自动向量化
 * 2. 查询触发 - memory_search混合搜索
 * 3. 任务触发 - 阳神任务自动errors预警+skills推荐
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// 配置
const CONFIG = {
    SCRIPTS_DIR: 'D:/vector_db',
    WORKSPACE: 'C:/Users/DELL/.openclaw/workspace',
    WATCH_DIRS: [
        { dir: 'brain', collection: 'yangshen_brain' },
        { dir: 'memory', collection: 'yangshen_memory' },
        { dir: 'learnings', collection: 'yangshen_learnings' }
    ],
    COLLECTIONS: {
        skills: 'yangshen_skills',
        errors: 'yangshen_errors',
        agents: 'yangshen_agents',
        brain: 'yangshen_brain',
        memory: 'yangshen_memory',
        learnings: 'yangshen_learnings'
    }
};

/**
 * 解析Python JSON输出
 */
function parseJson(output) {
    try {
        const m = output.match(/```json\s*([\s\S]*?)\s*```/);
        return JSON.parse(m ? m[1] : output);
    } catch (e) {
        return null;
    }
}

/**
 * 调用Python脚本
 */
function callPython(scriptName, args, timeoutMs = 20000) {
    try {
        const cmd = `python "${path.join(CONFIG.SCRIPTS_DIR, scriptName)}" ${args.map(a => `"${a}"`).join(' ')}`;
        const output = execSync(cmd, { encoding: 'utf-8', timeout: timeoutMs, windowsHide: true });
        return parseJson(output);
    } catch (e) {
        return null;
    }
}

/**
 * 【触发器1】文件写入自动向量化
 */
async function onFileWrite(filePath, category) {
    const result = await new Promise((resolve) => {
        const proc = spawn('python', [
            path.join(CONFIG.SCRIPTS_DIR, 'vectorize_file.py'),
            filePath,
            CONFIG.COLLECTIONS[category] || 'yangshen_brain',
            '{}'
        ], { windowsHide: true });

        let stdout = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.on('close', (code) => {
            resolve({ success: code === 0, output: parseJson(stdout) });
        });
        proc.on('error', (e) => {
            resolve({ success: false, error: e.message });
        });
    });

    if (result.success) {
        console.log(`[auto-trigger] ✓ Vectorized: ${path.basename(filePath)}`);
    }
    return result;
}

/**
 * 【触发器2】混合记忆搜索
 */
async function memorySearch(query, options = {}) {
    const { skills = true, errors = true, agents = false, brain = true, topK = 5 } = options;
    const results = { query, timestamp: new Date().toISOString(), skills: [], errors: [], agents: [], brain: [] };

    // Skills搜索
    if (skills) {
        const r = callPython('skill_recommend.py', [query, String(topK)]);
        if (r) results.skills = r;
    }

    // Errors搜索
    if (errors) {
        const r = callPython('error_search.py', [query, String(topK)]);
        if (r) results.errors = r;
    }

    // Agents搜索
    if (agents) {
        const r = callPython('agent_recommend.py', [query, String(topK)]);
        if (r) results.agents = r;
    }

    return results;
}

/**
 * 【触发器3】任务开始时的自动预警
 */
async function onTaskStart(taskDescription) {
    console.log(`\n[auto-trigger] 🔍 Task context: "${taskDescription.substring(0, 50)}..."`);

    // Skills + Errors 预警
    const skills = callPython('skill_recommend.py', [taskDescription, '3']) || [];
    const errors = callPython('error_search.py', [taskDescription, '3']) || [];

    const warnings = [];

    // 检查是否有相关错误历史
    if (errors && errors.length > 0) {
        warnings.push({
            type: 'error_warning',
            items: errors.slice(0, 2).map(e => ({
                code: e.code || e.id,
                hint: e.doc ? e.doc.substring(0, 100) : ''
            }))
        });
    }

    // 输出Skills推荐（供路由参考）
    if (skills && skills.length > 0) {
        console.log('[auto-trigger] 📦 Recommended skills:');
        for (const s of skills.slice(0, 3)) {
            console.log('  - ' + (s.skill_name || s.name));
        }
    }

    return { warnings, skills, errors };
}

/**
 * 扫描并向量化目录
 */
async function scanDirectory(dirName, collectionName) {
    const dirPath = path.join(CONFIG.WORKSPACE, dirName);
    if (!fs.existsSync(dirPath)) return { scanned: 0, vectorized: 0 };

    let vectorized = 0;

    const scan = (currentDir) => {
        const items = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(currentDir, item.name);
            if (item.isDirectory()) {
                scan(fullPath);
            } else if (item.name.endsWith('.md')) {
                onFileWrite(fullPath, dirName).then(r => {
                    if (r.success) vectorized++;
                });
            }
        }
    };

    scan(dirPath);
    return { scanned: vectorized, vectorized };
}

/**
 * 初始化 - 向量化所有已有文件
 */
async function initialize() {
    console.log('[auto-trigger] Initializing vector store...');

    for (const { dir, collection } of CONFIG.WATCH_DIRS) {
        const result = await scanDirectory(dir, collection);
        console.log(`[auto-trigger] ${dir}: ${result.vectorized} files vectorized`);
    }

    console.log('[auto-trigger] Initialization complete');
}

// 测试
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args[0] === '--init') {
        initialize().then(() => process.exit(0));
    } else if (args[0] === '--search') {
        const query = args.slice(1).join(' ') || '向量数据库';
        (async () => {
            const r = await memorySearch(query);
            console.log('\n=== Memory Search Results ===');
            console.log('Query:', r.query);
            console.log('\nSkills:');
            for (const s of r.skills) console.log('  -', s.skill_name || s.name);
            console.log('\nErrors:');
            for (const e of r.errors) console.log('  -', e.code || e.id);
        })();
    } else if (args[0] === '--task') {
        const task = args.slice(1).join(' ') || '分析销售数据';
        (async () => {
            const r = await onTaskStart(task);
            console.log('\nTask start results:', JSON.stringify(r, null, 2));
        })();
    } else {
        console.log(`
Usage: node auto-trigger.js [command]

Commands:
  --init     Initialize vector store (vectorize all existing files)
  --search   Test memory search
  --task     Test task start trigger

Examples:
  node auto-trigger.js --init
  node auto-trigger.js --search 向量数据库
  node auto-trigger.js --task 分析销售数据报告
        `);
    }
}

module.exports = {
    onFileWrite,
    memorySearch,
    onTaskStart,
    scanDirectory,
    initialize,
    CONFIG
};
