# Standing Order: Auto-Router 预处理

## 触发条件
每次接收到用户消息时，自动执行预处理

## 预处理步骤

1. **调用 auto-router 分析**
   ```bash
   node "C:\Users\DELL\.openclaw\workspace\scripts\call-auto-router.js" "<用户消息>"
   ```

2. **解析路由结果**
   - 检查是否识别到技能匹配
   - 检查是否有情绪检测结果
   - 根据优先级决定是否需要先处理情绪

3. **决策**
   - 如有 `frustration` 高优先级信号 → 先安抚用户
   - 如有特定技能匹配 → 加载对应 SKILL.md
   - 如无匹配 → 使用通用流程

## 快速命令

```bash
# 测试路由
node "C:\Users\DELL\.openclaw\workspace\scripts\call-auto-router.js" "用户消息"
```

## 文件位置
- 路由脚本: `scripts/call-auto-router.js`
- 路由核心: `skills/auto-router.js`
- 技能中心: `skills/skill-hub/skill-hub.js`
