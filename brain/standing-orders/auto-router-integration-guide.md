# Auto-Router 集成指南 (已简化)

## 当前状态
✅ **已简化** — 2026-04-22 向量数据库卸载后，集成逻辑简化为纯关键词路由。

## 已完成的工作

1. ✅ **创建调用脚本**: `scripts/call-auto-router.js`
2. ✅ **测试验证**: 脚本可以正确调用auto-router并返回分析结果
3. ✅ **简化Standing Order**: 移除向量搜索依赖

## 路由能力

Auto-Router 可以识别（纯关键词匹配）:

| 关键词 | 触发技能 | 优先级 |
|--------|----------|--------|
| 代码/review/审查 | codeReview | normal |
| 博客/文章/写一篇 | blog | normal |
| 分析/数据/统计 | analysis | normal |
| 规划/计划/项目 | planner | normal |
| 研究/调研/调查 | research | normal |
| 图表/可视化/dashboard | visual | normal |
| 小红书/种草 | xiaohongshu | normal |
| 负面情绪 | frustration | **high** |

## 使用方式

### 手动测试
```bash
node scripts/call-auto-router.js "用户消息"
```

### 代码集成
```javascript
const autoRouter = require('./skills/auto-router.js');
const result = autoRouter.route('用户消息');
// 返回: { recommendations: [...] }
```

## 向量搜索移除历史

**2026-04-22**: 以下功能已移除：
- `D:/vector_db/` 目录已删除
- `vector-search.js` 已删除
- `auto-trigger-sync.js` 已删除
- `file-watcher.js` 等已删除
- 所有调用 `python D:/vector_db/*.py` 的逻辑已移除

现在使用纯关键词匹配 + 情绪检测进行路由。

## 验证测试

已测试消息:
- ✅ "帮我分析数据" → 识别为 analysis
- ✅ "审查这段代码有没有bug" → 识别为 codeReview
- ✅ "你好，请帮我写一篇博客文章" → 识别为 blog
- ✅ "太慢了！" → 识别为 frustration (高优先级)