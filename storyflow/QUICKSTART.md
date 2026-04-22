# StoryFlow 5分钟快速开始

## 🚀 快速上手

### Step 1: 安装 (30秒)

```bash
pip install -r requirements.txt
```

### Step 2: 配置API Key (10秒)

```bash
# Windows
set STORYFLOW_API_KEY=your-api-key

# Linux/Mac
export STORYFLOW_API_KEY=your-api-key
```

**API Key获取:**
- **MiniMax**: https://platform.minimaxi.com/
- **通义千问**: https://dashscope.console.aliyun.com/

### Step 3: 启动服务 (20秒)

```bash
# Windows
.\start.bat

# Linux/Mac
chmod +x start.sh && ./start.sh

# 或直接运行
python -m src.api.web_server
```

### Step 4: 打开浏览器

访问: **http://localhost:5001**

---

## ✅ 快速测试工作流

启动后，Web UI会自动加载默认工作流。点击"运行"即可测试5-Agent协作流程。

---

## ⚡ 一键启动脚本

| 脚本 | 平台 | 说明 |
|------|------|------|
| `start.bat` | Windows | 启动Web服务 |
| `start.sh` | Linux/Mac | 启动Web服务 |
| `start-server-api.bat` | Windows | 仅API服务 |
| `start-web-fastapi.bat` | Windows | FastAPI服务 |

---

## 🔧 默认配置说明

默认工作流配置位于 `config/default_config.json`：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| provider | minimax | 模型提供商 |
| model | MiniMax-M2.7 | 模型名称 |
| temperature | 0.7 | 生成温度 |
| audit_dimensions | 33 | 审计维度数 |

---

## ❓ 遇到问题？

1. **端口被占用**: 修改 `config/default_config.json` 中的 `server.port`
2. **API Key无效**: 确认Key已正确设置且有余额
3. **依赖安装失败**: 使用 `pip install --upgrade -r requirements.txt`

更多帮助见 [INSTALL.md](INSTALL.md)
