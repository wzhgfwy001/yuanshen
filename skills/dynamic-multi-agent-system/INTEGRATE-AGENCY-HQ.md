# 🔗 集成 Agency HQ 可视化指南

**版本：** v1.0  
**更新时间：** 2026-04-05  
**目标：** 将 Agency HQ 像素可视化集成到混合动态多 Agent 系统

---

## 📋 集成方案

### 方案 A：独立运行（推荐）

**优点：**
- ✅ 保持 Agency HQ 完整性
- ✅ 功能最全（6 个房间、Agent 聊天等）
- ✅ 独立更新维护
- ✅ 可以嵌入 iframe 到任何地方

**步骤：**

1. **安装 Agency HQ**
```bash
cd D:\agency-hq-1.0.0
npm install
```

2. **配置 Live 模式**
```bash
# 复制环境变量
copy .env.example .env.local

# 编辑 .env.local
ARENA_MODE=live
HOME=C:\Users\DELL
OPENCLAW_HOME=C:\Users\DELL\.openclaw
```

3. **启动服务**
```bash
npm run dev
```

4. **访问地址**
- http://localhost:3000

---

### 方案 B：集成到 Skill 包

**优点：**
- ✅ 作为一个整体提交 SkillHub
- ✅ 统一管理
- ✅ 用户一键安装

**步骤：**

1. **复制 Agency HQ 到 Skill 包**
```bash
# 将 Agency HQ 复制到 Skill 包的 core 目录
xcopy /E /I /Y D:\agency-hq-1.0.0 "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-hq"
```

2. **更新 manifest.json**
```json
{
  "name": "dynamic-multi-agent-system",
  "version": "1.1.0",
  "dependencies": [
    "agency-hq"
  ],
  "capabilities": [
    "task-decomposition",
    "subagent-management",
    "quality-control",
    "skill-evolution",
    "multi-task-orchestration",
    "pixel-visualization"  // 新增
  ]
}
```

3. **创建集成启动脚本**
```bash
# core/agency-hq/start-integrated.bat
@echo off
echo 启动 Agency HQ 可视化...
cd /d "%~dp0"
npm install
npm run dev
```

4. **更新 README.md**
添加 Agency HQ 使用说明和截图

---

### 方案 C：iframe 嵌入（最简单）

**优点：**
- ✅ 无需修改代码
- ✅ 保持独立性
- ✅ 可以随时切换

**步骤：**

1. **在监控大屏页面添加 iframe**

创建新文件 `dashboard-agency-hq.html`：

```html
<!DOCTYPE html>
<html>
<head>
  <title>Agency HQ - Agent 可视化</title>
  <style>
    body { margin: 0; padding: 0; }
    iframe { width: 100%; height: 100vh; border: none; }
  </style>
</head>
<body>
  <iframe src="http://localhost:3000" frameborder="0"></iframe>
</body>
</html>
```

2. **访问新页面**
- http://localhost:5001/dashboard-agency-hq.html

---

## 🎯 推荐方案

**推荐：方案 A（独立运行）+ 方案 C（iframe 嵌入）结合**

**理由：**
1. Agency HQ 独立运行，功能完整
2. 可以通过 iframe 嵌入到任何地方
3. 保持代码独立，易于更新
4. 用户可以单独访问或嵌入访问

---

## 📦 文件结构调整

### 当前结构
```
skills/dynamic-multi-agent-system/
├── core/
│   ├── multi-task-queue/
│   │   ├── dashboard-complete.html  ← 当前版本
│   │   └── dashboard-ultimate.html  ← 当前版本
│   └── ...
└── ...
```

### 集成后结构
```
skills/dynamic-multi-agent-system/
├── core/
│   ├── agency-hq/              ← 新增（Agency HQ 独立目录）
│   │   ├── src/
│   │   ├── package.json
│   │   └── start.bat
│   ├── multi-task-queue/
│   │   ├── dashboard-agency-hq.html  ← 新增（iframe 嵌入版）
│   │   └── VIEWING-GUIDE.md    ← 更新
│   └── ...
├── INTEGRATE-AGENCY-HQ.md      ← 新增（本文件）
└── README.md                   ← 更新
```

---

## 🔧 具体实施步骤

