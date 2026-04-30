# 教训：预防系统必须从警告升级为机械拦截

**日期：** 2026-04-26
**类型：** 系统行为约束升级

## 问题描述

主Agent总是绕过阳神系统，直接调用生成工具。AGENTS.md中写了规则，但只是文字描述，没有机械阻止机制。

### 违反记录
- **时间：** 2026-04-26 多次
- **问题：** 写了规则但不执行
- **原因：** 没有强制执行机制

## 解决方案

### 修改 prevention-hooks.js

**之前（警告模式）：**
```javascript
if (!check.allowed) {
    console.log('⚠️ 警告: 直接调用生成工具将被阻止！'); // 只是警告
}
```

**现在（机械拦截）：**
```javascript
if (!check.allowed) {
    const error = new Error('[PreventionHooks] ⛔ 机械拦截...');
    error.code = 'ORCHESTRATOR_NOT_CALLED';
    throw error;  // 机械拦截，停止执行
}
```

### AGENTS.md 添加执行前检查清单

```markdown
【执行前检查】
□ 1. 任务需要几个工具？
□ 2. 其中是否有 music_generate / image_generate / video_generate？
□ 3. 工具数是否 ≥2？
□ 4. 如果满足以上任一条件 → 必须先调用 orchestrator.executeTask()
□ 5. orchestrator已调用？ → 是：继续 / 否：【机械拦截】
```

## 教训总结

| 教训 | 说明 |
|------|------|
| 规则 + 无强制 = 无效 | 只写规则但不执行没有意义 |
| 警告不够 | 需要机械拦截才能改变行为 |
| 检查清单帮助执行 | 明确的步骤列表比模糊规则更有效 |

## 验证方法

下次执行任务时检查：
1. 是否在调用工具前执行了检查清单？
2. prevention-hooks 是否被调用？
3. orchestrator 是否被调用？