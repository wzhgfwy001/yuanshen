---
name: api
description: |
  多模型API接口模块，为混合动态多Agent系统提供统一的AI模型调用接口。
  支持OpenAI、Anthropic、Azure、Google、本地模型等多种AI Provider的接入。
  支持模型自动选择、成本优化、负载均衡、熔断降级等企业级功能。
  触发条件：AI模型调用、对话生成、多模型切换、API配置管理。
parent: core
version: 1.0.0
triggers:
  - "api调用"
  - "模型切换"
  - "ai生成"
  - "多模型"
  - "model api"
  - "openai"
  - "anthropic"
  - "模型配置"
  - "ai request"
  - "llm"
usage:
  activate: |
    当用户提到需要调用AI模型、生成对话内容、切换AI Provider、
    配置多模型API、管理API密钥、处理模型响应时激活此模块。
  steps:
    1. 加载 model-registry.ts 获取可用模型
    2. 使用 api-client.ts 进行模型调用
    3. 根据配置选择合适的Provider
    4. 处理响应和错误
    5. 记录调用日志和成本
  examples:
    - "调用GPT-4生成代码"
    - "切换到Claude模型"
    - "配置Azure OpenAI"
    - "使用本地模型"
    - "批量生成内容"
integration:
  main_file: api-client.ts
  config_file: model-registry.ts
  dependencies:
    - axios
    - openai
    - @anthropic-ai/sdk
  events:
    - api:request
    - api:response
    - api:error
    - model:switched
    - circuit:opened
    - circuit:closed
    - cost:calculated
---

# Multi-Model API Module

## 概述

API模块是混合动态多Agent系统的AI能力中心，提供统一的多模型调用接口。系统可以同时接入多种AI Provider：

- **OpenAI** - GPT-4, GPT-3.5-Turbo, DALL-E, Whisper
- **Anthropic** - Claude-3-Opus, Claude-3-Sonnet, Claude-3-Haiku
- **Azure OpenAI** - 企业级OpenAI服务
- **Google AI** - Gemini Pro, Gemini Vision
- **本地模型** - Ollama, LM Studio, LocalAI

## 架构

```
┌──────────────────────────────────────────────────────────────┐
│                     API Module (api-client.ts)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Request Router                         │ │
│  │  - Model Selection Strategy                              │ │
│  │  - Load Balancing                                        │ │
│  │  - Cost Optimization                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                                │
│  ┌────────────────────────────┼────────────────────────────┐│
│  │         Provider Adapters (model-registry.ts)           ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        ││
│  │  │ OpenAI  │ │Claude   │ │ Azure   │ │ Google  │        ││
│  │  │Adapter  │ │Adapter  │ │Adapter  │ │Adapter  │        ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        ││
│  └───────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    External AI Providers                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ OpenAI  │ │Anthropic│ │  Azure  │ │ Google  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└──────────────────────────────────────────────────────────────┘
```

## 核心功能

### 1. 统一API接口 (api-client.ts)

```typescript
interface APIRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: Tool[];
  timeout?: number;
}
```

核心方法：

- `chat(request: APIRequest)` - 发送对话请求
- `embed(text: string, model?: string)` - 生成嵌入向量
- `image(prompt: string, options?: ImageOptions)` - 生成图像
- `transcribe(audio: Buffer)` - 语音转文字

### 2. 模型注册表 (model-registry.ts)

管理所有可用模型和Provider配置：

```typescript
interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  capabilities: string[];
  contextWindow: number;
  inputCostPer1K: number;
  outputCostPer1K: number;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  fallback?: string;  // 降级模型
}
```

### 3. 智能路由

支持多种模型选择策略：

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `cost-optimized` | 选择最便宜的模型 | 成本敏感 |
| `latency-optimized` | 选择响应最快的模型 | 实时交互 |
| `quality-first` | 选择最高质量模型 | 重要任务 |
| `balanced` | 平衡成本和质量 | 通用场景 |

### 4. 熔断降级

当某个Provider出现问题时自动降级：

```
正常状态 → 降级触发 → 熔断开启 → 尝试恢复 → 正常状态
```

配置：
```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;    // 失败次数阈值
  recoveryTimeout: number;    // 恢复超时(ms)
  halfOpenRequests: number;   // 半开状态探测请求数
}
```

### 5. 成本追踪

实时追踪API使用成本：

```typescript
interface CostRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
  requestId: string;
}
```

