# StoryFlow - 智能小说创作工作流引擎

**版本**: v1.2.0 | **更新**: 2026-04-20  
**核心**: 多Agent协作 · 33维度审计 · AI痕迹检测 · 真相文件驱动

---

## 🎯 一句话介绍

StoryFlow 是基于 Python 的**智能小说创作工作流引擎**，通过 5-Agent 协作实现高质量小说创作。

---

## ✨ 核心功能亮点

| 功能 | 说明 |
|------|------|
| **5-Agent 协作** | Radar → Architect → Writer → Auditor → Reviser 流水线 |
| **33维度审计** | 从世界观、人物、情节、风格等33个维度全面审计 |
| **AI痕迹检测** | 自动检测并移除AI生成痕迹 |
| **真相文件驱动** | CurrentState、CharacterMatrix、PendingHooks 驱动创作 |
| **多模型支持** | MiniMax、通义千问、OpenAI 等 |
| **Web UI** | 浏览器可视化编辑工作流 |

---

## 🚀 3步快速开始

```bash
# 1. 安装
pip install -r requirements.txt

# 2. 设置API Key
set STORYFLOW_API_KEY=your-key     # Windows
export STORYFLOW_API_KEY=your-key  # Linux/Mac

# 3. 启动
python -m src.api.web_server
# 打开 http://localhost:5001
```

---

## 📦 安装方式

| 方式 | 命令 |
|------|------|
| **Python** | `pip install -r requirements.txt` |
| **Docker** | `docker-compose up` |
| **Windows脚本** | `.\start.bat` |
| **Linux/Mac** | `./start.sh` |

---

## 🖥️ 产品截图

```
┌─────────────────────────────────────────────────┐
│  StoryFlow Web UI                               │
├─────────────────────────────────────────────────┤
│  [Radar] → [Architect] → [Writer]              │
│       ↓           ↓           ↓                │
│  [Auditor] ←────────── [Reviser]               │
│                                                 │
│  33维度质量审计 · AI痕迹检测 · 真相文件驱动     │
└─────────────────────────────────────────────────┘
```

---

## 💼 商业授权

| 版本 | 用途 | 价格 |
|------|------|------|
| **个人版** | 个人创作 | 免费 |
| **专业版** | 小型工作室 | ¥299/月 |
| **企业版** | 团队协作 | 联系我们 |

详细方案见 [COMMERCIAL.md](COMMERCIAL.md)

---

## 📚 文档导航

- [快速开始](QUICKSTART.md) - 5分钟上手
- [安装指南](INSTALL.md) - 详细安装说明
- [部署指南](DEPLOY.md) - 服务器部署
- [商业方案](COMMERCIAL.md) - 授权与定价

---

## 🧪 测试

```bash
pytest tests/ -v
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)
