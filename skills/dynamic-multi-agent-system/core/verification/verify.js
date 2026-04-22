/**
 * Verification Module v2.0 - 验证逻辑实现
 * 基于DeerFlow架构优化：
 * 1. 中间件管道钩子
 * 2. 重试机制
 * 3. 结果缓存
 * 4. 结构化状态
 * 
 * Verify Before Reporting (VBR) 核心
 */

// ==================== DeerFlow借鉴1: 结构化状态 ====================

class VerificationError extends Error {
    constructor(message, verificationType, details = {}) {
        super(message);
        this.name = 'VerificationError';
        this.verificationType = verificationType;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

class VerificationResult {
    constructor(success, message, details = {}) {
        this.verified = success;
        this.message = message;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
    
    toJSON() {
        return {
            verified: this.verified,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

// ==================== DeerFlow借鉴2: 中间件管道 ====================

class VerificationMiddleware {
    beforeVerify(context) { return context; }
    afterVerify(result, context) { return result; }
    onError(error, context) { return context; }
}

class VerificationPipeline {
    constructor() {
        this.middlewares = [];
    }
    
    use(mw) {
        this.middlewares.push(mw);
        return this;
    }
    
    execute(context, verifyFn) {
        let ctx = { ...context, errors: [] };
        
        // BEFORE钩子
        for (const mw of this.middlewares) {
            try {
                ctx = mw.beforeVerify(ctx) || ctx;
            } catch (e) {
                ctx.errors.push(e.message);
                mw.onError(e, ctx);
            }
        }
        
        // 执行验证
        let result;
        try {
            result = verifyFn(ctx);
        } catch (e) {
            ctx.errors.push(e.message);
            for (const mw of this.middlewares) {
                mw.onError(e, ctx);
            }
            result = new VerificationResult(false, e.message, { error: e.message });
        }
        
        // AFTER钩子
        for (const mw of this.middlewares) {
            try {
                result = mw.afterVerify(result, ctx) || result;
            } catch (e) {
                ctx.errors.push(e.message);
            }
        }
        
        if (ctx.errors.length > 0) {
            result.details.middlewareErrors = ctx.errors;
        }
        
        return result;
    }
}

// 具体中间件
class InputNormalizationMiddleware extends VerificationMiddleware {
    beforeVerify(context) {
        if (context.filePath) {
            context.filePath = context.filePath.replace(/\\/g, '/').trim();
        }
        return context;
    }
}

class ResultEnrichmentMiddleware extends VerificationMiddleware {
    afterVerify(result, context) {
        result.details.pipelineVersion = '2.0';
        result.details.context = context;
        return result;
    }
}

class RetryMiddleware extends VerificationMiddleware {
    constructor(maxRetries = 3, baseDelayMs = 100) {
        super();
        this.maxRetries = maxRetries;
        this.baseDelayMs = baseDelayMs;
    }
    
    onError(error, context) {
        context.retryCount = (context.retryCount || 0) + 1;
        if (context.retryCount <= this.maxRetries) {
            const delay = this.baseDelayMs * Math.pow(2, context.retryCount - 1);
            context.retryDelay = delay;
        }
    }
}

// ==================== DeerFlow借鉴3: 结果缓存 ====================

const verificationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟缓存

function getCacheKey(type, ...args) {
    return `${type}:${JSON.stringify(args)}`;
}

function getCachedResult(key) {
    const cached = verificationCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return cached.result;
    }
    return null;
}

function setCachedResult(key, result) {
    verificationCache.set(key, {
        result,
        timestamp: Date.now()
    });
}

function clearCache() {
    verificationCache.clear();
}

// ==================== DeerFlow借鉴4: 重试逻辑 ====================

async function withRetry(fn, maxRetries = 3, baseDelay = 100) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// ==================== 验证器实现 ====================

class FileVerifier {
    constructor(pipeline = null) {
        this.pipeline = pipeline || new VerificationPipeline();
        this.pipeline.use(new InputNormalizationMiddleware());
        this.pipeline.use(new ResultEnrichmentMiddleware());
    }
    
    async verify(filePath, options = {}) {
        const cacheKey = getCacheKey('file', filePath, options);
        const cached = getCachedResult(cacheKey);
        if (cached && !options.force) {
            return cached;
        }
        
        const result = this.pipeline.execute(
            { filePath, options },
            async (ctx) => {
                const fs = require('fs').promises;
                const path = require('path');
                const { filePath: fp, options: opts } = ctx;
                
                const { 
                    shouldExist = true, 
                    minSize = 0, 
                    maxSize = Infinity,
                    contentPattern = null,
                    timeout = 5000 
                } = opts;
                
                // 检查存在性
                const exists = await fs.access(fp).then(() => true).catch(() => false);
                
                if (shouldExist && !exists) {
                    throw new VerificationError(`文件不存在: ${fp}`, 'file', { filePath: fp });
                }
                
                if (!shouldExist && exists) {
                    throw new VerificationError(`文件不应存在: ${fp}`, 'file', { filePath: fp });
                }
                
                if (!exists) {
                    return new VerificationResult(true, '文件不存在（符合预期）');
                }
                
                // 检查文件大小
                const stats = await fs.stat(fp);
                
                if (stats.size < minSize) {
                    throw new VerificationError(`文件太小: ${fp}`, 'file', { expectedMin: minSize, actual: stats.size });
                }
                
                if (stats.size > maxSize) {
                    throw new VerificationError(`文件太大: ${fp}`, 'file', { expectedMax: maxSize, actual: stats.size });
                }
                
                // 检查内容模式
                if (contentPattern) {
                    const content = await fs.readFile(fp, 'utf8');
                    const regex = new RegExp(contentPattern);
                    if (!regex.test(content)) {
                        throw new VerificationError(`文件内容不符合模式: ${fp}`, 'file', { pattern: contentPattern });
                    }
                }
                
                return new VerificationResult(true, '文件验证通过', {
                    filePath: fp,
                    size: stats.size,
                    exists: true
                });
            }
        );
        
        setCachedResult(cacheKey, result);
        return result;
    }
}

class CommandVerifier {
    constructor(pipeline = null) {
        this.pipeline = pipeline || new VerificationPipeline();
        this.pipeline.use(new InputNormalizationMiddleware());
        this.pipeline.use(new ResultEnrichmentMiddleware());
    }
    
    async verify(command, expectedResult = null, options = {}) {
        const cacheKey = getCacheKey('command', command, expectedResult, options);
        const cached = getCachedResult(cacheKey);
        if (cached && !options.force) {
            return cached;
        }
        
        const result = await withRetry(async () => {
            return this.pipeline.execute(
                { command, expectedResult, options },
                async (ctx) => {
                    const { exec } = require('child_process');
                    const { promisify } = require('util');
                    const execAsync = promisify(exec);
                    
                    const { command: cmd, expectedResult: expected, options: opts } = ctx;
                    const { shell = 'powershell', timeout = 30000, checkExitCode = true } = opts;
                    
                    const fullCommand = shell === 'powershell' 
                        ? `powershell -Command "${cmd}"` 
                        : cmd;
                    
                    const { stdout, stderr } = await execAsync(fullCommand, { timeout });
                    
                    if (checkExitCode && stderr && stderr.includes('Exception')) {
                        throw new VerificationError(`命令执行失败: ${stderr}`, 'command', { command: cmd, stderr });
                    }
                    
                    if (expected !== null) {
                        const output = stdout.trim();
                        if (typeof expected === 'string') {
                            if (!output.includes(expected)) {
                                throw new VerificationError(`命令输出不包含预期内容`, 'command', { 
                                    command: cmd, expected, actual: output 
                                });
                            }
                        } else if (typeof expected === 'object') {
                            try {
                                const json = JSON.parse(output);
                                for (const [key, value] of Object.entries(expected)) {
                                    if (json[key] !== value) {
                                        throw new VerificationError(`JSON字段不匹配: ${key}`, 'command', {
                                            command: cmd, expectedKey: key, expectedValue: value, actualValue: json[key]
                                        });
                                    }
                                }
                            } catch (e) {
                                if (e instanceof VerificationError) throw e;
                                throw new VerificationError(`命令输出不是有效的JSON`, 'command', { command: cmd, error: e.message });
                            }
                        }
                    }
                    
                    return new VerificationResult(true, '命令验证通过', {
                        command: cmd,
                        stdout: stdout.trim(),
                        stderr: stderr.trim()
                    });
                }
            );
        }, options.maxRetries || 3, options.retryDelay || 100);
        
        setCachedResult(cacheKey, result);
        return result;
    }
}

class ApiVerifier {
    constructor(pipeline = null) {
        this.pipeline = pipeline || new VerificationPipeline();
        this.pipeline.use(new ResultEnrichmentMiddleware());
    }
    
    async verify(response, expectedSchema = null, options = {}) {
        const cacheKey = getCacheKey('api', JSON.stringify(response).slice(0, 100), expectedSchema);
        const cached = getCachedResult(cacheKey);
        if (cached && !options.force) {
            return cached;
        }
        
        const result = this.pipeline.execute(
            { response, expectedSchema, options },
            async (ctx) => {
                const { response: res, expectedSchema: schema, options: opts } = ctx;
                const { requiredFields = [], fieldTypes = {}, customValidators = {} } = opts;
                
                const errors = [];
                
                // 检查必需字段
                for (const field of requiredFields) {
                    if (!(field in res)) {
                        errors.push(`缺少必需字段: ${field}`);
                    }
                }
                
                // 检查字段类型
                for (const [field, expectedType] of Object.entries(fieldTypes)) {
                    if (field in res) {
                        const actualType = typeof res[field];
                        if (actualType !== expectedType) {
                            errors.push(`字段类型错误: ${field}`);
                        }
                    }
                }
                
                // 自定义验证器
                for (const [field, validator] of Object.entries(customValidators)) {
                    if (field in res) {
                        try {
                            const valid = validator(res[field]);
                            if (!valid) {
                                errors.push(`字段验证失败: ${field}`);
                            }
                        } catch (e) {
                            errors.push(`字段验证异常: ${field} - ${e.message}`);
                        }
                    }
                }
                
                if (errors.length > 0) {
                    throw new VerificationError(`API响应验证失败: ${errors.join('; ')}`, 'api', { errors });
                }
                
                return new VerificationResult(true, 'API响应验证通过', {
                    fieldCount: Object.keys(res).length,
                    validatedFields: [...requiredFields, ...Object.keys(fieldTypes)]
                });
            }
        );
        
        setCachedResult(cacheKey, result);
        return result;
    }
}

// ==================== 综合验证入口 ====================

class VerificationManager {
    constructor() {
        this.fileVerifier = new FileVerifier();
        this.commandVerifier = new CommandVerifier();
        this.apiVerifier = new ApiVerifier();
        this.pipeline = new VerificationPipeline();
    }
    
    async verify(taskDescription, ...validators) {
        console.log(`[VBR] 验证: ${taskDescription}`);
        
        const results = [];
        const errors = [];
        
        for (const validator of validators) {
            try {
                const result = await validator();
                results.push(result);
                console.log(`[VBR] ✓ ${result.message}`);
            } catch (error) {
                errors.push(error);
                console.log(`[VBR] ✗ ${error.message}`);
            }
        }
        
        if (errors.length > 0) {
            throw new VerificationError(
                `验证失败 (${errors.length}/${validators.length})`,
                'composite',
                { errors: errors.map(e => e.message) }
            );
        }
        
        return new VerificationResult(true, `全部 ${results.length} 项验证通过`, { results });
    }
    
    clearCache() {
        clearCache();
    }
}

// 导出
const manager = new VerificationManager();

module.exports = {
    // 核心类
    VerificationError,
    VerificationResult,
    VerificationPipeline,
    VerificationMiddleware,
    FileVerifier,
    CommandVerifier,
    ApiVerifier,
    VerificationManager,
    
    // 便捷函数
    verify: (task, ...validators) => manager.verify(task, ...validators),
    verifyFile: (path, opts) => manager.fileVerifier.verify(path, opts),
    verifyCommand: (cmd, expected, opts) => manager.commandVerifier.verify(cmd, expected, opts),
    verifyApiResponse: (res, schema, opts) => manager.apiVerifier.verify(res, schema, opts),
    clearCache: () => manager.clearCache(),
    
    // 缓存管理
    getCacheStats: () => ({
        size: verificationCache.size,
        entries: Array.from(verificationCache.keys())
    })
};
