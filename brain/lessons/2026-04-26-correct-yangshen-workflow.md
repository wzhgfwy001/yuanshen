# 教训：正确执行阳神系统工作流（2026-04-26）

## 问题描述

之前执行音乐+海报任务时，没有正确使用阳神系统流程。

### 错误做法
```
用户任务
    ↓
主Agent直接 sessions_spawn → 通用子Agent
    ↓
子Agent调用 music_generate + image_generate
    ↓
没有因果链追踪（causalChain未调用）
没有Tracker记录
没有调用orchestrator
```

### 正确做法
```
用户任务
    ↓
主Agent调用 execution-entry.js 或 orchestrator.executeTask()
    ↓
【阳神系统自动执行】:
1. causalChain.start() → 启动因果链追踪
2. preventionHooks.beforeTask() → 预防检查
3. orchestrator.prepareSpawn() → 匹配Agency Agent
4. 主Agent sessions_spawn → 启动子Agent
5. 子Agent完成任务 → 汇报结果
6. 主Agent调用 tracker.increment() → 记录到category-validation-tracker.json
7. 主Agent调用 causalChain.complete() → 完成因果链
```

## 问题根因

1. **没有调用orchestrator** - 直接用sessions_spawn，跳过了阳神核心
2. **没有因果链追踪** - causalChain没有启动和完成
3. **没有Tracker记录** - 没有调用tracker.increment()
4. **没有匹配Agency Agent** - 使用通用子Agent而不是专业的music-composer/designer
5. **任务描述缺少模型配置** - 没有明确指定minimax/music-2.6

## 修复内容

### 1. 创建 execution-entry.js
这是阳神系统的执行入口，确保所有任务都走完整流程：

```javascript
const executor = require('skills/dynamic-multi-agent-system/core/execution-entry.js');

// 在任务中调用
const result = await executor.execute(taskDescription, sessionsSpawnFn, options);
```

### 2. 强制检查清单
每个任务开始前必须确认：
- [ ] 任务描述包含模型配置（minimax/music-2.6等）
- [ ] 调用executor.execute()而不是直接sessions_spawn
- [ ] 因果链已启动（chainId已生成）
- [ ] 预防检查已通过
- [ ] spawn的子Agent有专业的metadata
- [ ] 任务完成后调用tracker.increment()
- [ ] 任务完成后调用causalChain.complete()

### 3. 模型配置速查
| 任务类型 | 正确模型 |
|----------|----------|
| 音乐生成 | minimax/music-2.6 |
| 图像生成 | minimax/image-01 |
| TTS | minimax/speech-2.8-hd |

## 教训总结

| 问题 | 正确做法 |
|------|----------|
| 直接sessions_spawn | 调用 executor.execute() 或 orchestrator.executeTask() |
| 没有因果链 | 启动 causalChain.start()，完成后调用 complete/fail |
| 没有Tracker记录 | 调用 tracker.increment() 记录到 category-validation-tracker.json |
| 没有匹配专业Agent | 使用 orchestrator.prepareSpawn() 获取专业Agent配置 |
| 任务描述缺模型 | 必须在任务描述中明确指定模型（如minimax/music-2.6） |