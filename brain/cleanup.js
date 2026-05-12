/**
 * Cleanup Policy - 自动清理策略
 * 定期清理过期文件，归档旧记录
 * 维护 brain/ 目录健康
 */

const fs = require('fs');
const path = require('path');

const BRAIN_DIR = path.join(__dirname);
const ARCHIVE_DIR = path.join(BRAIN_DIR, 'archive');
const MEMORY_DIR = path.join(BRAIN_DIR, 'memory');

/**
 * 清理规则配置
 */
const CLEANUP_RULES = {
  // 每周清理
  weekly: {
    patterns: [
      { path: 'memory/*.md', maxAge: 30 },      // 保留30天
      { path: 'brain/tasks/*.md', maxAge: 7 },   // 保留7天
      { path: 'brain/*.log', maxAge: 7 }          // 保留7天
    ]
  },
  
  // 每月清理
  monthly: {
    patterns: [
      { path: 'heartbeat-log.md', maxAge: 90 }    // 保留90天
    ]
  },
  
  // 每季度清理
  quarterly: {
    patterns: [
      { path: 'brain/plan.md', archive: true },  // 版本化存档
      { path: 'brain/inbox-archive-*.md', archive: true }
    ]
  },
  
  // 永不删除
  protected: [
    'credentials.md',
    'MEMORY.md',
    'IDENTITY.md',
    'SOUL.md',
    'USER.md',
    'AGENTS.md',
    'DREAMS.md',
    'HEARTBEAT.md',
    'inbox.md',
    'learned.md'
  ]
};

/**
 * 文件年龄计算
 */
function getFileAge(filePath) {
  const stats = fs.statSync(filePath);
  const now = Date.now();
  return (now - stats.mtimeMs) / (1000 * 60 * 60 * 24); // 天数
}

/**
 * 清理结果
 */
class CleanupResult {
  constructor() {
    this.deleted = [];
    this.archived = [];
    this.errors = [];
    this.spaceSaved = 0;
  }

  addDeleted(file) {
    const size = fs.statSync(file).size;
    this.deleted.push(file);
    this.spaceSaved += size;
  }

  addArchived(from, to) {
    this.archived.push({ from, to });
  }

  addError(file, error) {
    this.errors.push({ file, error: error.message });
  }

  summary() {
    return {
      deleted: this.deleted.length,
      archived: this.archived.length,
      errors: this.errors.length,
      spaceSaved: `${(this.spaceSaved / 1024 / 1024).toFixed(2)} MB`
    };
  }
}

/**
 * Cleanup Policy 主类
 */
class CleanupPolicy {
  constructor() {
    this.ensureDirectories();
    this.results = [];
  }

