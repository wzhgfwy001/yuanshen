/**
 * DeerFlow增强版验证系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. 多维度验证
 * 2. 验证规则引擎
 * 3. 渐进式验证
 * 4. 验证报告生成
 */

const { EventEmitter } = require('events');

// ============== 验证结果类 ==============
class VerificationResult {
  constructor() {
    this.passed = true;
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.metadata = {};
  }

  addError(message, field = null, code = null) {
    this.passed = false;
    this.errors.push({ message, field, code, timestamp: Date.now() });
  }

  addWarning(message, field = null) {
    this.warnings.push({ message, field, timestamp: Date.now() });
  }

  addInfo(message, field = null) {
    this.info.push({ message, field, timestamp: Date.now() });
  }

  merge(other) {
    this.passed = this.passed && other.passed;
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    this.info.push(...other.info);
  }

  toJSON() {
    return {
      passed: this.passed,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      metadata: this.metadata
    };
  }
}

// ============== 验证规则类 ==============
class ValidationRule {
  constructor(config) {
    this.name = config.name;
    this.field = config.field || null;
    this.validator = config.validator;
    this.errorMessage = config.errorMessage || 'Validation failed';
    this.severity = config.severity || 'error'; // error, warning, info
    this.enabled = config.enabled !== false;
  }

  validate(data, context = {}) {
    if (!this.enabled) return new VerificationResult();

    const value = this.field ? this._getNestedValue(data, this.field) : data;
    
    try {
      const isValid = this.validator(value, data, context);
      
      const result = new VerificationResult();
      
      if (!isValid) {
        if (this.severity === 'error') {
          result.addError(this.errorMessage, this.field, this.name);
        } else if (this.severity === 'warning') {
          result.addWarning(this.errorMessage, this.field);
        } else {
          result.addInfo(this.errorMessage, this.field);
        }
      }
      
      return result;
    } catch (err) {
      const result = new VerificationResult();
      result.addError(`Validation error: ${err.message}`, this.field, this.name);
      return result;
    }
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : undefined, 
      obj
    );
  }
}

// ============== VerificationEngine 主类 ==============
class VerificationEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.rules = new Map();
    this.ruleGroups = new Map();
  }

  /**
   * 注册验证规则
   */
  registerRule(rule) {
    const validationRule = rule instanceof ValidationRule 
      ? rule 
      : new ValidationRule(rule);
    
    this.rules.set(validationRule.name, validationRule);
    
    // 添加到默认组
    if (!this.ruleGroups.has('default')) {
      this.ruleGroups.set('default', []);
    }
    this.ruleGroups.get('default').push(validationRule.name);
    
    return this;
  }

  /**
   * 批量注册规则
   */
  registerRules(rules) {
    rules.forEach(rule => this.registerRule(rule));
    return this;
  }

  /**
   * 创建规则组
   */
  createRuleGroup(name, ruleNames) {
    this.ruleGroups.set(name, ruleNames);
    return this;
  }

  /**
   * 验证数据
   */
  verify(data, options = {}) {
    const {
      group = 'default',
      rules = null,
      context = {},
      failFast = false
    } = options;

    const result = new VerificationResult();
    const ruleNames = rules || this.ruleGroups.get(group) || Array.from(this.rules.keys());

    for (const ruleName of ruleNames) {
      const rule = this.rules.get(ruleName);
      if (!rule) continue;

      const ruleResult = rule.validate(data, context);
      result.merge(ruleResult);

      if (failFast && !result.passed) {
        break;
      }
    }

    this.emit('verification_completed', {
      passed: result.passed,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      rulesChecked: ruleNames.length
    });

    return result;
  }

  /**
   * 验证字段
   */
  verifyField(data, fieldPath, context = {}) {
    const value = fieldPath.split('.').reduce((obj, key) => 
      obj && obj[key] !== undefined ? obj[key] : undefined, 
      data
    );

    const result = new VerificationResult();
    
    for (const rule of this.rules.values()) {
      if (rule.field === fieldPath) {
        const ruleResult = rule.validate(data, context);
        result.merge(ruleResult);
      }
    }
    
    return result;
  }

  /**
   * 获取规则列表
   */
  listRules(group = null) {
    if (group) {
      const ruleNames = this.ruleGroups.get(group) || [];
      return ruleNames.map(name => this.rules.get(name)).filter(Boolean);
    }
    return Array.from(this.rules.values());
  }

  /**
   * 移除规则
   */
  removeRule(name) {
    return this.rules.delete(name);
  }

  /**
   * 启用/禁用规则
   */
  setRuleEnabled(name, enabled) {
    const rule = this.rules.get(name);
    if (rule) {
      rule.enabled = enabled;
    }
  }
}

// ============== 内置验证规则工厂 ==============
const BuiltInRules = {
  /**
   * 必填验证
   */
  required(field, message = 'This field is required') {
    return new ValidationRule({
      name: `${field}:required`,
      field,
      validator: (value) => value !== null && value !== undefined && value !== '',
      errorMessage: message
    });
  },

  /**
   * 类型验证
   */
  typeOf(field, expectedType, message = null) {
    return new ValidationRule({
      name: `${field}:typeof`,
      field,
      validator: (value) => typeof value === expectedType,
      errorMessage: message || `Expected ${expectedType}`
    });
  },

  /**
   * 范围验证
   */
  range(field, min, max, message = null) {
    return new ValidationRule({
      name: `${field}:range`,
      field,
      validator: (value) => typeof value === 'number' && value >= min && value <= max,
      errorMessage: message || `Value must be between ${min} and ${max}`
    });
  },

  /**
   * 长度验证
   */
  length(field, min, max, message = null) {
    return new ValidationRule({
      name: `${field}:length`,
      field,
      validator: (value) => typeof value === 'string' && value.length >= min && value.length <= max,
      errorMessage: message || `Length must be between ${min} and ${max}`
    });
  },

  /**
   * 格式验证
   */
  format(field, pattern, message = null) {
    return new ValidationRule({
      name: `${field}:format`,
      field,
      validator: (value) => typeof value === 'string' && pattern.test(value),
      errorMessage: message || `Invalid format`
    });
  },

  /**
   * 自定义验证
   */
  custom(field, name, validator, errorMessage, severity = 'error') {
    return new ValidationRule({
      name: `${field}:${name}`,
      field,
      validator,
      errorMessage,
      severity
    });
  }
};

// ============== 导出 ==============
module.exports = {
  VerificationEngine,
  VerificationResult,
  ValidationRule,
  BuiltInRules
};
