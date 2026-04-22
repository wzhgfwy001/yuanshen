# StoryFlow 部署指南

## 目录
- [本地部署](#本地部署)
- [服务器部署](#服务器部署)
- [Docker部署](#docker部署)
- [环境变量配置](#环境变量配置)

---

## 本地部署

### Windows

```batch
# 克隆项目
git clone <repository-url>
cd storyflow

# 安装依赖
pip install -r requirements.txt

# 设置API Key
set STORYFLOW_API_KEY=your-api-key

# 启动
.\start.bat
```

### Linux/Mac

```bash
# 克隆项目
git clone <repository-url>
cd storyflow

# 安装依赖
pip install -r requirements.txt

# 设置API Key
export STORYFLOW_API_KEY=your-api-key

# 启动
chmod +x start.sh
./start.sh
```

---

## 服务器部署

### 依赖环境
- Python 3.10+
- Nginx (反向代理)
- Gunicorn/Uvicorn (WSGI服务器)

### 步骤

```bash
# 1. 安装Python环境
sudo apt update
sudo apt install python3.10 python3-pip

# 2. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量
export STORYFLOW_API_KEY=your-api-key
export STORYFLOW_HOST=0.0.0.0
export STORYFLOW_PORT=5001

# 5. 使用Gunicorn启动
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 src.api.web_server:app

# 6. Nginx反向代理配置
sudo tee /etc/nginx/sites-available/storyflow << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/storyflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Docker部署

### Docker Compose (推荐)

```yaml
# docker-compose.yml
version: '3.8'
services:
  storyflow:
    build: .
    ports:
      - "5001:5001"
    environment:
      - STORYFLOW_API_KEY=${STORYFLOW_API_KEY}
      - MINIMAX_API_KEY=${MINIMAX_API_KEY}
      - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
    volumes:
      - ./config:/app/config
      - ./.storyflow_cache:/app/.storyflow_cache
    restart: unless-stopped
```

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### Docker 单独运行

```bash
# 构建镜像
docker build -t storyflow:latest .

# 运行容器
docker run -d \
  -p 5001:5001 \
  -e STORYFLOW_API_KEY=your-key \
  -v $(pwd)/config:/app/config \
  --name storyflow \
  storyflow:latest
```

---

## 环境变量配置

### 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `STORYFLOW_API_KEY` | 主API Key | `sk-xxx` |
| `MINIMAX_API_KEY` | MiniMax API Key | `sk-xxx` |
| `DASHSCOPE_API_KEY` | 通义千问API Key | `sk-xxx` |

### 可选变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `STORYFLOW_HOST` | `127.0.0.1` | 服务地址 |
| `STORYFLOW_PORT` | `5001` | 服务端口 |
| `STORYFLOW_DEBUG` | `false` | 调试模式 |
| `STORYFLOW_LOG_LEVEL` | `INFO` | 日志级别 |

### 配置方式

**方式1: 环境变量**
```bash
export STORYFLOW_API_KEY=sk-xxx
export STORYFLOW_DEBUG=true
```

**方式2: .env文件**
```bash
# 在项目根目录创建 .env 文件
STORYFLOW_API_KEY=sk-xxx
MINIMAX_API_KEY=sk-xxx
DASHSCOPE_API_KEY=sk-xxx
STORYFLOW_DEBUG=false
```

**方式3: config/local.yaml**
```yaml
api:
  provider: minimax
  api_key: "sk-xxx"

server:
  host: "0.0.0.0"
  port: 5001
  debug: false
```

---

## 常见问题

### Q: 端口被占用？
```bash
# Windows
netstat -ano | findstr :5001

# Linux
lsof -i :5001
```

### Q: API Key无效？
检查 `.env` 文件是否正确配置，或确认API Key是否有效。

### Q: Docker构建失败？
```bash
docker system prune -a
docker-compose build --no-cache
```
