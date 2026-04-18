/**
 * vector-trigger.js
 * 【自动触发器】向量搜索系统集成
 * 
 * 功能：
 * 1. 文件写入触发器 - 新文件自动向量化
 * 2. 查询触发器 - memory_search混合向量搜索
 * 3. 任务触发器 - 阳神任务自动errors预警+skills推荐
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
    SCRIPTS_DIR: 'D:/vector_db',
    WATCH_DIRS: [
        'C:/Users/DELL/.openclaw/workspace/brain',
        'C:/Users/DELL/.openclaw/workspace/memory',
        'C:/Users/DELL/.openclaw/workspace/learnings'
    ],
    COLLECTIONS: {
        'brain': 'yangshen_brain',
        'memory': 'yangshen_memory',
        'learnings': 'yangshen_learnings'
    }
};

// 向量数据库集合名称
const COLLECTION_MAP = {
    'brain': 'yangshen_brain',
    'memory': 'yangshen_memory', 
    'learnings': 'yangshen_learnings'
};

/**
 * 【向量搜索】主类
 */
class VectorTrigger {
    constructor() {
        this.scriptsDir = CONFIG.SCRIPTS_DIR;
    }

    /**
     * 调用Python向量搜索脚本
     */
    callPython(scriptName, args = []) {
        try {
            const cmd = `python "${path.join(this.scriptsDir, scriptName)}" ${args.map(a => `"${a}"`).join(' ')}`;
            return execSync(cmd, { encoding: 'utf-8', timeout: 15000, windowsHide: true });
        } catch (e) {
            return '';
        }
    }

    /**
     * 解析JSON输出
     */
    parseJson(output) {
        try {
            const m = output.match(/```json\s*([\s\S]*?)\s*```/);
            return JSON.parse(m ? m[1] : output);
        } catch (e) {
            return null;
        }
    }

    /**
     * 【Skills推荐】任务开始时自动调用
     */
    async recommendSkills(taskDescription, topK = 3) {
        const output = this.callPython('skill_recommend.py', [taskDescription, String(topK)]);
        return this.parseJson(output) || [];
    }

    /**
     * 【错误预警】任务开始时自动调用
     */
    async warnErrors(taskDescription, topK = 3) {
        const output = this.callPython('error_search.py', [taskDescription, String(topK)]);
        return this.parseJson(output) || [];
    }

    /**
     * 【Agent推荐】任务开始时自动调用
     */
    async recommendAgents(taskDescription, topK = 5) {
        const output = this.callPython('agent_recommend.py', [taskDescription, String(topK)]);
        return this.parseJson(output) || [];
    }

    /**
     * 【记忆搜索】混合搜索（关键词+向量）
     */
    async memorySearch(query, options = {}) {
        const { skills = true, errors = true, agents = false, topK = 3 } = options;
        
        const results = {
            query,
            timestamp: new Date().toISOString(),
            skills: [],
            errors: [],
            agents: [],
            mixed: true
        };

        // 并行搜索
        const promises = [];
        if (skills) promises.push(this.recommendSkills(query, topK).then(r => { results.skills = r; }));
        if (errors) promises.push(this.warnErrors(query, topK).then(r => { results.errors = r; }));
        if (agents) promises.push(this.recommendAgents(query, topK).then(r => { results.agents = r; }));

        await Promise.allSettled(promises);
        return results;
    }

    /**
     * 【写入触发】新文件自动向量化
     */
    async vectorizeFile(filePath, category = 'brain') {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const fileName = path.basename(filePath);
            
            // 构建metadata
            const metadata = {
                source: filePath,
                category: category,
                name: fileName,
                type: path.extname(fileName).slice(1) || 'md',
                size: content.length,
                created: fs.statSync(filePath).birthtime.toISOString()
            };

            // 调用向量化脚本
            const collection = COLLECTION_MAP[category] || 'yangshen_brain';
            const output = this.callPython('vectorize_file.py', [filePath, collection, JSON.stringify(metadata)]);
            
            return { success: true, output: output.trim() };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * 【批量向量化】初始化时向量化已有文件
     */
    async vectorizeAll(options = {}) {
        const { categories = ['brain', 'memory', 'learnings'], dryRun = false } = options;
        const results = [];

        for (const category of categories) {
            const dir = CONFIG.WATCH_DIRS[CONFIG.WATCH_DIRS.findIndex(d => d.includes(category))];
            if (!dir || !fs.existsSync(dir)) continue;

            const files = this.getMarkdownFiles(dir);
            for (const file of files) {
                if (dryRun) {
                    results.push({ file, category, action: 'would_vectorize' });
                } else {
                    const result = await this.vectorizeFile(file, category);
                    results.push({ file, category, ...result });
                }
            }
        }

        return results;
    }

    /**
     * 获取目录下所有markdown文件
     */
    getMarkdownFiles(dir) {
        const files = [];
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                files.push(...this.getMarkdownFiles(fullPath));
            } else if (item.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
        return files;
    }
}

// 导出单例
const vectorTrigger = new VectorTrigger();

module.exports = {
    vectorTrigger,
    VectorTrigger,
    CONFIG
};
