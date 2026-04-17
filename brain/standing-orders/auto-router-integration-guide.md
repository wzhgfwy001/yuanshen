# Auto-Router 集成指南

## 已完成的工作

1. ✅ **创建调用脚本**: `scripts/call-auto-router.js`
2. ✅ **测试验证**: 脚本可以正确调用auto-router并返回分析结果
3. ✅ **创建Standing Order**: `brain/standing-orders/auto-router-preprocess.md`

## 如何使用

### 1. 手动测试
```bash
node scripts/call-auto-router.js "用户消息"
```

### 2. 在对话流程中集成

**推荐流程:**
```
用户消息 → 调用auto-router → 分析结果 → 决策 → 执行
```

**示例代码:**
```javascript
const { execSync } = require('child_process');
const path = require('path');

function preprocessMessage(userMessage) {
  const scriptPath = path.join(__dirname, 'scripts', 'call-auto-router.js');
  const result = execSync(`node "${scriptPath}" "${userMessage}"`, {
    encoding: 'utf8'
  });
  
  // 解析结果
  const lines = result.split('\n');
  // 提取关键信息...
  return parseRouterResult(lines);
}
```

### 3. Standing Order 指令

**每次对话前执行:**
1. 获取用户消息
2. 运行 `node scripts/call-auto-router.js "<消息>"`
3. 根据输出决定:
   - 如有 `frustration` 高优先级 → 先安抚情绪
   - 如有技能匹配 → 加载对应 SKILL.md
   - 如无匹配 → 通用处理

## 路由能力

Auto-Router 可以识别:

| 关键词 | 触发技能 | 优先级 |
|--------|----------|--------|
| 代码/审查 | codeReview | normal |
| 博客/文章 | blog | normal |
| 分析/数据 | analysis | normal |
| 规划/项目 | planner | normal |
| 研究/调研 | research | normal |
| 图表/可视化 | visual | normal |
| 小红书 | xiaohongshu | normal |
| 负面情绪 | frustration | high |

## 验证测试

已测试消息:
- ✅ "帮我分析数据" → 识别为 analysis
- ✅ "审查这段代码有没有bug" → 识别为 codeReview
- ✅ "你好，请帮我写一篇博客文章" → 识别为 blog
- ✅ "太慢了！" → 识别为 frustration (高优先级)

## 注意事项

1. **情绪状态持久化**: frustration-detector 会保持状态，影响后续消息
2. **技能加载**: 需要确保所有技能文件存在
3. **错误处理**: 脚本包含基本的错误处理

## 下一步

1. 在主对话流程中集成预处理
2. 创建自动化测试套件
3. 优化路由准确率
4. 添加更多技能识别
