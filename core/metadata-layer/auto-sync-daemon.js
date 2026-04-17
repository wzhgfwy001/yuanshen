/**
 * Auto Sync Daemon - 后台自动同步守护进程
 * 
 * 定时检查 SKILL.md 更新，执行增量同步
 * 具备错误恢复机制
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AutoSyncDaemon {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 30000; // 默认 30 秒
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 5000;
    this.enabled = false;
    this.timer = null;
    this.lastSyncResults = null;
    this.syncHistory = [];
    this.errorCount = 0;
    
    // 增量同步用的文件哈希记录
    this.fileHashes = new Map();
    this.stateFile = options.stateFile || path.join(__dirname, '.auto-sync-state.json');
    
    // 回调
    this.onSync = options.onSync || null;
    this.onError = options.onError || null;
    
    // 加载之前的状态
    this._loadState();
  }

  /**
   * 启动守护进程
   */
  start() {
    if (this.enabled) {
      console.log('[auto-sync-daemon] 已启动');
      return;
    }

    console.log(`[auto-sync-daemon] 启动，定时间隔: ${this.intervalMs}ms`);
    this.enabled = true;
    
    // 立即执行一次同步
    this._doSync();
    
    // 设置定时器
    this.timer = setInterval(() => {
      this._doSync();
    }, this.intervalMs);
  }

  /**
   * 停止守护进程
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.enabled = false;
    this._saveState();
    console.log('[auto-sync-daemon] 已停止');
  }

  /**
   * 执行同步
   */
  async _doSync() {
    const startTime = Date.now();
    
    try {
      // 获取需要同步的文件列表
      const filesToSync = this._getChangedFiles();
      
      if (filesToSync.length === 0) {
        this.lastSyncResults = { 
          changed: 0, 
          duration: Date.now() - startTime,
          message: '无变化'
        };
        return;
      }

      console.log(`[auto-sync-daemon] 检测到 ${filesToSync.length} 个文件变化`);

      const results = {
        synced: [],
        failed: [],
        skipped: 0
      };

      for (const file of filesToSync) {
        try {
          const result = await this._syncFile(file);
          if (result.success) {
            results.synced.push(result);
          } else {
            results.failed.push(result);
          }
        } catch (e) {
          results.failed.push({
            file,
            error: e.message
          });
        }
      }

      // 更新哈希
      for (const file of filesToSync) {
        if (results.synced.some(r => r.file === file)) {
          this.fileHashes.set(file, this._hashFile(file));
        }
      }

      this.lastSyncResults = {
        changed: filesToSync.length,
        synced: results.synced.length,
        failed: results.failed.length,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // 记录历史
      this.syncHistory.push(this.lastSyncResults);
      if (this.syncHistory.length > 100) {
        this.syncHistory.shift();
      }

      // 重置错误计数
      this.errorCount = 0;

      // 触发回调
      if (this.onSync) {
        this.onSync(this.lastSyncResults);
      }

      // 保存状态
      this._saveState();

    } catch (e) {
      this.errorCount++;
      console.error('[auto-sync-daemon] 同步失败:', e);

      if (this.onError) {
        this.onError(e, this.errorCount);
      }

      // 错误恢复：增加间隔
      if (this.errorCount >= this.maxRetries) {
        const newInterval = Math.min(this.intervalMs * 2, 300000);
        console.log(`[auto-sync-daemon] 错误过多，间隔调整为 ${newInterval}ms`);
        this._adjustInterval(newInterval);
        this.errorCount = 0;
      }
    }
  }

  /**
   * 获取变化的文件列表（增量）
   */
  _getChangedFiles() {
    const skillsDir = path.join(__dirname, '../../skills');
    const changed = [];

    if (!fs.existsSync(skillsDir)) {
      return changed;
    }

    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'SKILL.md') {
          const fullPath = path.join(dir, entry.name);
          const hash = this._hashFile(fullPath);
          
          // 检查是否变化
          if (!this.fileHashes.has(fullPath) || this.fileHashes.get(fullPath) !== hash) {
            changed.push(fullPath);
          }
        } else if (entry.isDirectory()) {
          walkDir(path.join(dir, entry.name));
        }
      }
    };

    walkDir(skillsDir);
    return changed;
  }

  /**
   * 计算文件哈希
   */
  _hashFile(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * 同步单个文件
   */
  async _syncFile(filePath) {
    const skillName = path.basename(path.dirname(filePath));
    
    // 读取文件
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 解析 frontmatter（简化处理）
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      return { success: false, file: filePath, error: '无 frontmatter' };
    }

    return {
      success: true,
      file: filePath,
      skillName,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 调整同步间隔
   */
  _adjustInterval(newInterval) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        this._doSync();
      }, newInterval);
    }
  }

  /**
   * 手动触发立即同步
   */
  async syncNow() {
    console.log('[auto-sync-daemon] 手动触发同步');
    await this._doSync();
    return this.lastSyncResults;
  }

  /**
   * 获取同步历史
   */
  getHistory(count = 10) {
    return this.syncHistory.slice(-count);
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      intervalMs: this.intervalMs,
      errorCount: this.errorCount,
      lastResults: this.lastSyncResults,
      trackedFiles: this.fileHashes.size,
      historyCount: this.syncHistory.length
    };
  }

  /**
   * 加载保存的状态
   */
  _loadState() {
    if (fs.existsSync(this.stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
        this.fileHashes = new Map(Object.entries(state.fileHashes || {}));
        this.syncHistory = state.syncHistory || [];
      } catch (e) {
        console.warn('[auto-sync-daemon] 状态加载失败:', e.message);
      }
    }
  }

  /**
   * 保存状态
   */
  _saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify({
        fileHashes: Object.fromEntries(this.fileHashes),
        syncHistory: this.syncHistory.slice(-50)
      }, null, 2));
    } catch (e) {
      console.warn('[auto-sync-daemon] 状态保存失败:', e.message);
    }
  }

  /**
   * 重置状态
   */
  reset() {
    this.fileHashes.clear();
    this.syncHistory = [];
    this.errorCount = 0;
    if (fs.existsSync(this.stateFile)) {
      fs.unlinkSync(this.stateFile);
    }
    console.log('[auto-sync-daemon] 状态已重置');
  }
}

module.exports = AutoSyncDaemon;