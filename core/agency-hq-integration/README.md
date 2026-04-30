# Agency HQ Integration

代理HQ与混合动态多Agent系统的集成模块。

## 功能特性

- ✅ Agent注册与注销
- ✅ 任务分发与路由
- ✅ 状态实时同步
- ✅ 心跳保活机制
- ✅ 负载均衡
- ✅ 自动重连
- ✅ 事件驱动架构

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置

创建 `.env` 文件：

```
HQ_URL=https://hq.example.com
WS_URL=wss://hq.example.com/ws
HQ_API_KEY=your-api-key
```

### 运行

```bash
npx ts-node src/hq-client.ts
```

## 文档

- [SKILL.md](./SKILL.md) - 完整模块文档
- [INTEGRATION-PATCH.md](./INTEGRATION-PATCH.md) - 集成补丁说明
- [agents-dmags.config.ts](./agents-dmags.config.ts) - Agent配置

## 许可证

MIT