### 步骤 1：复制 Agency HQ 到 Skill 包

```powershell
# 复制 Agency HQ 到 core 目录
xcopy /E /I /Y "D:\agency-hq-1.0.0" "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-hq"
```

### 步骤 2：创建 iframe 嵌入页面

创建 `core/multi-task-queue/dashboard-agency-hq.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏢 Agency HQ - Agent 像素办公室</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: #0a0a0f;
            color: #fff;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2d1b4e, #1a1a2e);
            padding: 20px;
            border-bottom: 2px solid #8b5cf6;
        }
        .header h1 {
            font-size: 24px;
            color: #8b5cf6;
        }
        .header p {
            font-size: 14px;
            color: rgba(255,255,255,0.7);
            margin-top: 8px;
        }
        .container {
            height: calc(100vh - 80px);
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        .controls {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }
        .btn {
            background: #8b5cf6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
        }
        .btn:hover {
            background: #7c3aed;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏢 Agency HQ - Agent 像素办公室</h1>
        <p>实时查看 Agent 在办公室、会议室、厨房、游戏室的活动状态</p>
    </div>
    
    <div class="container">
        <iframe src="http://localhost:3000" frameborder="0"></iframe>
    </div>
    
    <div class="controls">
        <button class="btn" onclick="window.open('http://localhost:3000', '_blank')">
            🚀 在新窗口打开
        </button>
    </div>
    
    <script>
        // 检查 Agency HQ 是否运行
        fetch('http://localhost:3000')
            .then(response => {
                if (!response.ok) {
                    alert('⚠️ Agency HQ 未运行！\n\n请先启动：\ncd D:\\agency-hq-1.0.0\nnpm install\nnpm run dev');
                }
            })
            .catch(() => {
                alert('⚠️ 无法连接到 Agency HQ！\n\n请确保服务正在运行：\nnpm run dev');
            });
    </script>
</body>
</html>
```

### 步骤 3：更新使用指南

更新 `core/multi-task-queue/VIEWING-GUIDE.md`，添加 Agency HQ 使用说明。

### 步骤 4：更新 README.md

在 Skill 包的 README.md 中添加 Agency HQ 可视化部分。

---

## 🎮 使用方式

### 方式 1：独立访问
```bash
cd D:\agency-hq-1.0.0
npm install
npm run dev
# 访问 http://localhost:3000
```

### 方式 2：通过 Skill 包访问
```bash
cd C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-hq
npm install
npm run dev
# 访问 http://localhost:3000
```

### 方式 3：通过 iframe 嵌入页面
```bash
cd C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\multi-task-queue
python -m http.server 5001
# 访问 http://localhost:5001/dashboard-agency-hq.html
```

---

## 📊 功能对比

| 功能 | 之前版本 | Agency HQ |
|------|----------|-----------|
| 房间数量 | 1 个（教堂） | 6 个（办公室/会议室/厨房/游戏室/服务器室/休息室） |
| Agent 动画 | 简单漂浮 | 行走/工作/聊天/睡觉 |
| 实时状态 | 手动刷新 | 自动检测 |
| 活动信息流 | 简单列表 | 完整时间线 |
| Agent 聊天 | 无 | 个性化对话 |
| 统计面板 | 基础指标 | 排行榜 + 系统统计 |
| 昼夜循环 | 无 | 有 |
| 移动端 | 响应式 | 响应式 |
| 依赖 | 无 | Node.js + npm |

---

## ✅ 集成检查清单

- [ ] 复制 Agency HQ 到 core/agency-hq
- [ ] 创建 dashboard-agency-hq.html（iframe 嵌入版）
- [ ] 更新 VIEWING-GUIDE.md
- [ ] 更新 README.md
- [ ] 测试独立运行
- [ ] 测试 iframe 嵌入
- [ ] 提交 SkillHub 更新

---

## 🚀 立即执行

**你想用哪个方案？**

1. **方案 A** - 独立运行（最简单）
2. **方案 B** - 完全集成到 Skill 包
3. **方案 C** - iframe 嵌入页面

**告诉我你的选择，我来帮你实施！** 🎯

---

*集成指南 v1.0*  
*创建时间：2026-04-05*  
*状态：🟡 准备实施*
