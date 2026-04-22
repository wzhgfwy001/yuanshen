/**
 * sync-single-file.js
 * 快速同步单个文件到向量数据库
 * 用法: node sync-single-file.js <文件路径> [集合名]
 */

const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const filePath = args[0];
const collection = args[1] || 'yangshen_brain';

if (!filePath) {
    console.log('用法: node sync-single-file.js <文件路径> [集合名]');
    process.exit(1);
}

try {
    const result = execSync(
        `python "D:/vector_db/vectorize_file.py" "${filePath}" "${collection}" "{}"`,
        { encoding: 'utf-8' }
    );
    console.log(result);
} catch (e) {
    console.error('同步失败:', e.message);
    process.exit(1);
}
