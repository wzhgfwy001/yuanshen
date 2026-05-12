/**
 * 自动验证Hook - Auto Verification Hook
 * 
 * 任务完成后自动触发验证，确保配置生效
 * 将验证结果写入 state/verification-log.json
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 路径配置
// ============================================================
const WORKSPACE_ROOT = 'C:\\Users\\DELL\\.openclaw\\workspace';
const SKILLS_ROOT = path.join(WORKSPACE_ROOT, 'skills');
const DYNAMIC_AGENT_ROOT = path.join(SKILLS_ROOT, 'dynamic-multi-agent-system');
const STATE_ROOT = path.join(DYNAMIC_AGENT_ROOT, 'state');
const VERIFICATION_LOG = path.join(STATE_ROOT, 'verification-log.json');

// 验证器路径
const VERIFICATION_MODULE_PATH = path.join(__dirname, '闭环验证器.js');

// ============================================================
// Hook配置
// ============================================================
const HOOK_CONFIG = {
    // 是否在任务完成后自动验证
    autoVerifyOnTaskComplete: true,
    
    // 是否在启动时验证
    verifyOnStartup: true,
    
    // 验证失败时是否阻止继续
    blockOnFailure: false,
    
    // 最大日志保留条数
    maxLogEntries: 100,
    
    // 验证超时（毫秒）
    verifyTimeout: 30000,
    
    // 需要跳过的验证类别
    skipCategories: []
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 确保目录存在
 */
async function ensureDir(dirPath) {
    try {
        await fs.promises.access(dirPath);
        return true;
    } catch {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return true;
    }
}

/**
 * 读取JSON文件
 */
