# Verification Module - 验证机制

## 概述

Verify Before Reporting (VBR) 验证机制模块。确保所有"完成"报告前都经过实际验证，不依赖纯文本输出。

## 核心原则

1. **不只看文本** — 验证实际行为和结果
2. **证明机制生效** — 报告完成前必须有验证步骤
3. **多维度验证** — 文件、命令、API返回都要验证

## 验证类型

### 1. 文件验证
```javascript
// 检查文件是否存在
Test-Path <file_path>

// 检查文件内容
Get-Content <file_path> | Select-Object -First 10

// 检查文件大小
(Get-Item <file_path>).Length
```

### 2. 命令执行验证
```javascript
// 验证命令返回码
$LASTEXITCODE

// 验证输出内容
<command> | Select-String <expected_pattern>
```

### 3. API/服务验证
```javascript
// 验证API返回数据结构
$response = Invoke-RestMethod ...
$response.PSObject.Properties.Name.Contains(<expected_field>)
```

### 4. 子Agent产出验证
```javascript
// 验证子Agent创建的文件存在
Test-Path <agent_output_file>

// 验证输出格式正确
<output_file> | ConvertFrom-Json
```

## VBR检查清单

**每次报告"完成"前必须检查：**

- [ ] 预期的文件已创建？
- [ ] 文件内容符合预期？
- [ ] 命令执行成功（exit code = 0）？
- [ ] 输出结果包含关键信息？
- [ ] 副作用（如果预期有）确实发生了？

## 集成到工作流

```
任务执行 → 验证步骤 → 报告完成
    ↓           ↓
  不跳过    必须通过
```

### 示例流程

1. **任务：** 创建配置文件
2. **执行：** `New-Item -ItemType File -Path config.json`
3. **验证：** `Test-Path config.json` → `True`
4. **报告：** "✅ 配置文件已创建并验证"

## 不验证就报告的后果

- 实际问题被忽略
- 用户得到错误信息
- 信任度下降
- 需要返工

---

_此模块为 v1.9.0 VBR 规则的核心实现_

---

# 验证闭环机制 (Verification Loop)

## 概述

验证闭环机制建立"搭建→验证→反馈"的工作流，确保每次配置变更后都能自动验证是否生效。

## 核心组件

### 1. 闭环验证器 (`闭环验证器.js`)

负责执行具体验证逻辑：

| 方法 | 功能 |
|------|------|
| `verifySetup(skillName)` | 验证技能SKILL.md配置是否正确加载 |
| `verifyMapping()` | 验证category-mapping是否生效 |
| `verifyToolChain()` | 验证工具链是否完整 |
| `generateVerificationReport()` | 生成结构化验证报告 |

### 2. 自动验证Hook (`auto-verify-hook.js`)

任务完成时自动触发验证：

```javascript
const { onTaskComplete, trigger } = require('./auto-verify-hook');

// 任务完成后调用
await onTaskComplete({ name: '创建技能', skillName: 'my-skill', success: true });

// 手动触发验证
await trigger('dynamic-multi-agent-system', { verbose: true });
```

### 3. 验证日志 (`state/verification-log.json`)

验证结果持久化存储：

```json
[
  {
    "id": "hook_123456789_abc",
    "timestamp": "2026-04-17T09:30:00.000Z",
    "hookType": "task_complete",
    "skillName": "dynamic-multi-agent-system",
    "verification": {
      "passed": [...],
      "failed": [...],
      "summary": { "successRate": 95 }
    },
    "success": true
  }
]
```

## 使用流程

```
1. 搭建/修改配置
       ↓
2. 自动触发验证 (onTaskComplete)
       ↓
3. 执行 verifySetup / verifyMapping / verifyToolChain
       ↓
4. 生成验证报告
       ↓
5. 结果写入 verification-log.json
       ↓
6. 根据结果决定下一步
```

## 验证结果结构

详见 `verification.schema.json`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `passed` | array | 通过的验证项 |
| `failed` | array | 失败的验证项 |
| `warnings` | array | 警告（非致命） |
| `suggestions` | array | 改进建议 |
| `summary` | object | 汇总统计 |

## 集成方式

### 在任务完成后自动验证

```javascript
const { onTaskComplete } = require('./core/verification/auto-verify-hook');

// 任务执行完毕后
async function completeTask(task) {
    const result = await executeTask(task);
    
    // 触发验证
    const verifyResult = await onTaskComplete({
        name: task.name,
        skillName: task.skillName,
        success: result.success
    });
    
    return verifyResult;
}
```

### 手动运行验证

```bash
node core/verification/auto-verify-hook.js verify dynamic-multi-agent-system
```

### 查看验证历史

```bash
node core/verification/auto-verify-hook.js history 20
```

## 验证状态码

| 状态 | 说明 |
|------|------|
| `success` | 全部通过 |
| `partial` | 部分失败（<30%） |
| `failed` | 大量失败（≥30%） |
| `critical` | 系统级故障 |

## 生产就绪判断

满足以下条件时视为"可用于生产"：
- `failedCount === 0`
- `warningCount < 3`

---

_验证闭环机制 v1.0.0 - 2026-04-17_
