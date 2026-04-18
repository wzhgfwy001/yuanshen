/**
 * file-watcher-realtime.js
 * 【文件监控】实时版 - 使用 fs.watch() 实现毫秒级文件监控
 * 
 * 使用方式：
 *   node file-watcher-realtime.js              # 实时监控模式（默认）
 *   node file-watcher-realtime.js --daemon     # 后台守护进程模式
 *   node file-watcher-realtime.js --init       # 仅初始化扫描，不监控
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const CONFIG = {
    SCRIPTS_DIR: 'D:/vector_db',
    WATCH_DIRS: [
        {
            dir: 'C:/Users/DELL/.openclaw/workspace/brain',
            collection: 'yangshen_brain',
            filter: (f) => f.endsWith('.md')
        },
        {
            dir: 'C:/Users/DELL/.openclaw/workspace/memory',
            collection: 'yangshen_memory',
            filter: (f) => f.endsWith('.md')
        },
        {
            dir: 'C:/Users/DELL/.openclaw/workspace/learnings',
            collection: 'yangshen_learnings',
            filter: (f) => f.endsWith('.json')
        },
        {
            dir: 'C:/Users/DELL/.openclaw/workspace/skills',
            collection: 'yangshen_skills',
            filter: (f) => f === 'SKILL.md'
        }
    ],
    DEBOUNCE_MS: 2000,          // 防抖延迟
    SKIP_PATTERNS: [/node_modules/i, /\.git/i, /chroma/i],
    LOG_PREFIX: '[watcher-realtime]'
};

// 文件状态指纹缓存
const fileStates = new Map();
const pendingWrites = new Map();

/**
 * 防抖函数
 */
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * 检查是否应该跳过该文件
 */
function shouldSkip(filePath) {
    return CONFIG.SKIP_PATTERNS.some(p => p.test(filePath));
}

/**
 * 向量化单个文件
 */
function vectorizeFile(filePath, collection) {
    if (shouldSkip(filePath)) return;
    
    try {
        const result = execSync(
            `python "${path.join(CONFIG.SCRIPTS_DIR, 'vectorize_file.py')}" "${filePath}" "${collection}" "{}"`,
            { encoding: 'utf-8', timeout: 30000, windowsHide: true }
        );
        
        let parsed;
        try {
            parsed = JSON.parse(result.match(/```json\s*([\s\S]*?)\s*```/)?.[1] || result);
        } catch {
            parsed = { raw: result.substring(0, 200) };
        }
        
        if (parsed.success || parsed.id) {
            console.log(`${CONFIG.LOG_PREFIX} ✓ ${path.basename(filePath)} → ${collection}`);
        } else {
            console.log(`${CONFIG.LOG_PREFIX} △ ${path.basename(filePath)} (${parsed.message || 'skipped'})`);
        }
    } catch (e) {
        const errMsg = e.message || String(e);
        if (errMsg.includes('already exists') || errMsg.includes('duplicate')) {
            console.log(`${CONFIG.LOG_PREFIX} — ${path.basename(filePath)} (already vectorized)`);
        } else {
            console.log(`${CONFIG.LOG_PREFIX} ✗ ${path.basename(filePath)}: ${errMsg.substring(0, 80)}`);
        }
    }
}

/**
 * 获取文件指纹
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
 * 处理文件变化（防抖）
 */
const handleFileChange = debounce((eventType, filename, dirConfig) => {
    if (!filename) return;
    if (!dirConfig.filter(filename)) return;
    
    const fullPath = path.join(dirConfig.dir, filename);
    if (shouldSkip(fullPath)) return;
    
    // 检查文件是否真的变化了
    const newFingerprint = getFileFingerprint(fullPath);
    if (newFingerprint === null) return; // 文件可能已被删除
    
    const lastFingerprint = fileStates.get(fullPath);
    
    // 忽略未变化的文件
    if (lastFingerprint === newFingerprint) {
        return;
    }
    
    fileStates.set(fullPath, newFingerprint);
    vectorizeFile(fullPath, dirConfig.collection);
}, CONFIG.DEBOUNCE_MS);

