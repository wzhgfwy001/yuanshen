/**
 * Verification Module - 验证逻辑实现
 * Verify Before Reporting (VBR) 核心
 * 
 * 使用方法:
 * const { verify, verifyFile, verifyCommand, verifyApiResponse } = require('./verify');
 */

// 基础验证器类
class VerificationError extends Error {
    constructor(message, verificationType, details = {}) {
        super(message);
        this.name = 'VerificationError';
        this.verificationType = verificationType;
        this.details = details;
    }
}

// 文件验证
async function verifyFile(filePath, options = {}) {
    const { 
        shouldExist = true, 
        minSize = 0, 
        maxSize = Infinity,
        contentPattern = null,
        timeout = 5000 
    } = options;

    const fs = require('fs').promises;
    const path = require('path');

    try {
        // 检查存在性
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        
        if (shouldExist && !exists) {
            throw new VerificationError(
                `文件不存在: ${filePath}`,
                'file',
                { filePath, shouldExist, actual: exists }
            );
        }
        
        if (!shouldExist && exists) {
            throw new VerificationError(
                `文件不应存在: ${filePath}`,
                'file',
                { filePath, shouldExist, actual: exists }
            );
        }

        if (!exists) {
            return { verified: true, message: '文件不存在（符合预期）' };
        }

        // 检查文件大小
        const stats = await fs.stat(filePath);
        
        if (stats.size < minSize) {
            throw new VerificationError(
                `文件太小: ${filePath} (${stats.size} < ${minSize})`,
                'file',
                { filePath, expectedMin: minSize, actual: stats.size }
            );
        }
        
        if (stats.size > maxSize) {
            throw new VerificationError(
                `文件太大: ${filePath} (${stats.size} > ${maxSize})`,
                'file',
                { filePath, expectedMax: maxSize, actual: stats.size }
            );
        }

        // 检查内容模式
        if (contentPattern) {
            const content = await fs.readFile(filePath, 'utf8');
            const regex = new RegExp(contentPattern);
            if (!regex.test(content)) {
                throw new VerificationError(
                    `文件内容不符合模式: ${filePath}`,
                    'file',
                    { filePath, pattern: contentPattern }
                );
            }
        }

        return {
            verified: true,
            message: '文件验证通过',
            details: {
                filePath,
                size: stats.size,
                exists: true
            }
        };

    } catch (error) {
        if (error instanceof VerificationError) throw error;
        throw new VerificationError(
            `文件验证失败: ${error.message}`,
            'file',
            { filePath, error: error.message }
        );
    }
}

// 命令执行验证
async function verifyCommand(command, expectedResult = null, options = {}) {
    const { 
        shell = 'powershell',
        timeout = 30000,
        checkExitCode = true 
    } = options;

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
        const fullCommand = shell === 'powershell' 
            ? `powershell -Command "${command}"` 
            : command;

        const { stdout, stderr } = await execAsync(fullCommand, { timeout });
        
        // 检查退出码（仅PowerShell命令）
        if (checkExitCode && stderr && stderr.includes('Exception')) {
            throw new VerificationError(
                `命令执行失败: ${stderr}`,
                'command',
                { command, stderr }
            );
        }

        // 验证预期结果
        if (expectedResult !== null) {
            const output = stdout.trim();
            if (typeof expectedResult === 'string') {
                if (!output.includes(expectedResult)) {
                    throw new VerificationError(
                        `命令输出不包含预期内容`,
                        'command',
                        { command, expected: expectedResult, actual: output }
                    );
                }
            } else if (typeof expectedResult === 'object') {
                // JSON验证
                try {
                    const json = JSON.parse(output);
                    for (const [key, value] of Object.entries(expectedResult)) {
                        if (json[key] !== value) {
                            throw new VerificationError(
                                `JSON字段不匹配: ${key}`,
                                'command',
                                { command, expectedKey: key, expectedValue: value, actualValue: json[key] }
                            );
                        }
                    }
                } catch (e) {
                    if (e instanceof VerificationError) throw e;
                    throw new VerificationError(
                        `命令输出不是有效的JSON`,
                        'command',
                        { command, error: e.message }
                    );
                }
            }
        }

        return {
            verified: true,
            message: '命令验证通过',
            details: {
                command,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            }
        };

    } catch (error) {
        if (error instanceof VerificationError) throw error;
        throw new VerificationError(
            `命令验证失败: ${error.message}`,
            'command',
            { command, error: error.message }
        );
    }
}

// API响应验证
async function verifyApiResponse(response, expectedSchema = null, options = {}) {
    const { 
        requiredFields = [], 
        fieldTypes = {},
        customValidators = {} 
    } = options;

    const errors = [];

    // 检查必需字段
    for (const field of requiredFields) {
        if (!(field in response)) {
            errors.push(`缺少必需字段: ${field}`);
        }
    }

    // 检查字段类型
    for (const [field, expectedType] of Object.entries(fieldTypes)) {
        if (field in response) {
            const actualType = typeof response[field];
            if (actualType !== expectedType) {
                errors.push(`字段类型错误: ${field} (预期: ${expectedType}, 实际: ${actualType})`);
            }
        }
    }

    // 自定义验证器
    for (const [field, validator] of Object.entries(customValidators)) {
        if (field in response) {
            try {
                const result = validator(response[field]);
                if (!result) {
                    errors.push(`字段验证失败: ${field}`);
                }
            } catch (e) {
                errors.push(`字段验证异常: ${field} - ${e.message}`);
            }
        }
    }

    // Schema验证（如果提供）
    if (expectedSchema) {
        for (const [field, schema] of Object.entries(expectedSchema)) {
            if (schema.required && !(field in response)) {
                errors.push(`Schema验证 - 缺少字段: ${field}`);
            }
        }
    }

    if (errors.length > 0) {
        throw new VerificationError(
            `API响应验证失败: ${errors.join('; ')}`,
            'api',
            { errors, responseKeys: Object.keys(response) }
        );
    }

    return {
        verified: true,
        message: 'API响应验证通过',
        details: {
            fieldCount: Object.keys(response).length,
            validatedFields: [...requiredFields, ...Object.keys(fieldTypes), ...Object.keys(customValidators)]
        }
    };
}

// 综合验证入口
async function verify(taskDescription, ...validators) {
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

    return {
        verified: true,
        message: `全部 ${results.length} 项验证通过`,
        results
    };
}

// 工厂函数 - 创建验证器
function createFileVerifier(filePath, options = {}) {
    return () => verifyFile(filePath, options);
}

function createCommandVerifier(command, expectedResult = null, options = {}) {
    return () => verifyCommand(command, expectedResult, options);
}

module.exports = {
    verify,
    verifyFile,
    verifyCommand,
    verifyApiResponse,
    createFileVerifier,
    createCommandVerifier,
    VerificationError
};