  ensureDirectories() {
    const dirs = [
      ARCHIVE_DIR,
      path.join(ARCHIVE_DIR, 'memory'),
      path.join(ARCHIVE_DIR, 'plan'),
      path.join(ARCHIVE_DIR, 'reasoning')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 检查文件是否受保护
   */
  isProtected(filename) {
    return CLEANUP_RULES.protected.includes(filename);
  }

  /**
   * 执行每周清理
   */
  cleanupWeekly() {
    const result = new CleanupResult();
    const rules = CLEANUP_RULES.weekly.patterns;

    for (const rule of rules) {
      const fullPath = path.join(BRAIN_DIR, rule.path);
      const basePath = path.dirname(fullPath);
      const pattern = path.basename(fullPath).replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      
      try {
        if (fs.existsSync(basePath)) {
          const files = fs.readdirSync(basePath);
          
          for (const file of files) {
            if (regex.test(file) && !this.isProtected(file)) {
              const filePath = path.join(basePath, file);
              
              if (getFileAge(filePath) > rule.maxAge) {
                try {
                  fs.unlinkSync(filePath);
                  result.addDeleted(filePath);
                } catch (e) {
                  result.addError(filePath, e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('[Cleanup] Weekly rule error:', e.message);
      }
    }

    this.results.push(result);
    return result;
  }

  /**
   * 执行每月清理
   */
  cleanupMonthly() {
    const result = new CleanupResult();
    const rules = CLEANUP_RULES.monthly.patterns;

    for (const rule of rules) {
      const filePath = path.join(BRAIN_DIR, rule.path);
      
      if (fs.existsSync(filePath) && !this.isProtected(path.basename(filePath))) {
        if (getFileAge(filePath) > rule.maxAge) {
          try {
            fs.unlinkSync(filePath);
            result.addDeleted(filePath);
          } catch (e) {
            result.addError(filePath, e);
          }
        }
      }
    }

    this.results.push(result);
    return result;
  }

  /**
   * 执行季度归档
   */
  archiveQuarterly() {
    const result = new CleanupResult();
    const quarter = this.getQuarter();
    const rules = CLEANUP_RULES.quarterly.patterns;

    for (const rule of rules) {
      const filePath = path.join(BRAIN_DIR, rule.path);
      const filename = path.basename(filePath);
      
      if (fs.existsSync(filePath)) {
        const archivePath = path.join(ARCHIVE_DIR, 'plan', `${filename}-${quarter}.md`);
        
        try {
          fs.copyFileSync(filePath, archivePath);
          result.addArchived(filePath, archivePath);
        } catch (e) {
          result.addError(filePath, e);
        }
      }
    }

    this.results.push(result);
    return result;
  }

  /**
   * 获取当前季度
   */
  getQuarter() {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const q = Math.floor(month / 3) + 1;
    return `${year}-Q${q}`;
  }

  /**
   * 合并 memory 目录到月度归档
   */
  archiveMemory() {
    const result = new CleanupResult();
    const quarter = this.getQuarter();
    const archivePath = path.join(ARCHIVE_DIR, 'memory', `memory-${quarter}.md`);
    
    if (!fs.existsSync(MEMORY_DIR)) {
      return result;
    }

    const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md'));
    
    if (files.length === 0) {
      return result;
    }

    // 合并所有文件
    let combined = `# Memory Archive ${quarter}\n\n`;
    
    for (const file of files) {
      const filePath = path.join(MEMORY_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      combined += `\n---\n${file}\n---\n${content}\n`;
      
      try {
        fs.unlinkSync(filePath);
        result.addDeleted(filePath);
      } catch (e) {
        result.addError(filePath, e);
      }
    }

    // 写入归档
    fs.writeFileSync(archivePath, combined);
    result.addArchived('memory/*.md', archivePath);

    this.results.push(result);
    return result;
  }

  /**
   * 完整清理执行
   */
  fullCleanup() {
    console.log('[Cleanup] Starting full cleanup...');
    
    const weekly = this.cleanupWeekly();
    const monthly = this.cleanupMonthly();
    const quarterly = this.archiveQuarterly();
    const memory = this.archiveMemory();
    
    const summary = {
      weekly: weekly.summary(),
      monthly: monthly.summary(),
      quarterly: quarterly.summary(),
      memory: memory.summary()
    };
    
    console.log('[Cleanup] Complete:', JSON.stringify(summary, null, 2));
    
    // 写入清理报告
    this.writeReport(summary);
    
    return summary;
  }

  /**
   * 写入清理报告
   */
  writeReport(summary) {
    const reportPath = path.join(BRAIN_DIR, 'cleanup-report.md');
    const date = new Date().toISOString().slice(0, 10);
    
    let report = `# Cleanup Report - ${date}\n\n`;
    report += '## Summary\n\n';
    report += `| Type | Deleted | Archived | Errors | Space Saved |\n`;
    report += `|------|---------|---------|--------|-------------|\n`;
    
    for (const [type, data] of Object.entries(summary)) {
      report += `| ${type} | ${data.deleted} | ${data.archived} | ${data.errors} | ${data.spaceSaved} |\n`;
    }
    
    fs.writeFileSync(reportPath, report);
  }

  /**
   * 获取清理状态
   */
  getStatus() {
    return {
      lastCleanup: this.results.length > 0 ? new Date().toISOString() : null,
      totalCleanups: this.results.length,
      archiveDir: ARCHIVE_DIR,
      protectedFiles: CLEANUP_RULES.protected.length
    };
  }

  /**
   * 列出可清理的文件（不实际清理）
   */
  listCleanupTargets() {
    const targets = [];
    const rules = [...CLEANUP_RULES.weekly.patterns, ...CLEANUP_RULES.monthly.patterns];

    for (const rule of rules) {
      const fullPath = path.join(BRAIN_DIR, rule.path);
      const basePath = path.dirname(fullPath);
      const pattern = path.basename(fullPath).replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      
      if (fs.existsSync(basePath)) {
        const files = fs.readdirSync(basePath);
        
        for (const file of files) {
          if (regex.test(file) && !this.isProtected(file)) {
            const filePath = path.join(basePath, file);
            targets.push({
              path: filePath,
              age: getFileAge(filePath),
              maxAge: rule.maxAge,
              overdue: getFileAge(filePath) > rule.maxAge
            });
          }
        }
      }
    }
    
    return targets;
  }
}

const cleanupPolicy = new CleanupPolicy();

module.exports = { cleanupPolicy, CleanupPolicy, CLEANUP_RULES };

// 使用示例
if (require.main === module) {
  console.log('[Cleanup] Status:', cleanupPolicy.getStatus());
  
  // 列出可清理目标
  console.log('Targets:', cleanupPolicy.listCleanupTargets());
  
  // 执行完整清理
  // cleanupPolicy.fullCleanup();
}
