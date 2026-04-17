/**
 * Sync Watcher - 文件变化监听器
 * 
 * 监听 SKILL.md 文件变化，自动触发同步机制
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class SyncWatcher {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(__dirname, '../../skills');
    this.watchPatterns = options.watchPatterns || ['**/SKILL.md'];
    this.debounceMs = options.debounceMs || 500;
    this.enabled = false;
    this.watcher = null;
    this.callbacks = new Set();
    this.pendingFiles = new Map();
  }

  /**
   * 启动监听
   */
  start() {
    if (this.enabled) {
      console.log('[sync-watcher] 已启动');
      return;
    }

    console.log(`[sync-watcher] 启动监听: ${this.baseDir}`);
    
    this.watcher = chokidar.watch(this.watchPatterns, {
      cwd: this.baseDir,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.watcher.on('change', (filePath) => this._handleChange(filePath, 'change'));
    this.watcher.on('add', (filePath) => this._handleChange(filePath, 'add'));
    this.watcher.on('unlink', (filePath) => this._handleChange(filePath, 'unlink'));

    this.enabled = true;
    console.log('[sync-watcher] 监听已启动');
  }

  /**
   * 停止监听
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.enabled = false;
    this.pendingFiles.clear();
    console.log('[sync-watcher] 监听已停止');
  }

  /**
   * 处理文件变化
   */
  _handleChange(filePath, eventType) {
    const fullPath = path.join(this.baseDir, filePath);
    const now = Date.now();

    // 防抖处理
    if (this.pendingFiles.has(filePath)) {
      clearTimeout(this.pendingFiles.get(filePath).timer);
    }

    const timer = setTimeout(() => {
      this.pendingFiles.delete(filePath);
      this._emitChange(filePath, eventType);
    }, this.debounceMs);

    this.pendingFiles.set(filePath, { timer, fullPath });
  }

  /**
   * 触发变化事件
   */
  _emitChange(filePath, eventType) {
    const skillName = this._extractSkillName(filePath);
    
    const event = {
      type: eventType,
      filePath,
      skillName,
      fullPath: path.join(this.baseDir, filePath),
      timestamp: new Date().toISOString()
    };

    console.log(`[sync-watcher] ${eventType}: ${filePath} (skill: ${skillName})`);

    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (e) {
        console.error('[sync-watcher] 回调执行失败:', e);
      }
    }
  }

  /**
   * 从文件路径提取 skill 名称
   */
  _extractSkillName(filePath) {
    const parts = filePath.split(path.sep);
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return path.basename(path.dirname(filePath));
  }

  /**
   * 注册变化回调
   */
  onChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 手动触发同步所有
   */
  async syncAll() {
    console.log('[sync-watcher] 手动触发全量同步...');
    
    // 获取所有 SKILL.md 文件
    const allFiles = [];
    
    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name === 'SKILL.md') {
          const filePath = path.relative(this.baseDir, fullPath);
          allFiles.push({ filePath, fullPath, eventType: 'manual' });
        }
      }
    };

    try {
      walkDir(this.baseDir);
      
      for (const file of allFiles) {
        this._emitChange(file.filePath, 'manual');
      }
      
      return { synced: allFiles.length, timestamp: new Date().toISOString() };
    } catch (e) {
      console.error('[sync-watcher] syncAll 失败:', e);
      return { synced: 0, error: e.message };
    }
  }

  /**
   * 获取监听状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      baseDir: this.baseDir,
      watchPatterns: this.watchPatterns,
      pendingFiles: Array.from(this.pendingFiles.keys()),
      callbacksCount: this.callbacks.size
    };
  }
}

module.exports = SyncWatcher;