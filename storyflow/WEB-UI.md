# StoryFlow Web UI 使用指南

## 🚀 快速启动

### 方式一：使用启动脚本（推荐）
```batch
cd C:\Users\DELL\.openclaw\workspace\storyflow
start-web.bat
```

### 方式二：手动启动
```bash
# 设置API Key
set STORYFLOW_API_KEY=你的API密钥

# 启动服务器
python web_server.py
```

### 访问地址
- **本地**: http://localhost:5001
- **局域网**: http://你的IP:5001

---

## 🎨 界面说明

### 左侧面板 - 节点调色板
| 节点 | 功能 |
|------|------|
| 🌍 世界观生成 | 创建世界设定、力量体系、地理环境 |
| 👤 角色生成 | 创建角色档案、外貌、性格、背景 |
| 📋 大纲生成 | 规划情节线、冲突设计、节奏控制 |
| 📖 章节写作 | 生成章节正文 |

### 中央画布
- **拖拽**：从左侧拖拽节点到画布
- **连线**：拖动节点输出端口到另一个节点的输入端口
- **编辑**：点击节点可编辑输入参数
- **移动**：拖动节点可调整位置

### 右侧面板 - 输出预览
- 显示执行结果的JSON格式输出

---

## 📋 工作流程

### 1. 添加API Key
在左侧面板顶部输入你的MiniMax API Key（会保存在本地）

### 2. 构建工作流
```
世界观生成 → 角色生成 → 大纲生成 → 章节写作
```

### 3. 配置节点参数
- 双击节点编辑输入参数
- 例如：世界观节点设置 genre="奇幻", theme="魔法"

### 4. 执行工作流
点击 ▶ 执行工作流 按钮

### 5. 查看结果
执行完成后，右侧面板显示生成结果

---

## 🔧 API端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/nodes` | GET | 获取所有节点类型 |
| `/api/workflow/load` | GET | 加载保存的工作流 |
| `/api/workflow/save` | POST | 保存工作流 |
| `/api/workflow/execute` | POST | 执行工作流 |

---

## 📁 文件结构

```
storyflow/
├── web/
│   └── index.html       # Web UI主页面
├── web_server.py        # Flask API服务器
├── start-web.bat        # Windows启动脚本
├── engine.py            # 核心引擎
├── nodes.py             # 节点定义
└── workflow_config.json # 工作流配置
```

---

## ⚠️ 常见问题

### 1. 执行失败
- 检查API Key是否正确
- 检查网络连接
- 查看浏览器控制台错误信息

### 2. 跨域问题
服务器已配置CORS，应该可以正常工作

### 3. 保存问题
如果API保存失败，会自动保存到浏览器localStorage

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| React Flow | 节点编辑器 |
| Flask | API服务器 |
| httpx | HTTP客户端 |
| MiniMax API | LLM服务 |

---

## 📝 更新日志

### v1.1.0 (2026-04-19)
- 新增 React Flow 可视化编辑器
- 新增拖拽式节点编辑
- 新增实时预览功能
- 支持保存/加载工作流
