---
name: deerflow-diagnosis
description: DeerFlow增强版诊断系统 - 健康检查、性能诊断、问题识别、修复建议
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | diagnosis=true | health_check=true | debugging=true
---

# DeerFlow增强版诊断系统

**【附魔·改】Diagnosis Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 诊断系统 | `diagnosis=true` | 启用诊断 |
| 健康检查 | `health_check=true` | 系统健康检查 |

## 核心功能

### 1. 运行诊断

```javascript
const { Diagnosis } = require('./deerflow_enhanced.js');

const diagnosis = new Diagnosis();

diagnosis.addDiagnostic('memory', { category: 'system' });
diagnosis.addDiagnostic('response_time', { category: 'performance' });
diagnosis.addDiagnostic('error_rate', { category: 'reliability' });

const summary = await diagnosis.runAll();
console.log(summary.overallStatus); // healthy/warning/critical
```

### 2. 获取建议

```javascript
console.log(summary.recommendations);
// [
//   { priority: 'high', diagnostic: 'memory', message: '...', action: '...' },
//   ...
// ]
```

### 3. 历史记录

```javascript
const history = diagnosis.getHistory(10);
const latest = diagnosis.getStatus();
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
