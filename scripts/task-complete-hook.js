/**
 * 任务完成钩子 - 自动同步文件到向量数据库
 * 
 * 使用方式：
 * node task-complete-hook.js <filePath1> [filePath2] [filePath3] ...
 * 
 * 示例：
 * node task-complete-hook.js "C:/path/to/file1.md" "C:/path/to/file2.md"
 */

const { writeAndVectorize, deleteAndRemoveVector } = require('../skills/auto-router/auto-router-enhanced.js');
const fs = require('fs');
const path = require('path');

// 获取命令行参数中的文件列表
const fileArgs = process.argv.slice(2);

if (fileArgs.length === 0) {
    console.log('用法: node task-complete-hook.js <filePath1> [filePath2] ...');
    console.log('示例: node task-complete-hook.js "brain/test.md" "memory/2026-04-19.md"');
    process.exit(0);
}

console.log(`[task-complete-hook] 开始同步 ${fileArgs.length} 个文件...`);

let success = 0;
let failed = 0;

for (const filePath of fileArgs) {
    const fullPath = path.resolve(filePath);
    
    try {
        if (fs.existsSync(fullPath)) {
            // 文件存在，执行写时同步
            const content = fs.readFileSync(fullPath, 'utf-8');
            const result = writeAndVectorize(fullPath, content, 'yangshen_brain');
            
            if (result.vectorized) {
                console.log(`[task-complete-hook] ✅ 已同步: ${path.basename(fullPath)}`);
                success++;
            } else {
                console.log(`[task-complete-hook] ⚠️ 写入但未向量化: ${path.basename(fullPath)}`);
                success++; // 写入成功就算成功
            }
        } else {
            // 文件不存在，执行删除同步
            const result = deleteAndRemoveVector(fullPath, 'yangshen_brain');
            if (result.removed) {
                console.log(`[task-complete-hook] ✅ 已删除向量: ${path.basename(fullPath)}`);
                success++;
            } else {
                console.log(`[task-complete-hook] ⚠️ 删除但未移除向量: ${path.basename(fullPath)}`);
                success++;
            }
        }
    } catch (e) {
        console.error(`[task-complete-hook] ❌ 错误: ${path.basename(fullPath)} - ${e.message}`);
        failed++;
    }
}

console.log(`[task-complete-hook] 完成: ${success} 成功, ${failed} 失败`);
