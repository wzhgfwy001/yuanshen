/**
 * Config Patcher - 配置补丁生成器
 * 
 * 将 SKILL.md 的 metadata 块转换为可执行配置
 * 验证配置完整性，生成补丁文件
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ConfigPatcher {
  constructor(options = {}) {
    this.patchDir = options.patchDir || path.join(__dirname, '.patches');
    this.validateSchema = options.validateSchema !== false;
    this.schemaPath = options.schemaPath || path.join(__dirname, 'skill-metadata.schema.json');
    this.schema = null;
    
    // 确保补丁目录存在
    if (!fs.existsSync(this.patchDir)) {
      fs.mkdirSync(this.patchDir, { recursive: true });
    }
  }

  /**
   * 加载 schema（延迟加载）
   */
  getSchema() {
    if (!this.schema && fs.existsSync(this.schemaPath)) {
      try {
        this.schema = JSON.parse(fs.readFileSync(this.schemaPath, 'utf-8'));
      } catch (e) {
        console.warn('[config-patcher] Schema 加载失败:', e.message);
      }
    }
    return this.schema;
  }

  /**
   * 将 SKILL.md frontmatter 转换为可执行配置
   * @param {Object} frontmatter - 解析后的 frontmatter 对象
   * @param {string} skillName - Skill 名称
   * @returns {Object} 可执行配置
   */
  patch(frontmatter, skillName) {
    const config = this._buildBaseConfig(frontmatter, skillName);
    
    // 验证配置
    const validation = this.validate(config);
    if (!validation.valid) {
      console.warn(`[config-patcher] 配置验证失败 [${skillName}]:`, validation.errors);
    }
    
    // 生成补丁文件
    const patch = this._generatePatch(config, skillName);
    
    return {
      config,
      patch,
      validation,
      skillName
    };
  }

  /**
   * 构建基础配置
   */
  _buildBaseConfig(frontmatter, skillName) {
    const openclaw = frontmatter.openclaw || {};
    
    return {
      // 基本信息
      name: skillName,
      version: frontmatter.version || '0.0.0',
      description: frontmatter.description || '',
      
      // OpenClaw 配置
      category: openclaw.category || this._inferCategory(skillName),
      capabilities: this._normalizeArray(openclaw.capabilities),
      keywords: this._normalizeArray(openclaw.keywords),
      dependencies: this._normalizeArray(openclaw.dependencies),
      priority: this._parseInt(openclaw.priority, 50),
      hidden: this._parseBool(openclaw.hidden, false),
      
      // 执行配置
      executionConfig: {
        timeout: this._parseInt(openclaw.timeout, 120000),
        maxRetries: this._parseInt(openclaw.maxRetries, 3),
        preferredAgent: openclaw.preferredAgent || this._inferAgent(skillName),
        temperature: this._parseFloat(openclaw.temperature, 0.7)
      },
      
      // 元数据
      metadata: {
        patchedAt: new Date().toISOString(),
        source: 'SKILL.md frontmatter'
      }
    };
  }

  /**
   * 推断分类
   */
  _inferCategory(skillName) {
    const name = skillName.toLowerCase();
    
    if (name.includes('code') || name.includes('review')) return 'development';
    if (name.includes('write') || name.includes('blog')) return 'content';
    if (name.includes('analysis') || name.includes('data')) return 'analysis';
    if (name.includes('research')) return 'research';
    if (name.includes('plan') || name.includes('project')) return 'planning';
    
    return 'utility';
  }

  /**
   * 推断代理类型
   */
  _inferAgent(skillName) {
    const name = skillName.toLowerCase();
    
    if (name.includes('code')) return 'coder';
    if (name.includes('write') || name.includes('creative')) return 'creative';
    if (name.includes('analysis') || name.includes('data')) return 'analyst';
    if (name.includes('research')) return 'researcher';
    
    return 'generalist';
  }

  /**
   * 标准化数组（支持 YAML 多行格式和逗号分隔）
   */
  _normalizeArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // 尝试 JSON 数组格式
      if (value.startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch {
          // 逗号分隔
          return value.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      // 逗号分隔
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  /**
   * 解析整数
   */
  _parseInt(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 解析浮点数
   */
  _parseFloat(value, defaultValue) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 解析布尔值
   */
  _parseBool(value, defaultValue) {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }
    return defaultValue;
  }

  /**
   * 验证配置完整性
   */
  validate(config) {
    const errors = [];
    const warnings = [];

    // 必须字段检查
    if (!config.name) {
      errors.push('缺少 name 字段');
    }

    // 版本格式检查
    if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
      warnings.push(`版本格式不规范: ${config.version}，建议使用 semver`);
    }

    // 执行配置范围检查
    if (config.executionConfig) {
      if (config.executionConfig.timeout < 1000) {
        errors.push('timeout 不能小于 1000ms');
      }
      if (config.executionConfig.maxRetries < 0) {
        errors.push('maxRetries 不能为负数');
      }
      if (config.executionConfig.temperature < 0 || config.executionConfig.temperature > 2) {
        errors.push('temperature 必须在 0-2 之间');
      }
    }

    // Category 有效性检查
    const validCategories = ['development', 'content', 'analysis', 'research', 'planning', 'utility', 'system'];
    if (config.category && !validCategories.includes(config.category)) {
      warnings.push(`category "${config.category}" 不在标准列表中`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 生成补丁文件
   */
  _generatePatch(config, skillName) {
    const patchId = crypto.randomBytes(8).toString('hex');
    const patchData = {
      id: patchId,
      skillName,
      config,
      generatedAt: new Date().toISOString()
    };

    const patchPath = path.join(this.patchDir, `${skillName}-${patchId}.json`);
    fs.writeFileSync(patchPath, JSON.stringify(patchData, null, 2));

    return {
      id: patchId,
      path: patchPath,
      data: patchData
    };
  }

  /**
   * 从补丁文件加载配置
   */
  loadPatch(patchId, skillName) {
    const files = fs.readdirSync(this.patchDir);
    const patchFile = files.find(f => 
      f.startsWith(`${skillName}-`) && f.includes(patchId)
    );

    if (!patchFile) {
      return null;
    }

    return JSON.parse(fs.readFileSync(path.join(this.patchDir, patchFile), 'utf-8'));
  }

  /**
   * 清理旧补丁
   */
  cleanupOldPatches(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    const files = fs.readdirSync(this.patchDir);
    let cleaned = 0;

    for (const file of files) {
      const stat = fs.statSync(path.join(this.patchDir, file));
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(path.join(this.patchDir, file));
        cleaned++;
      }
    }

    return { cleaned };
  }
}

module.exports = ConfigPatcher;