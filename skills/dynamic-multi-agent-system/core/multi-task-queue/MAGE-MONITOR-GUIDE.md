# 🧙 魔法塔队列监控 - 使用指南

**版本：** v1.0  
**主题：** 魔法师主题（女魔法师 + 子灵）  
**创建时间：** 2026-04-05  

---

## 🎯 功能特性

### 核心功能

| 功能 | 说明 |
|------|------|
| 实时监控 | 每 5 秒自动刷新队列状态 |
| 主 Agent 展示 | 女魔法师艾莉娅形象，显示活跃任务/子灵数量 |
| 子 Agent 展示 | 根据任务类型显示不同形象的子灵 |
| 任务跟踪 | 实时显示任务进度和耗时 |
| 资源监控 | 显示子灵使用率和可用槽位 |
| 告警系统 | 高负载时自动告警 |

### 视觉特色

- **星空背景** - 动态闪烁的星星
- **女魔法师** - 黑袍、长发、魔法帽、大圈眼镜的可爱形象
- **六翼天使装饰** - 洁白神圣元素点缀
- **魔法特效** - 进度条流光、卡片悬浮、数字脉冲
- **子灵形象** - 根据角色显示不同 emoji 形象

---

## 🚀 快速启动

### 方式 1：一键启动（推荐）

```bash
# Windows
cd C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\multi-task-queue
start-monitor-mage.bat
```

### 方式 2：手动启动

```bash
# 1. 安装依赖
pip install flask

# 2. 启动后端服务
cd C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\multi-task-queue
python monitor.py

# 3. 打开浏览器访问
http://localhost:5000/monitor-mage.html
```

---

## 📊 API 接口

### 获取队列状态

```http
GET http://localhost:5000/api/queue/status
GET http://localhost:5000/api/queue/status?mock=true  # 演示模式
```

**响应示例：**
```json
{
  "pending": {
    "count": 2,
    "tasks": [...]
  },
  "running": {
    "count": 1,
    "tasks": [...],
    "active_subagents": 4
  },
  "completed": {
    "count": 5,
    "today": 3
  },
  "resources": {
    "available_task_slots": 2,
    "available_subagents": 8,
    "total_subagents": 12,
    "usage_rate": 0.33
  }
}
```

### 获取任务详情

```http
GET http://localhost:5000/api/queue/tasks/<task_id>
```

### 获取子 Agent 列表

```http
GET http://localhost:5000/api/queue/subagents
```

### 获取告警

```http
GET http://localhost:5000/api/queue/alerts?timeout=300
```

### 初始化演示数据

```http
GET http://localhost:5000/api/queue/demo/init
```

---

## 🎨 子灵形象映射

### 写作类任务

| 角色 | 形象 |
|------|------|
| 世界观架构师 | 🏰 |
| 大纲设计师 | 📐 |
| 角色塑造师 | 🎭 |
| 剧情编织者 | 🕸️ |
| 文字炼金师 | ⚗️ |
| 审查官 | 🔍 |

### 分析类任务

| 角色 | 形象 |
|------|------|
| 数据分析师 | 📊 |
| 趋势预测师 | 🔮 |
| 策略顾问 | 💡 |
| 报告撰写师 | 📝 |

### 创意类任务

| 角色 | 形象 |
|------|------|
| 创意总监 | 🎨 |
| 视觉设计师 | 🖼️ |
| 音效设计师 | 🎵 |
| 体验设计师 | 🎮 |

### 技术类任务

| 角色 | 形象 |
|------|------|
| 架构师 | 🏗️ |
| 开发工程师 | 💻 |
| 测试工程师 | 🧪 |
| 运维工程师 | ⚙️ |

---

## 🎯 监控面板说明

### 主 Agent 区域

显示女魔法师艾莉娅的形象和统计信息：

- **活跃任务** - 当前正在执行的任务数
- **召唤子灵** - 活跃的子 Agent 数量
- **施法成功率** - 任务完成率
- **魔力储备** - 系统资源余量

### 仪表盘卡片

1. **待处理队列** ⏳ - 等待执行的任务
2. **施法中任务** ✨ - 正在执行的任务
3. **今日完成** ✅ - 今天完成的任务数
4. **可用施法槽位** 🎯 - 剩余并发槽位
5. **子灵使用率** 🧙 - 子 Agent 使用百分比
6. **魔法塔状态** 💎 - 系统整体状态

