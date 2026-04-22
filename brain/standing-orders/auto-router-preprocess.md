# Auto-Router 预处理 (已简化)

## 状态
⚠️ **已简化** — 2026-04-22 向量数据库卸载后，预处理逻辑已简化为纯关键词匹配。

## 当前逻辑

**每次接收到用户消息时，自动执行预处理：**

1. **调用 auto-router 路由分析**
   ```bash
   node "C:\Users\DELL\.openclaw\workspace\scripts\call-auto-router.js" "<用户消息>"
   ```

2. **解析路由结果**
   - 检查是否识别到技能匹配（关键词匹配）
   - 检查是否有情绪检测结果（frustration-detector）
   - 根据优先级决定处理顺序

3. **决策**
   - 如有 `frustration` 高优先级信号 → 先安抚用户
   - 如有特定技能匹配 → 加载对应 SKILL.md
   - 如无匹配 → 使用通用流程

## 路由能力（关键词匹配）

| 关键词 | 触发技能 | 优先级 |
|--------|----------|--------|
| 代码/审查 | codeReview | normal |
| 博客/文章 | blog | normal |
| 分析/数据 | analysis | normal |
| 规划/项目 | planner | normal |
| 研究/调研 | research | normal |
| 图表/可视化 | visual | normal |
| 小红书 | xiaohongshu | normal |
| 负面情绪 | frustration | **high** |

## 快速命令

```bash
# 测试路由
node "C:\Users\DELL\.openclaw\workspace\scripts\call-auto-router.js" "用户消息"
```

## 文件位置
- 路由核心: `skills/auto-router/auto-router.js`
- 技能中心: `skills/skill-hub/skill-hub.js`
- 命令行入口: `scripts/call-auto-router.js`

## 历史变更

- **2026-04-22**: 向量搜索功能移除（原调用 `D:/vector_db/` 下的 Python 脚本），简化为纯关键词匹配