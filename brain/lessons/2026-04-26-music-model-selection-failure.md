# 失败教训 - MiniMax音乐模型选择错误（music-2.5+ vs music-2.6）

**时间：** 2026-04-26T02:00:00.000Z
**任务：** 生成米津玄師风格日文歌曲
**任务类型：** music_generation

## 失败模式

music_model_wrong_version + default_model_used + token_plan_not_supported + music-2.5+_selected_instead_of_2.6

## 发生场景

music_generation MiniMax API model_selection error song_creation image_generation

## 根因

1. **使用了默认模型** - 调用 music_generate 时没有指定模型，系统自动选了 music-2.5+
2. **用户的套餐是 music-2.6** - MiniMax Plus 套餐支持 music-2.6（100次/日），不支持 music-2.5+
3. **没有在任务描述里明确指定模型** - 任务描述里应该写 `model: minimax/music-2.6`
4. **教训没有被记录** - 这个错误之前已经发生过，但没有被记录到 brain/lessons/，所以预防系统找不到

## 影响范围 10/10 - 任务失败

## 错误信息

```
MiniMax music generation failed (2061): your current token plan not support model, music-2.5+
```

## 解决方案

### 立即修复
在任务描述里明确指定模型：
```javascript
// ✅ 正确：指定 minimax/music-2.6
const result = await music_generate({
    model: "minimax/music-2.6",  // 明确指定
    prompt: "...",
    lyrics: "..."
});

// ❌ 错误：使用默认模型
const result = await music_generate({
    prompt: "...",
    lyrics: "..."
});
```

### 套餐信息（必须记住）

| 模型 | 支持情况 | 每日额度 |
|------|----------|----------|
| minimax/music-2.6 | ✅ 支持 | 100次/日 |
| minimax/music-2.5+ | ❌ 不支持 | - |

## 预防措施

### 1. 任务描述必须包含模型版本
所有 MiniMax 生成类任务，必须在任务描述里明确指定模型：
```
模型：minimax/music-2.6（不是 music-2.5+）
模型：minimax/image-01（不是默认）
```

### 2. 教训必须记录到 brain/lessons/
当发生模型选择错误时，必须：
1. 记录到 `learnings/errors.json`
2. **同时**记录到 `brain/lessons/`（预防系统查询用）
3. 教训文件必须包含正确的 tags 用于查询

### 3. 教训格式要求
```markdown
---
id: lesson-music-model-selection
created_at: 2026-04-26T...
type: model_selection
severity: high
tags: [music_model, minimax, music-2.5+, music-2.6, model_selection]
---

# 失败教训 - 模型选择错误
```

## 关键警示

⚠️ **⚠️ MiniMax API 调用必须指定模型版本**
⚠️ **⚠️ 不能依赖默认模型选择**
⚠️ **⚠️ music-2.5+ 和 music-2.6 是不同的模型**
⚠️ **⚠️ 教训必须记录到 brain/lessons/ 否则预防系统找不到**

## 相关教训

- 2026-04-26-parallel-execution.md（并行执行）
- learnings/errors.json（错误追踪）

## 改进建议

1. 在 AGENTS.md 添加规则：所有生成类任务必须指定模型
2. 创建模型配置速查表（brain/common_knowledge/model-config.md）
3. 预防系统应该同时查询 learnings/errors.json 和 brain/lessons/