### 子灵展示区

显示当前活跃的子 Agent，每个子灵卡片包含：

- 角色形象 emoji
- 角色名称
- 工作状态（施法中/空闲）

### 任务详情表

显示运行中任务的详细信息：

- 卷轴 ID（任务 ID）
- 任务名称
- 状态徽章
- 子灵数量
- 进度条
- 已用时长

---

## ⚙️ 配置选项

### 系统限制（在 monitor.py 中配置）

```python
MAX_CONCURRENT_TASKS = 3      # 最大并发任务数
MAX_SUBAGENTS = 12            # 最大子 Agent 总数
MAX_SUBAGENTS_PER_TASK = 6    # 单任务最大子 Agent 数
```

### 告警阈值

| 指标 | 阈值 | 告警级别 |
|------|------|----------|
| 子灵使用率 | >90% | 🔴 魔力过载 |
| 子灵使用率 | >70% | 🟠 高负荷 |
| 待处理任务 | >10 个 | ⚠️ 警告 |
| 任务超时 | >60 分钟 | ⚠️ 警告 |
| 子灵超时 | >5 分钟 | ⚠️ 警告 |

---

## 🔧 故障排除

### 问题 1：Flask 未安装

**错误信息：** `ModuleNotFoundError: No module named 'flask'`

**解决方案：**
```bash
pip install flask
```

### 问题 2：端口被占用

**错误信息：** `Address already in use`

**解决方案：**
```bash
# 修改 monitor.py 中的端口号
app.run(debug=True, port=5001, host='0.0.0.0')
```

### 问题 3：页面无法访问

**检查步骤：**
1. 确认 Flask 服务已启动
2. 检查防火墙设置
3. 尝试访问 `http://127.0.0.1:5000/`

### 问题 4：数据不刷新

**检查步骤：**
1. 打开浏览器开发者工具（F12）
2. 查看 Console 是否有错误
3. 检查 Network 标签 API 请求状态

---

## 🎨 自定义主题

### 修改主 Agent 形象

编辑 `monitor-mage.html` 中的 SVG 部分：

```html
<!-- 女魔法师 SVG 形象 -->
<svg class="mage-svg" viewBox="0 0 200 200">
  <!-- 修改这里的图形 -->
</svg>
```

### 修改配色方案

在 CSS 中修改主题色：

```css
/* 主色调 */
--primary-color: #e94560;  /* 魔法红 */
--secondary-color: #a855f7;  /* 神秘紫 */
--accent-color: #22c55e;  /* 生命绿 */
```

### 添加新的子灵形象

在 JavaScript 中扩展 `SUBAGENT_AVATARS` 对象：

```javascript
const SUBAGENT_AVATARS = {
  '新角色': '🆕',
  // ... 其他角色
};
```

---

## 📈 性能优化建议

### 前端优化

1. **减少刷新频率** - 改为 10 秒刷新一次
2. **使用 WebSocket** - 实时推送代替轮询
3. **懒加载** - 只加载可见区域的子灵卡片

### 后端优化

1. **数据缓存** - 缓存队列状态，减少计算
2. **异步处理** - 使用异步 IO 提高并发
3. **数据库持久化** - 使用 SQLite 存储历史数据

---

## 🔮 未来计划

### P1 功能（近期）

- [ ] WebSocket 实时推送
- [ ] 历史记录图表
- [ ] 任务甘特图
- [ ] 导出功能（CSV/PDF）

### P2 功能（中期）

- [ ] 多主题切换（魔法/科技/简约）
- [ ] 自定义告警规则
- [ ] 邮件/消息通知
- [ ] API 认证授权

### P3 功能（远期）

- [ ] 3D 可视化效果
- [ ] VR/AR 监控界面
- [ ] AI 预测分析
- [ ] 自动化调度优化

---

## 📞 技术支持

**文档位置：** `C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\multi-task-queue\`

**相关文件：**
- `monitor-mage.html` - 魔法师主题监控页面
- `monitor.py` - 后端 Flask 服务
- `start-monitor-mage.bat` - 一键启动脚本
- `QUEUE-MONITOR.md` - 实现方案文档

---

*魔法塔队列监控使用指南 v1.0*  
*创建时间：2026-04-05*  
*主题：魔法师主题（女魔法师艾莉娅 + 子灵团队）*
