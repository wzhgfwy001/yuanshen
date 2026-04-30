---
name: agency-hq-integration
description: |
  代理HQ与混合动态多Agent系统的集成模块。
  提供Agent注册、任务分发、状态同步、心跳管理等功能，
  使本地Agent能够与远程HQ服务进行无缝通信和协作。
  触发条件：Agent系统初始化、任务分发、状态同步、HQ连接管理。
parent: core
version: 1.0.0
triggers:
  - "agency hq"
  - "hq连接"
  - "agent注册"
  - "任务分发"
  - "agent集成"
  - "agency-hq"
  - "hq sync"
  - "agent registry"
usage:
  activate: |
    当用户提到需要将Agent与HQ集成、创建Agent注册表、分发任务到HQ、
    管理Agent状态同步时激活此模块。
  steps:
    1. 加载 hq-client.ts 初始化HQ连接
    2. 使用 agents-dmags.config.ts 配置注册表
    3. 建立WebSocket心跳通道
    4. 注册本地Agent到HQ
    5. 开始任务分发循环
  examples:
    - "初始化HQ集成模块"
    - "注册新的Agent到HQ"
    - "分发任务到HQ"
    - "同步Agent状态"
    - "管理HQ连接"
integration:
  main_file: hq-client.ts
  config_file: agents-dmags.config.ts
  dependencies:
    - ws (WebSocket)
    - axios (HTTP)
    - event-emitter (事件系统)
  events:
    - agent:registered
    - agent:unregistered
    - task:dispatched
    - task:completed
    - task:failed
    - heartbeat:ping
    - heartbeat:pong
    - sync:state
    - connection:established
    - connection:lost
---

# Agency HQ Integration Module

## 概述

Agency HQ Integration 是混合动态多Agent系统的核心连接模块，负责将本地Agent系统与远程HQ（Headquarters）服务进行集成。通过此模块，Agent能够：

- **注册/注销** - Agent上线和下线时向HQ报备
- **任务分发** - 从HQ接收任务并分发给本地Agent
- **状态同步** - 实时同步Agent状态到HQ
- **心跳保活** - 维持与HQ的持久连接
- **结果回传** - 将任务执行结果返回给HQ

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Local Agent System                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Agent A   │  │   Agent B   │  │   Agent C   │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                │                │              │
│  ┌──────┴────────────────┴────────────────┴──────┐      │
│  │              Agent Registry (DMAGS)            │      │
│  └──────────────────────┬─────────────────────────┘      │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────┐     │
│  │              HQ-Client (hq-client.ts)            │     │
│  └──────────────────────┬─────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────┘
                          │ WebSocket / HTTP
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Remote HQ Server                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Task Queue  │  │ Agent Meta  │  │  Event Bus  │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────┘
```

## 核心功能

### 1. Agent注册表 (agents-dmags.config.ts)

定义所有可用Agent的配置信息：

```typescript
interface AgentConfig {
  id: string;           // Agent唯一标识
  name: string;          // Agent名称
  type: AgentType;      // Agent类型
  capabilities: string[]; // Agent能力列表
  maxConcurrent: number; // 最大并发任务数
  priority: number;      // 优先级 (1-10)
  status: AgentStatus;   // 当前状态
  endpoint?: string;    // 端点地址
  metadata?: Record<string, any>; // 额外元数据
}
```

### 2. HQ客户端 (hq-client.ts)

提供与HQ服务器通信的客户端实现：

- `connect()` - 建立与HQ的连接
- `disconnect()` - 断开连接
- `registerAgent(agent: AgentConfig)` - 注册Agent
- `unregisterAgent(agentId: string)` - 注销Agent
- `dispatchTask(task: Task)` - 分发任务
- `syncState(state: AgentState)` - 同步状态
- `sendHeartbeat()` - 发送心跳
- `onEvent(handler: EventHandler)` - 订阅事件

### 3. 事件系统

支持的事件类型：

| 事件名 | 说明 | 负载 |
|--------|------|------|
| `agent:registered` | Agent注册成功 | `{agentId, timestamp}` |
| `agent:unregistered` | Agent注销 | `{agentId, reason}` |
| `task:dispatched` | 任务被分发 | `{taskId, agentId, task}` |
| `task:completed` | 任务完成 | `{taskId, result}` |
| `task:failed` | 任务失败 | `{taskId, error}` |
| `heartbeat:ping` | 心跳ping | `{timestamp}` |
| `heartbeat:pong` | 心跳pong | `{latency}` |
| `sync:state` | 状态同步 | `{agentId, state}` |
| `connection:established` | 连接建立 | `{hqUrl}` |
| `connection:lost` | 连接断开 | `{reason}` |

## 配置说明

### HQ连接配置

```typescript
interface HQConfig {
  hqUrl: string;           // HQ服务器地址
  wsUrl: string;           // WebSocket地址
  apiKey?: string;         // API密钥
  reconnectInterval: number; // 重连间隔(ms)
  heartbeatInterval: number; // 心跳间隔(ms)
  timeout: number;         // 请求超时(ms)
  maxRetries: number;      // 最大重试次数
}
```

### Agent注册配置

```typescript
interface RegistryConfig {
  agents: AgentConfig[];
  defaultCapabilities: string[];
  loadBalancing: 'random' | 'round-robin' | 'least-loaded';
  healthCheckInterval: number;
  autoRegister: boolean;
}
```

## 使用示例

### 初始化HQ集成

```typescript
import { HQClient } from './hq-client';
import { agentRegistry } from './agents-dmags.config';