/**
 * 初始化：全量扫描所有监控目录
 */
function initScan() {
    console.log(`${CONFIG.LOG_PREFIX} Initial full scan...`);
    let total = 0;
    
    for (const dirConfig of CONFIG.WATCH_DIRS) {
        if (!fs.existsSync(dirConfig.dir)) {
            console.log(`${CONFIG.LOG_PREFIX} Directory not found: ${dirConfig.dir}`);
            continue;
        }
        
        console.log(`${CONFIG.LOG_PREFIX} Scanning: ${dirConfig.dir}`);
        
        function scanDir(dir) {
            try {
                for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
                    const full = path.join(dir, item.name);
                    if (item.isDirectory()) {
                        scanDir(full);
                    } else if (dirConfig.filter(item.name) && !shouldSkip(full)) {
                        const fp = getFileFingerprint(full);
                        if (fp) {
                            fileStates.set(full, fp);
                            total++;
                            // 不在这里向量化，只记录状态
                        }
                    }
                }
            } catch (e) {
                console.log(`${CONFIG.LOG_PREFIX} Scan error on ${dir}: ${e.message}`);
            }
        }
        
        scanDir(dirConfig.dir);
    }
    
    console.log(`${CONFIG.LOG_PREFIX} Scan complete: ${total} files tracked`);
    return total;
}

/**
 * 启动实时文件监控
 */
function startRealtimeWatch() {
    console.log(`${CONFIG.LOG_PREFIX} Starting realtime watch...`);
    
    let watchCount = 0;
    
    for (const dirConfig of CONFIG.WATCH_DIRS) {
        if (!fs.existsSync(dirConfig.dir)) {
            console.log(`${CONFIG.LOG_PREFIX} Directory not found: ${dirConfig.dir}`);
            continue;
        }
        
        try {
            // 使用 fs.watch() 实时监控目录
            const watcher = fs.watch(dirConfig.dir, { recursive: true }, (eventType, filename) => {
                handleFileChange(eventType, filename, dirConfig);
            });
            
            watcher.on('error', (err) => {
                console.log(`${CONFIG.LOG_PREFIX} Watch error on ${dirConfig.dir}: ${err.message}`);
            });
            
            watchCount++;
            console.log(`${CONFIG.LOG_PREFIX} Watching: ${dirConfig.dir} → ${dirConfig.collection}`);
        } catch (e) {
            console.log(`${CONFIG.LOG_PREFIX} Failed to watch ${dirConfig.dir}: ${e.message}`);
        }
    }
    
    console.log(`${CONFIG.LOG_PREFIX} Realtime watch active (${watchCount} directories)`);
    console.log(`${CONFIG.LOG_PREFIX} Press Ctrl+C to stop`);
}

/**
 * 后台守护进程模式
 */
function startDaemon() {
    const child = spawn(process.execPath, [__filename, '--daemon-child'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    
    child.unref();
    console.log(`${CONFIG.LOG_PREFIX} Daemon started (PID: ${child.pid})`);
    process.exit(0);
}

/**
 * 主入口
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--daemon')) {
        // 后台守护进程模式
        startDaemon();
    } else if (args.includes('--init')) {
        // 仅初始化扫描
        initScan();
    } else {
        // 实时监控模式
        console.log('');
        console.log('=== File Watcher Realtime ===');
        console.log(`Monitor dirs: ${CONFIG.WATCH_DIRS.length}`);
        console.log(`Debounce: ${CONFIG.DEBOUNCE_MS}ms`);
        console.log('');
        
        initScan();
        startRealtimeWatch();
    }
}

main();

// 处理进程退出
process.on('SIGINT', () => {
    console.log(`${CONFIG.LOG_PREFIX} Stopping...`);
    process.exit(0);
});
