/**
 * 闭环验证器 - Verification Loop Engine
 * 
 * 建立"搭建→验证→反馈"的闭环机制
 * 确保每次搭建后验证配置是否生效
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 基础路径配置
// ============================================================
const WORKSPACE_ROOT = 'C:\\Users\\DELL\\.openclaw\\workspace';
const SKILLS_ROOT = path.join(WORKSPACE_ROOT, 'skills');
const DYNAMIC_AGENT_ROOT = path.join(SKILLS_ROOT, 'dynamic-multi-agent-system');
const CORE_ROOT = path.join(DYNAMIC_AGENT_ROOT, 'core');
const STATE_ROOT = path.join(DYNAMIC_AGENT_ROOT, 'state');
const VERIFICATION_LOG = path.join(STATE_ROOT, 'verification-log.json');
const CATEGORY_MAPPING_PATH = path.join(CORE_ROOT, 'subagent-manager', 'category-mapping.json');

// ============================================================
// 工具函数
// ============================================================

/**
 * 异步读取JSON文件
 */
async function readJson(filePath) {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

/**
 * 异步写入JSON文件
 */
async function writeJson(filePath, data) {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 检查文件或目录是否存在
 */
async function exists(filePath) {
    return new Promise((resolve) => {
        fs.access(filePath, (err) => {
            resolve(!err);
        });
    });
}

/**
 * 生成唯一ID
 */
function generateId(prefix = 'v') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取时间戳
 */
function timestamp() {
    return new Date().toISOString();
}

// ============================================================
// 验证器类
// ============================================================

class 闭环验证器 {
    constructor(options = {}) {
        this.skillName = options.skillName || null;
        this.verbose = options.verbose || false;
        this.results = {
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
                skillName: options.skillName || 'unknown',
                verificationType: 'full',
                environment: process.env.NODE_ENV || 'development'
            }
        };
        this.startTime = Date.now();
    }

    /**
     * 记录通过项
     */
    pass(item) {
        const verificationItem = {
            id: generateId('pass'),
            name: item.name,
            category: item.category || 'general',
            status: 'passed',
            passed: true,
            message: item.message || '验证通过',
            expected: item.expected || null,
            actual: item.actual || null,
            details: item.details || {}
        };
        this.results.passed.push(verificationItem);
        if (this.verbose) {
            console.log(`[✓] ${item.name}: ${verificationItem.message}`);
        }
        return verificationItem;
    }

    /**
     * 记录失败项
     */
    fail(item) {
        const verificationItem = {
            id: generateId('fail'),
            name: item.name,
            category: item.category || 'general',
            status: 'failed',
            passed: false,
            message: item.message || '验证失败',
            expected: item.expected || null,
            actual: item.actual || null,
            error: item.error || null,
            recoverable: item.recoverable !== undefined ? item.recoverable : true,
            fixSuggestion: item.fixSuggestion || null,
            details: item.details || {}
        };
        this.results.failed.push(verificationItem);
        if (this.verbose) {
            console.log(`[✗] ${item.name}: ${verificationItem.message}`);
        }
        return verificationItem;
    }

    /**
     * 添加警告
     */
    warn(code, message, severity = 'medium', relatedItem = null) {
        const warning = {
            code,
            message,
            severity,
            relatedItem
        };
        this.results.warnings.push(warning);
        if (this.verbose) {
            console.log(`[!] [${severity.toUpperCase()}] ${code}: ${message}`);
        }
        return warning;
    }

    /**
     * 添加建议
     */
    suggest(code, message, priority = 'medium', category = 'general') {
        const suggestion = {
            code,
            message,
            priority,
            category,
            estimatedEffort: null,
            benefits: []
        };
        this.results.suggestions.push(suggestion);
        if (this.verbose) {
            console.log(`[→] [${priority.toUpperCase()}] ${code}: ${message}`);
        }
        return suggestion;
    }

    /**
     * 验证技能SKILL.md是否存在并有效
     */
    async verifySkillExists(skillName) {
        const skillPath = path.join(SKILLS_ROOT, skillName, 'SKILL.md');
        const existsResult = await exists(skillPath);
        
        if (!existsResult) {
            this.fail({
                name: 'SKILL.md存在性',
                category: 'setup',
                message: `技能 ${skillName} 的SKILL.md不存在`,
                expected: `路径: ${skillPath}`,
                actual: '文件不存在',
                error: 'SKILL.md missing',
                recoverable: true,
                fixSuggestion: `创建 ${skillPath} 或检查技能名称是否正确`
            });
            return false;
        }

        // 验证文件内容
        try {
            const content = await fs.promises.readFile(skillPath, 'utf8');
            const hasName = content.includes('name:') || content.includes('"name"');
            const hasDescription = content.includes('description:') || content.includes('"description"');
            
            if (!hasName) {
                this.fail({
                    name: 'SKILL.md格式-名称',
                    category: 'setup',
                    message: 'SKILL.md缺少name字段',
                    expected: 'name字段存在',
                    actual: 'name字段缺失',
                    recoverable: true
                });
            }
            
            if (!hasDescription) {
                this.fail({
                    name: 'SKILL.md格式-描述',
                    category: 'setup',
                    message: 'SKILL.md缺少description字段',
                    expected: 'description字段存在',
                    actual: 'description字段缺失',
                    recoverable: true
                });
            }

            if (hasName && hasDescription) {
                this.pass({
                    name: 'SKILL.md有效性',
                    category: 'setup',
                    message: `技能 ${skillName} 的SKILL.md有效`,
                    details: { skillPath, size: content.length }
                });
            }
        } catch (error) {
            this.fail({
                name: 'SKILL.md读取',
                category: 'setup',
                message: `读取SKILL.md失败: ${error.message}`,
                error: error.message,
                recoverable: false
            });
            return false;
        }

        return true;
    }

    /**
     * 验证技能配置是否正确加载
     */
    async verifySetup(skillName) {
        if (!skillName) {
            skillName = this.skillName;
        }
        
        if (!skillName) {
            this.fail({
                name: 'verifySetup-参数',
                category: 'setup',
                message: '未指定skillName',
                recoverable: false
            });
            return false;
        }

        const skillPath = path.join(SKILLS_ROOT, skillName);
        const skillExists = await exists(skillPath);
        
        if (!skillExists) {
            this.fail({
                name: '技能目录存在性',
                category: 'setup',
                message: `技能 ${skillName} 目录不存在`,
                expected: `路径: ${skillPath}`,
                actual: '目录不存在',
                recoverable: true,
                fixSuggestion: `创建 skills/${skillName} 目录并添加SKILL.md`
            });
            return false;
        }

        this.pass({
            name: '技能目录存在',
            category: 'setup',
            message: `技能 ${skillName} 目录存在`,
            details: { skillPath }
        });

        // 验证SKILL.md
        const skillMdExists = await this.verifySkillExists(skillName);
        
        // 如果是dynamic-multi-agent-system，额外检查
        if (skillName === 'dynamic-multi-agent-system') {
            await this.verifyCoreModules();
        }

        return skillMdExists;
    }

    /**
     * 验证核心模块完整性
     */
    async verifyCoreModules() {
        const requiredModules = [
            'subagent-manager',
            'skill-integrator',
            'task-classifier',
            'task-decomposer',
            'quality-checker',
            'verification'
        ];

        for (const module of requiredModules) {
            const modulePath = path.join(CORE_ROOT, module);
            const existsResult = await exists(modulePath);
            
            if (!existsResult) {
                this.fail({
                    name: `核心模块-${module}`,
                    category: 'setup',
                    message: `核心模块 ${module} 不存在`,
                    expected: `路径: ${modulePath}`,
                    actual: '目录不存在',
                    recoverable: true,
                    fixSuggestion: `创建 core/${module} 目录`
                });
            } else {
                this.pass({
                    name: `核心模块-${module}`,
                    category: 'setup',
                    message: `核心模块 ${module} 存在`,
                    details: { modulePath }
                });
            }
        }
    }

    /**
     * 验证category-mapping是否生效
     */
    async verifyMapping() {
        const mappingPath = CATEGORY_MAPPING_PATH;
        const existsResult = await exists(mappingPath);
        
        if (!existsResult) {
            this.fail({
                name: 'category-mapping存在性',
                category: 'mapping',
                message: 'category-mapping.json不存在',
                expected: `路径: ${mappingPath}`,
                actual: '文件不存在',
                recoverable: true,
                fixSuggestion: '创建 core/subagent-manager/category-mapping.json'
            });
            return false;
        }

        this.pass({
            name: 'category-mapping存在',
            category: 'mapping',
            message: 'category-mapping.json存在',
            details: { mappingPath }
        });

        // 读取并验证内容
        const mapping = await readJson(mappingPath);
        
        if (!mapping) {
            this.fail({
                name: 'category-mapping解析',
                category: 'mapping',
                message: 'category-mapping.json无法解析为JSON',
                error: 'Invalid JSON',
                recoverable: true
            });
            return false;
        }

        // 验证必需字段
        const requiredFields = ['_enabled', 'category_remap'];
        for (const field of requiredFields) {
            if (!(field in mapping)) {
                this.fail({
                    name: `category-mapping字段-${field}`,
                    category: 'mapping',
                    message: `缺少必需字段: ${field}`,
                    expected: `字段 ${field} 存在`,
                    actual: `字段 ${field} 缺失`,
                    recoverable: true
                });
            }
        }

        if (!('_enabled' in mapping) || !('category_remap' in mapping)) {
            return false;
        }

        // 验证_enabled状态
        if (mapping._enabled) {
            this.pass({
                name: 'category-mapping启用状态',
                category: 'mapping',
                message: 'category-mapping已启用',
                details: { enabled: true }
            });
        } else {
            this.warn('MAPPING_DISABLED', 'category-mapping已禁用，可能影响specialized拆分', 'medium');
        }

        // 验证映射数量
        const remappedAgents = mapping.category_remap?.specialized || {};
        const agentCount = Object.keys(remappedAgents).length;
        
        if (agentCount > 0) {
            this.pass({
                name: 'category-mapping映射数',
                category: 'mapping',
                message: `category-mapping包含 ${agentCount} 个Agent映射`,
                details: { agentCount, agents: Object.keys(remappedAgents) }
            });

            // 验证新分类
            const newCategories = mapping.new_categories || {};
            const categoryCount = Object.keys(newCategories).length;
            
            this.pass({
                name: 'category-mapping新分类数',
                category: 'mapping',
                message: `定义了 ${categoryCount} 个新分类`,
                details: { categoryCount, categories: Object.keys(newCategories) }
            });
        }

        // 验证registry.json引用
        const registryPath = path.join(CORE_ROOT, 'agency-registry', 'registry.json');
        const registryExists = await exists(registryPath);
        
        if (registryExists) {
            this.pass({
                name: 'registry引用',
                category: 'mapping',
                message: 'registry.json存在，映射层可正常工作',
                details: { registryPath }
            });
        } else {
            this.warn('REGISTRY_NOT_FOUND', 'registry.json不存在，category-mapping可能无法生效', 'high');
        }

        return true;
    }

    /**
     * 验证工具链是否完整
     */
    async verifyToolChain() {
        // 定义必需的核心工具
        const requiredTools = [
            { name: 'subagent-manager', check: 'category-mapping.json' },
            { name: 'skill-integrator', check: 'skill-integrator.js' },
            { name: 'task-classifier', check: 'SKILL.md' },
            { name: 'task-decomposer', check: 'SKILL.md' },
            { name: 'verification', check: 'verification.schema.json' }
        ];

        const missingTools = [];
        const presentTools = [];

        for (const tool of requiredTools) {
            const toolPath = path.join(CORE_ROOT, tool.name, tool.check);
            const existsResult = await exists(toolPath);
            
            if (!existsResult) {
                missingTools.push({ name: tool.name, check: tool.check, path: toolPath });
                this.fail({
                    name: `工具链-${tool.name}`,
                    category: 'toolchain',
                    message: `工具 ${tool.name} 的 ${tool.check} 不存在`,
                    expected: `路径: ${toolPath}`,
                    actual: '文件不存在',
                    recoverable: true,
                    fixSuggestion: `检查 core/${tool.name} 目录配置`
                });
            } else {
                presentTools.push({ name: tool.name, check: tool.check, path: toolPath });
                this.pass({
                    name: `工具链-${tool.name}`,
                    category: 'toolchain',
                    message: `工具 ${tool.name} 正常 (${tool.check})`,
                    details: { toolPath }
                });
            }
        }

        // 验证state目录
        const stateExists = await exists(STATE_ROOT);
        if (stateExists) {
            this.pass({
                name: 'state目录',
                category: 'toolchain',
                message: 'state目录存在',
                details: { stateRoot: STATE_ROOT }
            });
        } else {
            this.fail({
                name: 'state目录',
                category: 'toolchain',
                message: 'state目录不存在',
                recoverable: true,
                fixSuggestion: '创建 state 目录'
            });
        }

        // 验证logs目录
        const logsPath = path.join(DYNAMIC_AGENT_ROOT, 'logs');
        const logsExists = await exists(logsPath);
        if (logsExists) {
            this.pass({
                name: 'logs目录',
                category: 'toolchain',
                message: 'logs目录存在'
            });
        }

        // 汇总建议
        if (missingTools.length > 0) {
            this.suggest(
                'TOOLCHAIN_INCOMPLETE',
                `缺少 ${missingTools.length} 个工具组件，建议补充完整`,
                'high',
                'toolchain'
            );
        }

        return missingTools.length === 0;
    }

    /**
     * 生成验证报告
     */
    async generateVerificationReport() {
        this.results.duration = Date.now() - this.startTime;
        
        // 计算汇总
        const total = this.results.passed.length + this.results.failed.length;
        const passedCount = this.results.passed.length;
        const failedCount = this.results.failed.length;
        const warningCount = this.results.warnings.length;
        const successRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;

        this.results.summary = {
            total,
            passedCount,
            failedCount,
            warningCount,
            successRate,
            status: failedCount === 0 ? 'success' : failedCount < total * 0.3 ? 'partial' : 'failed',
            readyForProduction: failedCount === 0 && warningCount < 3
        };

        return this.results;
    }

    /**
     * 保存验证日志
     */
    async saveLog() {
        try {
            // 确保state目录存在
            const stateDirExists = await exists(STATE_ROOT);
            if (!stateDirExists) {
                await fs.promises.mkdir(STATE_ROOT, { recursive: true });
            }

            // 读取现有日志
            let logs = [];
            const logExists = await exists(VERIFICATION_LOG);
            if (logExists) {
                const content = await fs.promises.readFile(VERIFICATION_LOG, 'utf8');
                try {
                    logs = JSON.parse(content);
                    if (!Array.isArray(logs)) logs = [logs];
                } catch {
                    logs = [];
                }
            }

            // 添加新结果
            logs.push(this.results);

            // 保留最近100条记录
            if (logs.length > 100) {
                logs = logs.slice(-100);
            }

            await writeJson(VERIFICATION_LOG, logs);
            return true;
        } catch (error) {
            console.error(`[!] 保存验证日志失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 运行完整验证
     */
    async runFullVerification(skillName = null) {
        const targetSkill = skillName || this.skillName || 'dynamic-multi-agent-system';
        this.results.metadata.skillName = targetSkill;
        this.results.metadata.verificationType = 'full';

        console.log(`\n========== 闭环验证开始 ==========`);
        console.log(`目标技能: ${targetSkill}`);
        console.log(`时间: ${this.results.timestamp}`);
        console.log('==================================\n');

        // 1. 验证技能配置
        console.log('[1/3] 验证技能配置...');
        await this.verifySetup(targetSkill);

        // 2. 验证category-mapping
        console.log('[2/3] 验证category-mapping...');
        await this.verifyMapping();

        // 3. 验证工具链
        console.log('[3/3] 验证工具链...');
        await this.verifyToolChain();

        // 生成报告
        const report = await this.generateVerificationReport();

        // 保存日志
        await this.saveLog();

        // 输出摘要
        console.log('\n========== 验证报告摘要 ==========');
        console.log(`总验证项: ${report.summary.total}`);
        console.log(`通过: ${report.summary.passedCount}`);
        console.log(`失败: ${report.summary.failedCount}`);
        console.log(`警告: ${report.summary.warningCount}`);
        console.log(`成功率: ${report.summary.successRate}%`);
        console.log(`状态: ${report.summary.status}`);
        console.log(`可用于生产: ${report.summary.readyForProduction ? '✓' : '✗'}`);
        console.log('==================================\n');

        return report;
    }
}

// ============================================================
// 导出
// ============================================================

module.exports = {
    闭环验证器,
    
    // 快捷函数
    verifySetup: async (skillName, options = {}) => {
        const verifier = new 闭环验证器({ skillName, verbose: options.verbose });
        await verifier.verifySetup(skillName);
        return verifier.results;
    },
    
    verifyMapping: async (options = {}) => {
        const verifier = new 闭环验证器({ verbose: options.verbose });
        await verifier.verifyMapping();
        return verifier.results;
    },
    
    verifyToolChain: async (options = {}) => {
        const verifier = new 闭环验证器({ verbose: options.verbose });
        await verifier.verifyToolChain();
        return verifier.results;
    },
    
    runFullVerification: async (skillName = null, options = {}) => {
        const verifier = new 闭环验证器({ skillName, verbose: options.verbose });
        return await verifier.runFullVerification(skillName);
    },
    
    generateReport: async () => {
        const verifier = new 闭环验证器();
        return await verifier.generateVerificationReport();
    }
};

// 如果直接运行，执行验证
if (require.main === module) {
    const skillName = process.argv[2] || 'dynamic-multi-agent-system';
    const verbose = process.argv.includes('--verbose');
    
    闭环验证器.prototype.runFullVerification(skillName, { verbose })
        .then(report => {
            console.log('\n完整报告:');
            console.log(JSON.stringify(report, null, 2));
            process.exit(report.summary.failedCount > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('验证执行失败:', error);
            process.exit(1);
        });
}
