/**
 * memory-search-enhanced.js
 * 【记忆融合搜索】混合搜索模块
 * 
 * 功能：
 * 1. 关键词搜索（阴神原有逻辑）
 * 2. 向量语义搜索（新增）
 * 3. 混合结果排序输出
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const SCRIPTS_DIR = 'D:/vector_db';
const WORKSPACE = 'C:/Users/DELL/.openclaw/workspace';

/**
 * 解析Python脚本的JSON输出
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
 * 【关键词搜索】阴神原有搜索逻辑
 */
function keywordSearch(query, options = {}) {
    const { dirs = ['brain', 'memory', 'learnings'], maxResults = 10 } = options;
    const results = [];
    const queryLower = query.toLowerCase();

    for (const dir of dirs) {
        const dirPath = path.join(WORKSPACE, dir);
        if (!fs.existsSync(dirPath)) continue;

        const files = getMarkdownFiles(dirPath);
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf-8');
                const lines = content.split('\n');
                
                // 简单关键词匹配
                let matched = false;
                let snippet = '';
                let lineNum = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(queryLower)) {
                        matched = true;
                        lineNum = i + 1;
                        snippet = lines.slice(Math.max(0, i-1), Math.min(lines.length, i+3)).join(' ').substring(0, 200);
                        break;
                    }
                }

                if (matched) {
                    results.push({
                        type: 'file',
                        source: 'keyword',
                        file: file.replace(WORKSPACE, ''),
                        matched: true,
                        snippet,
                        line: lineNum,
                        score: 1.0
                    });
                }
            } catch (e) {}
        }
    }

    return results.slice(0, maxResults);
}

/**
 * 【向量搜索】调用Chroma向量数据库
 */
function vectorSearch(query, options = {}) {
    const { collections = ['yangshen_skills', 'yangshen_errors', 'yangshen_brain'], topK = 5 } = options;
    const results = [];

    // 调用Python向量搜索
    try {
        const output = execSync(
            `python "${path.join(SCRIPTS_DIR, 'skill_recommend.py')}" "${query}" ${topK}`,
            { encoding: 'utf-8', timeout: 15000, windowsHide: true }
        );
        const skills = parseJson(output);
        if (skills && Array.isArray(skills)) {
            for (const s of skills) {
                results.push({
                    type: 'skill',
                    source: 'vector',
                    name: s.skill_name || s.name,
                    category: s.category,
                    description: s.description,
                    path: s.path,
                    score: 1.0 - (s.rank - 1) * 0.1
                });
            }
        }
    } catch (e) {}

    // 调用Error搜索
    try {
        const output = execSync(
            `python "${path.join(SCRIPTS_DIR, 'error_search.py')}" "${query}" ${topK}`,
            { encoding: 'utf-8', timeout: 15000, windowsHide: true }
        );
        const errors = parseJson(output);
        if (errors && Array.isArray(errors)) {
            for (const e of errors) {
                results.push({
                    type: 'error',
                    source: 'vector',
                    code: e.code || e.id,
                    doc: e.doc,
                    rank: e.rank,
                    score: 1.0 - (e.rank - 1) * 0.1
                });
            }
        }
    } catch (e) {}

    return results;
}

/**
 * 【记忆融合搜索】主函数 - 混合关键词+向量搜索
 */
function memorySearch(query, options = {}) {
    const { vector = true, keyword = true, topK = 10 } = options;
    
    const results = {
        query,
        timestamp: new Date().toISOString(),
        keywordResults: [],
        vectorResults: [],
        merged: []
    };

    // 关键词搜索
    if (keyword) {
        results.keywordResults = keywordSearch(query, { maxResults: topK });
    }

    // 向量搜索
    if (vector) {
        results.vectorResults = vectorSearch(query, { topK });
    }

    // 混合排序（按score降序）
    const all = [
        ...results.keywordResults.map(r => ({ ...r, searchType: 'keyword' })),
        ...results.vectorResults.map(r => ({ ...r, searchType: 'vector' }))
    ];

    // 按score排序
    all.sort((a, b) => (b.score || 0) - (a.score || 0));

    results.merged = all.slice(0, topK);

    return results;
}

/**
 * 获取目录下所有markdown文件
 */
function getMarkdownFiles(dir) {
    const files = [];
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                files.push(...getMarkdownFiles(fullPath));
            } else if (item.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    } catch (e) {}
    return files;
}

/**
 * 打印搜索结果
 */
function printResults(results) {
    console.log('\n=== 【记忆融合搜索】结果 ===');
    console.log(`查询: "${results.query}"`);
    console.log(`时间: ${results.timestamp}`);
    console.log();

    if (results.merged.length === 0) {
        console.log('未找到相关结果');
        return;
    }

    console.log(`找到 ${results.merged.length} 个结果:\n`);

    for (const [i, r] of results.merged.entries()) {
        const icon = r.source === 'vector' ? '🔮' : '📄';
        const typeTag = r.type.toUpperCase();
        console.log(`${i + 1}. ${icon} [${typeTag}] ${r.searchType === 'vector' ? '向量' : '关键词'}匹配`);

        if (r.type === 'skill') {
            console.log(`   技能: ${r.name} (${r.category})`);
            if (r.description) {
                console.log(`   描述: ${r.description.substring(0, 80)}...`);
            }
        } else if (r.type === 'error') {
            console.log(`   错误: ${r.code}`);
            if (r.doc) {
                console.log(`   说明: ${r.doc.substring(0, 80)}...`);
            }
        } else if (r.type === 'file') {
            console.log(`   文件: ${r.file}`);
            if (r.snippet) {
                console.log(`   内容: ${r.snippet}...`);
            }
        }
        console.log();
    }
}

// 测试
if (require.main === module) {
    const query = process.argv.slice(2).join(' ') || '向量数据库';
    
    console.log(`\n查询: "${query}"`);
    
    const results = memorySearch(query, { vector: true, keyword: true });
    printResults(results);
}

module.exports = {
    memorySearch,
    keywordSearch,
    vectorSearch,
    printResults
};