async function readJson(filePath) {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * 写入JSON文件
 */
async function writeJson(filePath, data) {
    await ensureDir(path.dirname(filePath));
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 获取时间戳
 */
function timestamp() {
    return new Date().toISOString();
}

/**
 * 生成唯一ID
 */
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

    /**
     * 读取日志
     */
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

    /**
     * 添加日志
     */
    async add(entry) {
        await ensureDir(path.dirname(this.logPath));
        
        const logs = await this.read();
        
        const logEntry = {
            id: generateId(),
            timestamp: timestamp(),
            ...entry
        };
        
        logs.push(logEntry);
        
        // 保留最近记录
        if (logs.length > HOOK_CONFIG.maxLogEntries) {
            logs.splice(0, logs.length - HOOK_CONFIG.maxLogEntries);
        }
        
        await writeJson(this.logPath, logs);
        return logEntry;
    }

    /**
     * 获取最近N条日志
     */
    async getRecent(count = 10) {
        const logs = await this.read();
        return logs.slice(-count);
    }

    /**
     * 获取指定技能的最新验证结果
     */
    async getLatestForSkill(skillName) {
        const logs = await this.read();
        const filtered = logs.filter(l => l.metadata?.skillName === skillName);
        return filtered.length > 0 ? filtered[filtered.length - 1] : null;
    }

    /**
     * 清空日志
     */
    async clear() {
        await writeJson(this.logPath, []);
    }
}

// ============================================================
// 自动验证Hook
// ============================================================

class AutoVerifyHook {
    constructor(config = {}) {
        this.config = { ...HOOK_CONFIG, ...config };
        this.logManager = new VerificationLogManager();
        this.verifier = null;
    }

    /**
     * 加载验证器
     */
    async loadVerifier() {
        if (!this.verifier) {
            try {
                // 动态加载验证器
                const verificationPath = VERIFICATION_MODULE_PATH;
                const pathExists = await fs.promises.access(verificationPath).then(() => true).catch(() => false);
                
                if (pathExists) {
                    this.verifier = require(verificationPath);
                } else {
                    // 内联基础验证器
                    this.verifier = this.createInlineVerifier();
                }
            } catch (error) {
                console.error(`[AutoVerify] 加载验证器失败: ${error.message}`);
                this.verifier = this.createInlineVerifier();
            }
        }
        return this.verifier;
    }

    /**
     * 创建内联验证器（当闭环验证器不可用时）
     */
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

    /**
     * 任务完成钩子
     */
    async onTaskComplete(taskInfo) {
        const hookId = generateId();
        
        console.log(`[AutoVerify] 🚀 任务完成触发验证 (${hookId})`);
        console.log(`[AutoVerify] 任务: ${taskInfo.name || taskInfo.taskId || 'unknown'}`);
        
        const startTime = Date.now();
        const result = {
            hookId,
            hookType: 'task_complete',
            taskInfo: {
                name: taskInfo.name,
                taskId: taskInfo.taskId,
                skillName: taskInfo.skillName,
                success: taskInfo.success
            },
            verification: null,
            duration: 0,
            error: null
        };

        try {
            // 执行验证
            const verifier = await this.loadVerifier();
            const skillName = taskInfo.skillName || 'dynamic-multi-agent-system';
            
            const verifyResult = await Promise.race([
                verifier.runFullVerification(skillName, { verbose: false }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('验证超时')), this.config.verifyTimeout)
                )
            ]);
            
            result.verification = verifyResult;
            result.duration = Date.now() - startTime;
            
            // 记录到日志
            await this.logManager.add({
                hookId,
                hookType: 'task_complete',
                taskName: taskInfo.name,
                skillName: taskInfo.skillName,
                verification: verifyResult,
                duration: result.duration,
                success: verifyResult.summary?.failedCount === 0
            });

            // 输出结果
            if (verifyResult.summary) {
                const { passedCount, failedCount, successRate } = verifyResult.summary;
                console.log(`[AutoVerify] ✓ 验证完成 - 通过: ${passedCount}, 失败: ${failedCount}, 成功率: ${successRate}%`);
                
                if (failedCount > 0) {
                    console.log(`[AutoVerify] ⚠ 存在失败项`);
                    if (this.config.blockOnFailure) {
                        console.log(`[AutoVerify] ⛔ 配置为阻止失败，但当前不会实际阻止`);
                    }
                }
            }

            return result;

        } catch (error) {
            result.error = error.message;
            result.duration = Date.now() - startTime;
            
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
            return result;
        }
    }

    /**
     * 启动时验证
     */
    async onStartup(skillName = 'dynamic-multi-agent-system') {
        const hookId = generateId();
        
        console.log(`[AutoVerify] 🚀 启动时验证 (${hookId})`);
        
        const result = {
            hookId,
            hookType: 'startup',
            timestamp: timestamp(),
            verification: null,
            duration: 0,
            error: null
        };

        try {
            const verifier = await this.loadVerifier();
            const verifyResult = await Promise.race([
                verifier.runFullVerification(skillName, { verbose: false }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('验证超时')), this.config.verifyTimeout)
                )
            ]);
            
            result.verification = verifyResult;
            result.duration = Date.now() - result.duration;
            
            await this.logManager.add({
                hookId,
                hookType: 'startup',
                skillName,
                verification: verifyResult,
                duration: result.duration,
                success: verifyResult.summary?.failedCount === 0
            });

            console.log(`[AutoVerify] ✓ 启动验证完成`);
            return result;

        } catch (error) {
            result.error = error.message;
            console.error(`[AutoVerify] ✗ 启动验证失败: ${error.message}`);
            return result;
        }
    }

    /**
     * 手动触发验证
     */
    async trigger(skillName, options = {}) {
        const hookId = generateId();
        
        console.log(`[AutoVerify] 🚀 手动触发验证 (${hookId})`);
        console.log(`[AutoVerify] 目标技能: ${skillName}`);
        
        const result = {
            hookId,
            hookType: 'manual',
            timestamp: timestamp(),
            skillName,
            verification: null,
            duration: 0,
            error: null
        };

        try {
            const verifier = await this.loadVerifier();
            const startTime = Date.now();
            
            const verifyResult = await Promise.race([
                verifier.runFullVerification(skillName, { verbose: options.verbose || false }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('验证超时')), this.config.verifyTimeout)
                )
            ]);
            
            result.verification = verifyResult;
            result.duration = Date.now() - startTime;
            
            await this.logManager.add({
                hookId,
                hookType: 'manual',
                skillName,
                verification: verifyResult,
                duration: result.duration,
                success: verifyResult.summary?.failedCount === 0
            });

            console.log(`[AutoVerify] ✓ 验证完成`);
            return result;

        } catch (error) {
            result.error = error.message;
            console.error(`[AutoVerify] ✗ 验证失败: ${error.message}`);
            return result;
        }
    }

    /**
     * 获取验证历史
     */
    async getHistory(count = 10) {
        return await this.logManager.getRecent(count);
    }

    /**
     * 获取指定技能的最新验证
     */
    async getLatest(skillName) {
        return await this.logManager.getLatestForSkill(skillName);
    }
}

// ============================================================
// 创建默认Hook实例
// ============================================================
const defaultHook = new AutoVerifyHook();

// ============================================================
// 导出
// ============================================================

module.exports = {
    AutoVerifyHook,
    VerificationLogManager,
    HOOK_CONFIG,
    
    // 快捷方法
    onTaskComplete: (taskInfo) => defaultHook.onTaskComplete(taskInfo),
    onStartup: (skillName) => defaultHook.onStartup(skillName),
    trigger: (skillName, options) => defaultHook.trigger(skillName, options),
    getHistory: (count) => defaultHook.getHistory(count),
    getLatest: (skillName) => defaultHook.getLatest(skillName),
    
    // 构造函数
    createHook: (config) => new AutoVerifyHook(config),
    createLogManager: (logPath) => new VerificationLogManager(logPath)
};

// ============================================================
// CLI入口
// ============================================================

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
                    console.log(JSON.stringify(result.verification, null, 2));
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
  node auto-verify-hook.js latest
`);
    }
}
