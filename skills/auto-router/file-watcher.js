/**
 * file-watcher.js
 * 【自动触发器】文件监控自动向量化
 * 
 * 功能：
 * - 监控 brain/、memory/、learnings/ 目录
 * - 新文件自动向量化存入Chroma
 * - 支持实时和定期扫描模式
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
    SCRIPTS_DIR: 'D:/vector_db',
    WATCH_DIRS: [
        { dir: 'C:/Users/DELL/.openclaw/workspace/brain', collection: 'yangshen_brain' },
        { dir: 'C:/Users/DELL/.openclaw/workspace/memory', collection: 'yangshen_memory' },
        { dir: 'C:/Users/DELL/.openclaw/workspace/learnings', collection: 'yangshen_learnings' }
    ],
    DEBOUNCE_MS: 2000,  // 防抖延迟
    INTERVAL_MS: 60000   // 定期扫描间隔（1分钟）
};

// 文件状态缓存
const fileStates = new Map();

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
 * 向量化单个文件
 */
function vectorizeFile(filePath, collection) {
    try {
        console.log(`[watcher] Vectorizing: ${path.basename(filePath)} → ${collection}`);
        
        const output = execSync(
        `python "${path.join(CONFIG.SCRIPTS_DIR, "vectorize_file.py")}" "${filePath}" "${collection}" "{}"`,
        { encoding: "utf-8", timeout: 30000, windowsHide: true }
    );
        
        const result = parseJson(output);
        if (result && result.success) {
            console.log(`[watcher] ✓ Vectorized: ${path.basename(filePath)}`);
            return true;
        } else {
            console.log(`[watcher] ✗ Failed: ${result?.error || 'Unknown error'}`);
            return false;
        }
    } catch (e) {
        console.log(`[watcher] ✗ Error: ${e.message}`);
        return false;
    }
}

/**
 * 获取文件状态指纹
 */
function getFileFingerprint(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return `${stat.size}_${stat.mtime.getTime()}`;
    } catch {
        return null;
    }
}

/**
 * 检查文件是否变化
 */
function hasFileChanged(filePath) {
    const fingerprint = getFileFingerprint(filePath);
    if (!fingerprint) return false;
    
    const last = fileStates.get(filePath);
    if (!last || last !== fingerprint) {
        fileStates.set(filePath, fingerprint);
        return true;
    }
    return false;
}

/**
 * 扫描目录并向量化新文件
 */
function scanAndVectorize(watchConfig, force = false) {
    const { dir, collection } = watchConfig;
    
    if (!fs.existsSync(dir)) {
        return { scanned: 0, vectorized: 0, skipped: 0 };
    }
    
    let vectorized = 0;
    let skipped = 0;
    
    const scanDir = (currentDir) => {
        const items = fs.readdirSync(currentDir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item.name);
            
            if (item.isDirectory()) {
                scanDir(fullPath);
            } else if (item.name.endsWith('.md')) {
                if (force || hasFileChanged(fullPath)) {
                    if (vectorizeFile(fullPath, collection)) {
                        vectorized++;
                    }
                } else {
                    skipped++;
                }
            }
        }
    };
    
    scanDir(dir);
    
    return { scanned: vectorized + skipped, vectorized, skipped };
}

/**
 * 扫描所有监控目录
 */
function scanAll(force = false) {
    const results = [];
    
    console.log(`\n[watcher] ${force ? 'Full' : 'Incremental'} scan started at ${new Date().toISOString()}`);
    
    for (const config of CONFIG.WATCH_DIRS) {
        const result = scanAndVectorize(config, force);
        results.push({
            dir: path.basename(config.dir),
            ...result
        });
    }
    
    const total = results.reduce((acc, r) => ({
        scanned: acc.scanned + r.scanned,
        vectorized: acc.vectorized + r.vectorized,
        skipped: acc.skipped + r.scanned - r.vectorized - r.skipped + r.skipped
    }), { scanned: 0, vectorized: 0, skipped: 0 });
    
    console.log(`[watcher] Scan complete: ${total.vectorized} vectorized, ${total.skipped} skipped`);
    
    return results;
}

/**
 * 初始化缓存（启动时扫描一次）
 */
function initCache() {
    console.log('[watcher] Initializing file cache...');
    scanAll(true);  // 强制全量扫描
    console.log('[watcher] Cache initialized');
}

/**
 * 启动文件监控
 */
function startWatching(options = {}) {
    const { intervalMs = CONFIG.INTERVAL_MS, onChange = null } = options;
    
    console.log('[watcher] File watcher started');
    console.log(`[watcher] Monitoring dirs:`);
    for (const { dir, collection } of CONFIG.WATCH_DIRS) {
        console.log(`  - ${dir} → ${collection}`);
    }
    console.log(`[watcher] Scan interval: ${intervalMs / 1000}s`);
    
    // 初始化缓存
    initCache();
    
    // 定期扫描
    const timer = setInterval(() => {
        scanAll(false);
        if (onChange) onChange();
    }, intervalMs);
    
    // 返回停止函数
    return () => {
        clearInterval(timer);
        console.log('[watcher] File watcher stopped');
    };
}

// 测试
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--once')) {
        // 单次扫描
        console.log('Running single scan...');
        scanAll(true);
    } else if (args.includes('--daemon')) {
        // 守护进程模式
        console.log('Starting daemon mode...');
        const stop = startWatching({ intervalMs: 30000 });  // 30秒
        
        process.on('SIGINT', () => {
            console.log('\n[watcher] Shutting down...');
            stop();
            process.exit(0);
        });
    } else {
        // 显示帮助
        console.log(`
Usage: node file-watcher.js [options]

Options:
  --once    Run a single scan and exit
  --daemon  Run as a background daemon (Ctrl+C to stop)

Examples:
  node file-watcher.js --once
  node file-watcher.js --daemon
        `);
    }
}

module.exports = {
    startWatching,
    scanAll,
    vectorizeFile,
    CONFIG
};
