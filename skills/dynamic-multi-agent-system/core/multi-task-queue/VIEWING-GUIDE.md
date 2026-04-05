# 🎨 可视化监控大屏使用指南

**版本：** v1.0  
**更新时间：** 2026-04-05  

---

## 🌐 访问地址

### 启动服务

```bash
cd C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\multi-task-queue
python -m http.server 5001
```

### 访问监控大屏

**推荐版本：**
```
http://localhost:5001/dashboard-complete.html
```
**特点：** 完整女魔法师形象（魔法帽/长袍/大圈眼镜）+ 六翼天使

**备选版本：**
```
http://localhost:5001/dashboard-ultimate.html
```
**特点：** 次世代高端设计（毛玻璃态 + 高级光晕）

---

## ✨ 功能特性

### 实时监控
- ✅ 任务状态实时更新（每 3 秒刷新）
- ✅ 子 Agent 资源监控
- ✅ 模型用量统计
- ✅ 系统健康度仪表
- ✅ 告警自动推送

### 视觉效果
- ✅ 魔法教堂场景
- ✅ 六翼天使（6 个翅膀 + 金色光环）
- ✅ 女魔法师（魔法帽/长袍/大圈眼镜）
- ✅ 漂浮魔法粒子
- ✅ 彩色玻璃窗（呼吸光晕）
- ✅ 蜡烛火焰（摇曳动画）
- ✅ 悬浮数据框

### 数据面板
- 📊 活跃任务列表（带进度条）
- 📈 圆形仪表（健康度/使用率）
- 📉 模型用量分布
- ⚠️ 告警列表
- 📊 实时指标（总任务/子 Agent/成功率/效率）

---

## 🔧 故障排除

### 问题 1：页面无法访问

**解决方案：**
```bash
# 检查服务是否运行
python -m http.server 5001

# 或使用另一个端口
python -m http.server 5000
# 访问：http://localhost:5000/dashboard-complete.html
```

### 问题 2：动画不流畅

**解决方案：**
1. 开启浏览器硬件加速
2. 使用 Chrome/Edge 120+ 浏览器
3. 清除浏览器缓存（Ctrl+Shift+Delete）
4. 强制刷新页面（Ctrl+F5）

### 问题 3：数据不更新

**解决方案：**
- 检查浏览器 Console（F12）
- 确认 API 接口正常
- 刷新页面重新加载

---

## 📊 数据说明

### 模拟数据（演示用）

当前使用模拟数据展示效果，实际使用时会对接真实 API：

```javascript
// API 接口（待实现）
GET /api/queue/status  // 获取队列状态
GET /api/queue/tasks/<id>  // 获取任务详情
GET /api/queue/subagents  // 获取子 Agent 列表
GET /api/queue/alerts  // 获取告警
```

### 系统集成

监控大屏可集成到 OpenClaw 主界面，或作为独立页面运行。

---

## 🎯 最佳实践

1. **全屏观看** - F11 全屏模式效果更佳
2. **暗色环境** - 关灯后发光效果更好
3. **适当距离** - 距离屏幕 50-70cm
4. **100% 缩放** - 浏览器缩放设为 100%

---

## 📞 技术支持

**文档位置：** `C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\`

**相关文件：**
- `dashboard-complete.html` - 完整版监控大屏
- `dashboard-ultimate.html` - 终极版监控大屏
- `monitor.py` - 后端 API 服务（待启用）

---

*可视化监控大屏使用指南 v1.0*  
*更新时间：2026-04-05*
