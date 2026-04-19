#!/usr/bin/env node
/**
 * task-complete-hook.js - 任务完成钩子
 * 
 * 使用Python版本的PersistentClient同步，确保与向量数据库兼容
 * 
 * 用法:
 *   node task-complete-hook.js <file1> [file2] [file3] ...
 *   node task-complete-hook.js --delete <file1> [file2] ...
 */

const { execSync } = require('child_process');
const path = require('path');

// 同步脚本路径
const SYNC_SCRIPT = 'C:/Users/DELL/.openclaw/workspace/scripts/sync_to_vector.py';

// 确定集合名称
function getCollection(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    
    if (normalized.includes('/brain/')) return 'brain';
    if (normalized.includes('/memory/')) return 'memory';
    if (normalized.includes('/learnings/')) return 'learnings';
    if (normalized.includes('/skills/')) return 'skills';
    if (normalized.includes('/errors')) return 'errors';
    if (normalized.includes('/agents')) return 'agents';
    
    return 'workspace'; // 默认
}

// 同步单个文件
function syncFile(filePath, isDelete = false) {
    const collection = getCollection(filePath);
    const cmd = isDelete
        ? `python "${SYNC_SCRIPT}" delete "${filePath}" ${collection}`
        : `python "${SYNC_SCRIPT}" add "${filePath}" ${collection}`;
    
    try {
        const output = execSync(cmd, { 
            encoding: 'utf-8',
            timeout: 30000,
            shell: true
        });
        console.log(output.trim());
        return { success: true, output };
    } catch (error) {
        console.error(`[ERROR] ${filePath}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// 主函数
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('用法: node task-complete-hook.js <file1> [file2] ...');
        console.log('      node task-complete-hook.js --delete <file1> [file2] ...');
        process.exit(1);
    }
    
    let isDelete = false;
    let files = [];
    
    for (const arg of args) {
        if (arg === '--delete') {
            isDelete = true;
        } else {
            files.push(arg);
        }
    }
    
    console.log(`[task-complete-hook] 开始同步 ${files.length} 个文件...`);
    if (isDelete) console.log('[task-complete-hook] 模式: DELETE');
    else console.log('[task-complete-hook] 模式: ADD');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        const result = syncFile(file, isDelete);
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    console.log(`[task-complete-hook] 完成: ${successCount} 成功, ${failCount} 失败`);
    process.exit(failCount > 0 ? 1 : 0);
}

main();
