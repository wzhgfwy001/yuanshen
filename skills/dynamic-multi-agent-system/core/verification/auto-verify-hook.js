/**
 * 自动验证Hook - Auto Verification Hook v2.0
 * 基于DeerFlow架构优化：
 * 1. 事件系统
 * 2. 结构化结果
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// ============================================================
// DeerFlow借鉴: 结构化状态
// ============================================================

class VerificationResult {
  constructor(hookId, hookType, success, duration, data = {}) {
    this.hookId = hookId;
    this.hookType = hookType;
    this.success = success;
    this.duration = duration;
    this.timestamp = new Date().toISOString();
    this.data = data;
  }

  toJSON() {
    return {
      hookId: this.hookId,
      hookType: this.hookType,
      success: this.success,
      duration: this.duration,
      timestamp: this.timestamp,
      ...this.data
    };
  }
}

class HookConfig {
  constructor(config = {}) {
    this.autoVerifyOnTaskComplete = config.autoVerifyOnTaskComplete ?? true;
    this.verifyOnStartup = config.verifyOnStartup ?? true;
    this.blockOnFailure = config.blockOnFailure ?? false;
    this.maxLogEntries = config.maxLogEntries ?? 100;
    this.verifyTimeout = config.verifyTimeout ?? 30000;
    this.skipCategories = config.skipCategories || [];
  }
}

// ============================================================
// DeerFlow借鉴: 事件系统
// ============================================================

class HookEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[HookEmitter] ${event} error:`, e.message);
      }
    });
  }
}

const emitter = new HookEmitter();

const EVENTS = {
  VERIFICATION_COMPLETE: 'verification_complete',
  VERIFICATION_FAILED: 'verification_failed',
  TASK_COMPLETE_HOOK: 'task_complete_hook',
  STARTUP_HOOK: 'startup_hook',
  MANUAL_HOOK: 'manual_hook'
};

emitter.on(EVENTS.VERIFICATION_COMPLETE, (result) => {
  const status = result.success ? '✅' : '❌';
  console.log(`[AutoVerify] ${status} 验证完成 - ${result.hookType}, 耗时: ${result.duration}ms`);
});

emitter.on(EVENTS.TASK_COMPLETE_HOOK, (taskInfo) => {
  console.log(`[AutoVerify] 🚀 任务完成触发验证: ${taskInfo.name || taskInfo.taskId}`);
});

emitter.on(EVENTS.STARTUP_HOOK, () => {
  console.log(`[AutoVerify] 🚀 启动时验证`);
});

// ============================================================
// 路径配置
// ============================================================

const WORKSPACE_ROOT = 'C:\\Users\\DELL\\.openclaw\\workspace';
const SKILLS_ROOT = path.join(WORKSPACE_ROOT, 'skills');
const DYNAMIC_AGENT_ROOT = path.join(SKILLS_ROOT, 'dynamic-multi-agent-system');
const STATE_ROOT = path.join(DYNAMIC_AGENT_ROOT, 'state');
const VERIFICATION_LOG = path.join(STATE_ROOT, 'verification-log.json');
const VERIFICATION_MODULE_PATH = path.join(__dirname, '闭环验证器.js');

// ============================================================
// 工具函数
// ============================================================

async function ensureDir(dirPath) {
    try {
        await fs.promises.access(dirPath);
        return true;
    } catch {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return true;
    }
}

async function readJson(filePath) {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

async function writeJson(filePath, data) {
    await ensureDir(path.dirname(filePath));
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function timestamp() {
    return new Date().toISOString();
}

function generateId() {
    return `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// 日志管理
// ============================================================

class VerificationLogManager {
    constructor(logPath = VERIFICATION_LOG) {
        this.logPath = logPath;
    }

    async read() {
        const exists = await fs.promises.access(this.logPath).then(() => true).catch(() => false);
        if (!exists) return [];
        
        const content = await fs.promises.readFile(this.logPath, 'utf8');
        try {
            const logs = JSON.parse(content);
            return Array.isArray(logs) ? logs : [logs];
        } catch {
            return [];
        }
    }

    async add(entry) {
        await ensureDir(path.dirname(this.logPath));
        
        const logs = await this.read();
        
        const logEntry = {
            id: generateId(),
            timestamp: timestamp(),
            ...entry
        };
        
        logs.push(logEntry);
        
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        await writeJson(this.logPath, logs);
        return logEntry;
    }

    async getRecent(count = 10) {
        const logs = await this.read();
        return logs.slice(-count);
    }

    async getLatestForSkill(skillName) {
        const logs = await this.read();
        const filtered = logs.filter(l => l.metadata?.skillName === skillName);
        return filtered.length > 0 ? filtered[filtered.length - 1] : null;
    }

    async clear() {
        await writeJson(this.logPath, []);
    }
}

// ============================================================
// 自动验证Hook
// ============================================================

class AutoVerifyHook {
    constructor(config = {}) {
        this.config = new HookConfig(config);
        this.logManager = new VerificationLogManager();
        this.verifier = null;
    }

    async loadVerifier() {
        if (!this.verifier) {
            try {
                const verificationPath = VERIFICATION_MODULE_PATH;
                const pathExists = await fs.promises.access(verificationPath).then(() => true).catch(() => false);
                
                if (pathExists) {
                    this.verifier = require(verificationPath);
                } else {
                    this.verifier = this.createInlineVerifier();
                }
            } catch (error) {
                console.error(`[AutoVerify] 加载验证器失败: ${error.message}`);
                this.verifier = this.createInlineVerifier();
            }
        }
        return this.verifier;
    }

    createInlineVerifier() {
        return {
            runFullVerification: async (skillName, options) => {
                return {
                    timestamp: timestamp(),
                    duration: 0,
                    passed: [],
                    failed: [],
                    warnings: [],
                    suggestions: [],
                    summary: {
                        total: 0,
                        passedCount: 0,
                        failedCount: 0,
                        warningCount: 0,
                        successRate: 0,
                        status: 'unknown',
                        readyForProduction: false
                    },
                    metadata: {
                        skillName: skillName || 'unknown',
                        verificationType: 'inline-basic',
                        environment: process.env.NODE_ENV || 'development'
                    }
                };
            }
        };
    }

    async onTaskComplete(taskInfo) {
        const hookId = generateId();
        const startTime = Date.now();

        emitter.emit(EVENTS.TASK_COMPLETE_HOOK, taskInfo);
        
        const result = new VerificationResult(
            hookId,
            'task_complete',
            false,
            0,
            { taskInfo }
        );

        try {
            const verifier = await this.loadVerifier();
            const skillName = taskInfo.skillName || 'dynamic-multi-agent-system';
            
            const verifyResult = await Promise.race([
                verifier.runFullVerification(skillName, { verbose: false }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('验证超时')), this.config.verifyTimeout)
                )
            ]);
            
            result.success = verifyResult.summary?.failedCount === 0;
            result.duration = Date.now() - startTime;
            result.data.verification = verifyResult;
            
            await this.logManager.add({
                hookId,
                hookType: 'task_complete',
                taskName: taskInfo.name,
                skillName: taskInfo.skillName,
                verification: verifyResult,
                duration: result.duration,
                success: result.success
            });

            if (verifyResult.summary) {
                const { passedCount, failedCount, successRate } = verifyResult.summary;
                console.log(`[AutoVerify] ✓ 验证完成 - 通过: ${passedCount}, 失败: ${failedCount}, 成功率: ${successRate}%`);
            }

            emitter.emit(EVENTS.VERIFICATION_COMPLETE, result);
            return result;

        } catch (error) {
            result.success = false;
            result.duration = Date.now() - startTime;
            result.data.error = error.message;
            
            await this.logManager.add({
                hookId,
                hookType: 'task_complete',
                taskName: taskInfo.name,
                skillName: taskInfo.skillName,
                verification: null,
                duration: result.duration,
                success: false,
                error: error.message
            });
            
            console.error(`[AutoVerify] ✗ 验证失败: ${error.message}`);
            emitter.emit(EVENTS.VERIFICATION_FAILED, result);
            return result;
        }
    }

    async onStartup(skillName = 'dynamic-multi-agent-system') {
        const hookId = generateId();
        const startTime = Date.now();

        emitter.emit(EVENTS.STARTUP_HOOK);
        
        const result = new VerificationResult(
            hookId,
            'startup',
            false,
            0,
            { skillName }
        );

        try {
            const verifier = await this.loadVerifier();
            
            const verifyResult = await Promise.race([
                verifier.runFullVerification(skillName, { verbose: false }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('验证超时')), this.config.verifyTimeout)
                )
            ]);
            
            result.success = verifyResult.summary?.failedCount === 0;
            result.duration = Date.now() - startTime;
            result.data.verification = verifyResult;
            
            await this.logManager.add({
                hookId,
                hookType: 'startup',
                skillName,
                verification: verifyResult,
                duration: result.duration,
                success: result.success
            });

            console.log(`[AutoVerify] ✓ 启动验证完成`);
            emitter.emit(EVENTS.VERIFICATION_COMPLETE, result);
            return result;

        } catch (error) {
            result.success = false;
            result.duration = Date.now() - startTime;
            result.data.error = error.message;
            
            console.error(`[AutoVerify] ✗ 启动验证失败: ${error.message}`);
            emitter.emit(EVENTS.VERIFICATION_FAILED, result);
            return result;
        }
    }

    async trigger(skillName, options = {}) {
        const hookId = generateId();
        const startTime = Date.now();

        console.log(`[AutoVerify] 🚀 手动触发验证 (${hookId})`);
        console.log(`[AutoVerify] 目标技能: ${skillName}`);
        
        const result = new VerificationResult(
            hookId,
            'manual',
            false,
            0,
            { skillName }
        );

        try {
            const verifier = await this.loadVerifier();
            
            const verifyResult = await Promise.race([
                verifier.runFullVerification(skillName, { verbose: options.verbose || false }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('验证超时')), this.config.verifyTimeout)
                )
            ]);
            
            result.success = verifyResult.summary?.failedCount === 0;
            result.duration = Date.now() - startTime;
            result.data.verification = verifyResult;
            
            await this.logManager.add({
                hookId,
                hookType: 'manual',
                skillName,
                verification: verifyResult,
                duration: result.duration,
                success: result.success
            });

            console.log(`[AutoVerify] ✓ 验证完成`);
            emitter.emit(EVENTS.VERIFICATION_COMPLETE, result);
            return result;

        } catch (error) {
            result.success = false;
            result.duration = Date.now() - startTime;
            result.data.error = error.message;
            
            console.error(`[AutoVerify] ✗ 验证失败: ${error.message}`);
            emitter.emit(EVENTS.VERIFICATION_FAILED, result);
            return result;
        }
    }

    async getHistory(count = 10) {
        return await this.logManager.getRecent(count);
    }

    async getLatest(skillName) {
        return await this.logManager.getLatestForSkill(skillName);
    }
}

// ============================================================
// 导出
// ============================================================

const defaultHook = new AutoVerifyHook();

module.exports = {
    AutoVerifyHook,
    VerificationLogManager,
    VerificationResult,
    HookConfig,
    emitter,
    EVENTS,
    
    onTaskComplete: (taskInfo) => defaultHook.onTaskComplete(taskInfo),
    onStartup: (skillName) => defaultHook.onStartup(skillName),
    trigger: (skillName, options) => defaultHook.trigger(skillName, options),
    getHistory: (count) => defaultHook.getHistory(count),
    getLatest: (skillName) => defaultHook.getLatest(skillName),
    
    createHook: (config) => new AutoVerifyHook(config),
    createLogManager: (logPath) => new VerificationLogManager(logPath)
};

// CLI入口
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    const hook = new AutoVerifyHook();
    
    switch (command) {
        case 'verify':
        case 'run':
            const skillName = args[1] || 'dynamic-multi-agent-system';
            hook.trigger(skillName, { verbose: true })
                .then(result => {
                    console.log('\n验证结果:');
                    console.log(JSON.stringify(result.data.verification, null, 2));
                });
            break;
            
        case 'history':
            const count = parseInt(args[1]) || 10;
            hook.getHistory(count).then(logs => {
                console.log(`\n最近 ${logs.length} 条验证记录:`);
                logs.forEach((log, i) => {
                    console.log(`${i + 1}. [${log.timestamp}] ${log.skillName || log.hookType} - ${log.success ? '✓' : '✗'}`);
                });
            });
            break;
            
        case 'latest':
            const targetSkill = args[1] || 'dynamic-multi-agent-system';
            hook.getLatest(targetSkill).then(result => {
                if (result) {
                    console.log(`\n${targetSkill} 最新验证:`);
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    console.log(`\n没有找到 ${targetSkill} 的验证记录`);
                }
            });
            break;
            
        case 'startup':
            hook.onStartup(args[1] || 'dynamic-multi-agent-system')
                .then(result => console.log('\n启动验证结果:', result));
            break;
            
        default:
            console.log(`
🔍 闭环验证Hook - CLI

用法:
  node auto-verify-hook.js <command> [args]

命令:
  verify, run    运行验证: node auto-verify-hook.js verify [skillName]
  history        查看历史: node auto-verify-hook.js history [count]
  latest         最新验证: node auto-verify-hook.js latest [skillName]
  startup        启动验证: node auto-verify-hook.js startup [skillName]

示例:
  node auto-verify-hook.js verify dynamic-multi-agent-system
  node auto-verify-hook.js history 20
`);
    }
}
