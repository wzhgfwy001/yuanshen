# Integration Patch Notes - Agency HQ Integration

> 本文档记录与主系统集成时的补丁说明、已知问题和迁移指南。

## 版本历史

### v1.0.0 (2026-04-24)
- 初始版本
- 支持Agent注册和注销
- 支持任务分发
- 支持状态同步
- 支持心跳管理

## 集成检查清单

在将 agency-hq-integration 集成到主系统前，请确认以下项目：

### 前置条件

- [ ] Node.js >= 18.0.0
- [ ] TypeScript >= 5.0.0
- [ ] ws >= 8.0.0 (WebSocket)
- [ ] axios >= 1.0.0

### 配置项

- [ ] 设置 HQ_URL 环境变量
- [ ] 配置 API 密钥 (如果需要)
- [ ] 设置心跳间隔
- [ ] 配置重连策略

## 与主系统集成

### 1. 导入模块

```typescript
import { HQClient } from './hq-client';
import { agentRegistry } from './agents-dmags.config';
```

### 2. 初始化

```typescript
const hq = new HQClient({
  hqUrl: process.env.HQ_URL,
  wsUrl: process.env.WS_URL,
  apiKey: process.env.HQ_API_KEY,
});

hq.on('ready', () => {
  agentRegistry.getAllAgents().forEach(agent => {
    hq.registerAgent(agent);
  });
});
```

### 3. 任务处理

```typescript
hq.on('task:dispatched', async (task) => {
  const agent = agentRegistry.selectAgent(task);
  if (agent) {
    await executeWithAgent(agent, task);
  }
});
```

## 已知问题

### Q1: WebSocket在网络切换时断开
**状态**: 已记录
**解决**: 启用自动重连，设置 `reconnectInterval: 5000`

### Q2: 高并发时心跳延迟
**状态**: 已优化
**解决**: 使用批量心跳，减少单独请求

## 迁移指南

### 从 v0.x 迁移到 v1.0

1. 更新导入路径
2. 更新配置格式 (参见 agents-dmags.config.ts)
3. 重新注册所有Agent
