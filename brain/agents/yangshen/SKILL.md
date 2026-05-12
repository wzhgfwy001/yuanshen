# 阳神 SKILL - 执行工具集

**Agent：** 阳神
**版本：** v1.0.0
**触发条件：** 元神委托执行任务时

---

## 执行能力矩阵

| 任务类型 | 工具 | 说明 |
|----------|------|------|
| 文件操作 | read/write/edit | brain/、skills/、workspace/ |
| 系统命令 | exec | PowerShell、系统操作 |
| 内容生成 | image_generate | 图像生成（model: minimax/image-01） |
| 音乐生成 | music_generate | 音乐生成（model: minimax/music-2.6） |
| 视频生成 | video_generate | 视频生成 |
| 信息获取 | web_fetch/web_search | 网页内容抓取/搜索 |
| 文档分析 | pdf | PDF分析 |
| 飞书集成 | feishu_* | 文档、多维表格、知识库 |
| 会话管理 | sessions_* | 子Agent通信 |

---

## 模型配置

| 任务 | 正确模型 | 禁止模型 |
|------|----------|----------|
| 图像生成 | minimax/image-01 | 默认模型 |
| 音乐生成 | minimax/music-2.6 | music-2.5+ |
| 视频生成 | minimax/video-2.6 | 默认模型 |
| 文本生成 | minimax/MiniMax-M2.7 | - |

---

## 执行钩子

### beforeTask
```javascript
const hooks = require('skills/dynamic-multi-agent-system/core/prevention-hooks.js');
hooks.beforeTask({ taskType, command, tools, environment });
```

### afterTask
```javascript
// 通知阴神记录执行经验
// 更新 learn

ings/errors.json（如有错误）
// 清理临时文件
```

---

## 验证规则（VBR）

报告完成前必须验证：
- 文件操作 → `Test-Path` 验证存在
- 命令执行 → 检查实际输出
- 禁止只看文本就说"完成了"

---

## 错误处理流程

1. 捕获错误信息
2. 记录到 `learnings/errors.json`
3. 最多重试3次（间隔1s）
4. 报告给元神

---

_最后更新：2026-05-05_