const hqClient = new HQClient({
  hqUrl: 'https://hq.example.com',
  wsUrl: 'wss://hq.example.com/ws',
  heartbeatInterval: 30000,
  reconnectInterval: 5000,
});

hqClient.on('connection:established', () => {
  console.log('Connected to HQ');
  hqClient.registerAllAgents(agentRegistry.agents);
});

hqClient.on('task:dispatched', async (payload) => {
  const { taskId, agentId, task } = payload;
  // 处理任务...
  const result = await executeTask(task);
  hqClient.completeTask(taskId, result);
});

hqClient.connect();
```

### 手动注册单个Agent

```typescript
await hqClient.registerAgent({
  id: 'agent-001',
  name: 'CodeReviewAgent',
  type: 'code-review',
  capabilities: ['code-review', 'static-analysis', 'security-scan'],
  maxConcurrent: 3,
  priority: 8,
  status: 'online',
});
```

### 分发任务

```typescript
const taskId = await hqClient.dispatchTask({
  type: 'code-review',
  priority: 'high',
  payload: {
    repoUrl: 'https://github.com/example/repo',
    branch: 'main',
    rules: ['security', 'performance'],
  },
  targetAgents: ['CodeReviewAgent'],
});
```

## 错误处理

### 连接失败

当与HQ的连接断开时，模块会自动：

1. 触发 `connection:lost` 事件
2. 按照 `reconnectInterval` 尝试重连
3. 最多重试 `maxRetries` 次
4. 失败后进入离线模式，等待手动恢复

### 任务失败

任务执行失败时：

1. 触发 `task:failed` 事件
2. 根据 `retryPolicy` 决定是否重试
3. 超过重试次数后标记任务为最终失败
4. 将错误详情上报HQ

## 集成补丁 (INTEGRATION-PATCH.md)

详见 `INTEGRATION-PATCH.md`，包含：

- 与主系统的集成说明
- 配置迁移指南
- 已知问题和解决方案
- 未来规划

## 测试

```bash
# 运行单元测试
npm test -- --module=hq-integration

# 运行集成测试
npm test -- --module=hq-integration --integration

# 测试连接
npx ts-node test/hq-connection.ts
```

## 相关文件

- `hq-client.ts` - HQ客户端主实现
- `agents-dmags.config.ts` - Agent注册表配置
- `INTEGRATION-PATCH.md` - 集成补丁说明
- `README.md` - 使用文档
