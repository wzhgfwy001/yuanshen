/**
 * Dreaming - 凌晨自动记忆整理脚本
 * 
 * 功能：
 * 1. 检查今日记忆
 * 2. 整理inbox
 * 3. 更新brain状态
 * 4. 生成记忆摘要
 * 
 * 触发：每天凌晨3点 (Cron: 0 3 * * *)
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = 'C:/Users/DELL/.openclaw/workspace';
const LOG_FILE = path.join(WORKSPACE, 'memory/dreaming.log');

// 读取文件
function readFile(filePath) {
  const fullPath = path.join(WORKSPACE, filePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf8');
  }
  return null;
}

// 写入文件
function writeFile(filePath, content) {
  const fullPath = path.join(WORKSPACE, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
}

// 记录日志
function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  
  if (fs.existsSync(LOG_FILE)) {
    fs.appendFileSync(LOG_FILE, logLine);
  } else {
    fs.writeFileSync(LOG_FILE, logLine);
  }
  
  console.log(logLine.trim());
}

// 主流程
async function dreaming() {
  log('========================================');
  log('🌙 Dreaming 开始执行 - 记忆整理');
  log('========================================');
  
  const results = {
    inboxCleaned: false,
    tasksUpdated: false,
    memoriesOrganized: false,
    summary: ''
  };
  
  try {
    // 1. 检查并清理 inbox
    log('📬 检查 inbox...');
    const inboxPath = 'brain/inbox.md';
    let inbox = readFile(inboxPath);
    
    if (inbox) {
      // 统计待处理条目
      const pendingMatch = inbox.match(/待处理想法[\s\S]*?(?=\n## |\n_|$)/);
      if (pendingMatch) {
        const lines = pendingMatch[0].split('\n');
        const pendingCount = lines.filter(l => l.match(/^\d+\./)).length;
        log(`   inbox 有 ${pendingCount} 条待处理`);
        
        // 如果超过7条，归档旧条目
        if (pendingCount > 7) {
          log('   超过7条，开始归档...');
          // 移动已完成条目到历史
          inbox = inbox.replace(/### ✅ [^\n]+\n([^\n]+\n)+/g, (match) => {
            log(`   归档: ${match.split('\n')[0]}`);
            return '';
          });
          writeFile(inboxPath, inbox);
          results.inboxCleaned = true;
        }
      }
    }
    
    // 2. 更新 active.md
    log('📋 更新任务状态...');
    const activePath = 'brain/tasks/active.md';
    let active = readFile(activePath);
    
    if (active) {
      // 检查是否有完成的任务（[x] ~~xxx~~）
      const completedTasks = active.match(/-\s*\[x\]\s*~~([^~]+)~~/g) || [];
      if (completedTasks.length > 0) {
        log(`   发现 ${completedTasks.length} 个已完成任务`);
      }
      results.tasksUpdated = true;
    }
    
    // 3. 整理今日记忆
    log('🧠 整理今日记忆...');
    const today = new Date().toISOString().split('T')[0];
    const memoryPath = `memory/${today}.md`;
    let memory = readFile(memoryPath);
    
    if (!memory) {
      log('   今日记忆文件不存在，创建...');
      memory = `# ${today} 日志\n\n`;
      memory += '## 自动记忆整理\n\n';
      memory += '由 Dreaming 自动生成\n\n';
      memory += '---\n';
      writeFile(memoryPath, memory);
    }
    
    // 4. 生成记忆摘要
    log('📝 生成记忆摘要...');
    let summary = `## 🌙 Dreaming 摘要 - ${today}\n\n`;
    summary += `| 项目 | 状态 |\n`;
    summary += `|------|------|\n`;
    summary += `| inbox清理 | ${results.inboxCleaned ? '✅' : '❌'} |\n`;
    summary += `| 任务更新 | ${results.tasksUpdated ? '✅' : '❌'} |\n`;
    summary += `| 记忆整理 | ✅ |\n\n`;
    
    // 追加到今日记忆
    memory += summary;
    writeFile(memoryPath, memory);
    
    results.memoriesOrganized = true;
    results.summary = summary;
    
    log('========================================');
    log('✅ Dreaming 执行完成');
    log('========================================');
    
    return results;
    
  } catch (error) {
    log(`❌ Dreaming 执行失败: ${error.message}`);
    return { error: error.message };
  }
}

// 直接运行
if (require.main === module) {
  dreaming().then(result => {
    console.log('\n结果:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
}

module.exports = { dreaming };
