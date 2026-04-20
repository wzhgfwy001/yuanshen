/**
 * auto-task-hook.js
 * 【自动触发器】任务后置钩子 - 任务完成时自动同步向量
 * 
 * 功能：
 * - 任务完成时自动将输出文件同步到向量数据库
 * - 支持文件创建、更新、删除的实时同步
 */

const path = require('path');
const fs = require('fs');

// 向量触发器模块
let trigger = null;
try {
    trigger = require('./auto-trigger-sync.js');
} catch(e) {
    console.log('[auto-task-hook] Warning: auto-trigger-sync not available:', e.message);
}

/**
 * 任务完成钩子 - 自动同步文件到向量数据库
 * @param {Object} taskResult - 任务结果对象
 * @param {string} taskResult.outputFile - 输出文件路径（如果有）
 * @param {string} taskResult.files - 数组，所有相关文件路径
 * @param {string} taskResult.action - 'created' | 'updated' | 'deleted'
 */
function onTaskComplete(taskResult) {
    if (!taskResult || !taskResult.files) {
        return { synced: false, reason: 'no files to sync' };
    }
    
    const results = {
        synced: [],
        failed: []
    };
    
    for (const filePath of taskResult.files) {
        try {
            // 检查文件是否存在
            const exists = fs.existsSync(filePath);
            
            if (exists) {
                // 文件存在 - 同步向量化
                if (trigger) {
                    const pid = trigger.vectorizeFileAsync(filePath, 'yangshen_brain');
                    results.synced.push({ file: filePath, pid });
                    console.log(`[auto-task-hook] ✓ 已同步: ${path.basename(filePath)}`);
                }
            } else {
                // 文件不存在 - 从向量数据库移除
                if (trigger) {
                    trigger.removeFromVectorAsync(filePath, 'yangshen_brain');
                    results.synced.push({ file: filePath, action: 'removed' });
                    console.log(`[auto-task-hook] ✓ 已移除: ${path.basename(filePath)}`);
                }
            }
        } catch (e) {
            results.failed.push({ file: filePath, error: e.message });
            console.error(`[auto-task-hook] ✗ 失败: ${filePath} - ${e.message}`);
        }
    }
    
    return results;
}

/**
 * 快速同步单个文件
 * @param {string} filePath - 文件路径
 * @param {string} collection - 集合名
 */
function syncFile(filePath, collection = 'yangshen_brain') {
    if (!filePath) {
        return { success: false, reason: 'no file path' };
    }
    
    try {
        const exists = fs.existsSync(filePath);
        
        if (exists) {
            if (trigger) {
                const pid = trigger.vectorizeFileAsync(filePath, collection);
                return { success: true, action: 'vectorized', pid };
            }
            return { success: false, reason: 'trigger not available' };
        } else {
            if (trigger) {
                trigger.removeFromVectorAsync(filePath, collection);
                return { success: true, action: 'removed' };
            }
            return { success: false, reason: 'trigger not available' };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    onTaskComplete,
    syncFile
};