## Provider配置

### OpenAI

```typescript
{
  type: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  organization?: process.env.OPENAI_ORG_ID,
  baseURL?: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4-turbo-preview',
  models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-vision-preview'],
}
```

### Anthropic

```typescript
{
  type: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://api.anthropic.com',
  defaultModel: 'claude-3-opus-20240229',
  models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
}
```

### Azure OpenAI

```typescript
{
  type: 'azure',
  apiKey: process.env.AZURE_API_KEY,
  endpoint: process.env.AZURE_ENDPOINT,
  apiVersion: '2024-02-01',
  defaultModel: 'gpt-4-turbo',
}
```

### Google AI

```typescript
{
  type: 'google',
  apiKey: process.env.GOOGLE_API_KEY,
  defaultModel: 'gemini-pro',
  models: ['gemini-pro', 'gemini-pro-vision'],
}
```

### 本地模型 (Ollama/LM Studio)

```typescript
{
  type: 'local',
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',  // 通常不需要
  defaultModel: 'llama2',
}
```

## 使用示例

### 基础对话

```typescript
import { APIClient } from './api-client';
import { modelRegistry } from './model-registry';

const api = new APIClient(modelRegistry);

// 简单对话
const response = await api.chat({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: '你是一个有帮助的助手' },
    { role: 'user', content: '解释什么是量子计算' }
  ],
  temperature: 0.7,
  maxTokens: 500,
});

console.log(response.content);
```

### 使用成本优化策略

```typescript
const response = await api.chat({
  messages: [...],
  // 自动选择最便宜的合适模型
  strategy: 'cost-optimized',
  // 最低质量要求
  minQuality: 'claude-3-haiku',
});
```

### 流式响应

```typescript
const stream = await api.chat({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '写一个科幻故事' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### 嵌入向量

```typescript
const embedding = await api.embed('Hello world', 'text-embedding-3-small');
console.log(embedding.vector);
```

### 图像生成

```typescript
const image = await api.image({
  model: 'dall-e-3',
  prompt: 'A cute robot playing chess in a space station',
  size: '1024x1024',
  quality: 'standard',
});
console.log(image.url);
```

### 函数/工具调用

```typescript
const response = await api.chat({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '北京的天气怎么样？' }],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: '获取天气信息',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: '城市名' }
          },
          required: ['location']
        }
      }
    }
  ],
  toolChoice: 'auto',
});

if (response.toolCalls) {
  for (const call of response.toolCalls) {
    console.log(`Calling ${call.name}:`, call.args);
  }
}
```

## 成本管理

### 查询成本

```typescript
const costs = api.getCostSummary({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  groupBy: 'model',
});
console.log(costs.totalCost);
```

### 设置预算限制

```typescript
api.setBudget({
  monthlyLimit: 1000,  // 美元
  alertThreshold: 0.8,  // 80%时报警
  onExceed: (budget, current) => {
    console.warn(`Budget exceeded: $${current} / $${budget}`);
  },
});
```

## 错误处理

### 错误类型

```typescript
enum APIErrorType {
  RATE_LIMIT = 'rate_limit',        // 速率限制
  AUTH_FAILED = 'auth_failed',      // 认证失败
  QUOTA_EXCEEDED = 'quota_exceeded', // 配额超限
  MODEL_NOT_FOUND = 'model_not_found', // 模型不存在
  TIMEOUT = 'timeout',              // 超时
  NETWORK_ERROR = 'network_error',  // 网络错误
  CIRCUIT_OPEN = 'circuit_open',    // 熔断开启
  UNKNOWN = 'unknown',              // 未知错误
}
```

### 重试策略

```typescript
const response = await api.chatWithRetry({
  model: 'gpt-4',
  messages: [...],
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: ['rate_limit', 'timeout', 'network_error'],
});
```

## 多模型指南

详见 `API-MULTI-MODEL-GUIDE.md`，包含：

- 各Provider详细对比
- 模型选择指南
- 成本优化技巧
- 最佳实践

## 测试

```bash
# 运行单元测试
npm test -- --module=api

# 测试特定Provider
npm test -- --module=api --provider=openai

# 成本测试
npm test -- --module=api --test=cost
```

## 相关文件

- `api-client.ts` - API客户端主实现
- `model-registry.ts` - 模型注册表
- `API-MULTI-MODEL-GUIDE.md` - 多模型使用指南
