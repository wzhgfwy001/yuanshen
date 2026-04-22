---
name: deerflow-verification
description: DeerFlow增强版验证系统 - 多维度验证、规则引擎、渐进式验证、报告生成
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | verification=true | validation=true | quality_control=true
---

# DeerFlow增强版验证系统

**【附魔·改】Verification Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 验证系统 | `verification=true` | 启用验证 |
| 质量控制 | `quality_control=true` | 质量检查 |

## 核心功能

### 1. 基础验证

```javascript
const { VerificationEngine, VerificationResult } = require('./deerflow_enhanced.js');

const engine = new VerificationEngine();

// 验证数据
const result = engine.verify({
  name: 'John',
  email: 'john@example.com',
  age: 30
});

if (!result.passed) {
  console.log('验证失败:', result.errors);
}
```

### 2. 注册验证规则

```javascript
const engine = new VerificationEngine();

// 添加规则
engine.registerRule({
  name: 'name_required',
  field: 'name',
  validator: (value) => value && value.trim().length > 0,
  errorMessage: 'Name is required',
  severity: 'error'
});

engine.registerRule({
  name: 'email_format',
  field: 'email',
  validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  errorMessage: 'Invalid email format',
  severity: 'error'
});

engine.registerRule({
  name: 'age_range',
  field: 'age',
  validator: (value) => value >= 0 && value <= 150,
  errorMessage: 'Age must be between 0 and 150',
  severity: 'warning'
});
```

### 3. 使用内置规则

```javascript
const { BuiltInRules } = require('./deerflow_enhanced.js');

const engine = new VerificationEngine();

// 必填
engine.registerRule(BuiltInRules.required('name', 'Name is required'));

// 类型
engine.registerRule(BuiltInRules.typeOf('age', 'number', 'Age must be a number'));

// 范围
engine.registerRule(BuiltInRules.range('age', 0, 150));

// 长度
engine.registerRule(BuiltInRules.length('name', 1, 100));

// 格式
engine.registerRule(BuiltInRules.format('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/));
```

### 4. 自定义验证器

```javascript
engine.registerRule({
  name: 'adult_check',
  field: 'age',
  validator: (value) => value >= 18,
  errorMessage: 'Must be at least 18 years old',
  severity: 'error'
});

engine.registerRule({
  name: 'unique_email',
  field: 'email',
  validator: async (value) => {
    const exists = await checkEmailInDatabase(value);
    return !exists;
  },
  errorMessage: 'Email already exists',
  severity: 'error'
});
```

### 5. 验证结果

```javascript
const result = engine.verify(data);

console.log(`
通过: ${result.passed}
错误数: ${result.errorCount}
警告数: ${result.warningCount}
信息数: ${result.infoCount}

错误详情:
${result.errors.map(e => `- ${e.field}: ${e.message}`).join('\n')}
`);

console.log(result.toJSON());
```

### 6. 规则组

```javascript
// 创建规则组
engine.createRuleGroup('strict', ['name_required', 'email_format', 'age_range']);
engine.createRuleGroup('loose', ['name_required']);

// 使用规则组验证
const strictResult = engine.verify(data, { group: 'strict' });
const looseResult = engine.verify(data, { group: 'loose' });
```

### 7. 快速失败

```javascript
// 遇到第一个错误就停止
const result = engine.verify(data, { failFast: true });
```

## 集成示例

```javascript
// API请求验证
async function validateRequest(req, res, next) {
  const result = engine.verify(req.body);
  
  if (!result.passed) {
    return res.status(400).json({
      success: false,
      errors: result.errors,
      warnings: result.warnings
    });
  }
  
  next();
}

// 数据导入验证
async function validateImport(data) {
  const results = [];
  
  for (const item of data) {
    const result = engine.verify(item, { context: { importId } });
    results.push({
      item,
      passed: result.passed,
      errors: result.errors
    });
  }
  
  return results.filter(r => !r.passed);
}
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
