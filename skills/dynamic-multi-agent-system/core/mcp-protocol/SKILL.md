---
name: deerflow-mcp-protocol
description: DeerFlow增强版MCP (Model Context Protocol) 系统 - 工具调用、资源管理、提示词管理
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | mcp_enabled=true | tool_integration=true | external_tools=true
---

# DeerFlow增强版MCP协议系统

**【附魔·改】MCP Enchant**

## 触发条件

当满足以下任一条件时，自动启用MCP协议系统：

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| MCP启用 | `mcp_enabled=true` | 明确启用MCP协议 |
| 工具集成 | `tool_integration=true` | 需要连接外部工具 |
| 外部工具 | `external_tools=true` | 调用第三方API |
| 资源订阅 | `resource_subscription=true` | 需要资源同步 |
| 提示词复用 | `prompt_template=true` | 使用提示词模板 |

## 核心功能

### 1. MCP客户端管理器

```javascript
const { MCPClientManager } = require('./deerflow_enhanced.js');

const mcp = new MCPClientManager();

// 添加MCP服务器
await mcp.addServer('filesystem', 'http://localhost:3001', {
  headers: { 'Authorization': 'Bearer token' }
});

await mcp.addServer('websearch', 'http://localhost:3002');

// 列出所有可用工具
const tools = mcp.listTools();
console.log('可用工具:', tools.map(t => t.name));
```

### 2. 全局工具注册

```javascript
// 注册自定义工具
mcp.registerTool({
  name: 'calculate',
  description: '执行数学计算',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: '数学表达式' }
    },
    required: ['expression']
  },
  handler: async (params) => {
    const result = eval(params.expression);
    return { result, expression: params.expression };
  }
});

// 调用工具
const result = await mcp.callTool('calculate', { 
  expression: '2 + 3 * 4' 
});
console.log(result); // { result: 14 }
```

### 3. 工具调用

```javascript
// 调用服务器上的工具
const searchResult = await mcp.callTool('websearch', {
  query: 'DeerFlow AI',
  limit: 5
});

const fileResult = await mcp.callTool('filesystem', {
  action: 'read',
  path: '/path/to/file'
});

// 调用全局工具
const calcResult = await mcp.callTool('calculate', {
  expression: 'Math.sqrt(16)'
});
```

### 4. 资源管理

```javascript
// 注册全局资源
mcp.registerResource(
  'file://config/app.json',
  'app-config',
  '应用程序配置',
  'application/json'
);

// 订阅资源更新
const resource = mcp.globalResources.get('file://config/app.json');
resource.subscribe((updatedResource) => {
  console.log('配置已更新:', updatedResource.content);
});
```

### 5. 提示词模板

```javascript
// 注册提示词模板
mcp.registerPrompt({
  name: 'code-review',
  description: '代码审查提示词',
  arguments: [
    { name: 'language', description: '编程语言' },
    { name: 'code', description: '代码片段' }
  ],
  template: `## Code Review Request

Language: {{language}}

\`\`\`
{{code}}
\`\`\`

Please review this code and provide feedback.`
});

// 渲染提示词
const prompt = mcp.getPrompt('code-review', {
  language: 'JavaScript',
  code: 'const x = 42;'
});

console.log(prompt.content);
```

### 6. 服务器管理

```javascript
// 获取服务器状态
const status = mcp.getServerStatus();
console.log(status);
// {
//   filesystem: { connected: true, tools: 12, resources: 5, prompts: 2 },
//   websearch: { connected: true, tools: 3, resources: 0, prompts: 1 }
// }

// 移除服务器
mcp.removeServer('websearch');

// 关闭所有连接
mcp.close();
```

## MCP工具类

```javascript
const { MCPTool } = require('./deerflow_enhanced.js');

const tool = new MCPTool({
  name: 'weather',
  description: '获取天气信息',
  inputSchema: {
    type: 'object',
    properties: {
      city: { type: 'string', description: '城市名称' },
      units: { type: 'string', enum: ['celsius', 'fahrenheit'] }
    },
    required: ['city']
  },
  handler: async (params, context) => {
    // 调用天气API
    const weather = await fetchWeather(params.city, params.units);
    return { city: params.city, weather, timestamp: new Date() };
  }
});

// 执行工具
const result = await tool.execute({ city: 'Beijing', units: 'celsius' });
```

## MCP资源类

```javascript
const { MCPResource } = require('./deerflow_enhanced.js');

const resource = new MCPResource(
  'https://api.example.com/data',
  'api-data',
  'API数据资源',
  'application/json'
);

// 获取资源内容
const content = await resource.fetch();
console.log('数据:', content);

// 订阅更新
const unsubscribe = resource.subscribe((updated) => {
  console.log('资源已更新:', updated.content);
});

// 取消订阅
unsubscribe();
```

## MCP提示词类

```javascript
const { MCPPrompt } = require('./deerflow_enhanced.js');

const prompt = new MCPPrompt({
  name: 'summarize',
  description: '文章摘要',
  arguments: [
    { name: 'title', description: '文章标题' },
    { name: 'content', description: '文章内容' },
    { name: 'maxLength', description: '最大长度', default: 100 }
  ],
  template: `# Summary Request

## Title: {{title}}

## Content:
{{content}}

## Requirements:
- Summarize in {{maxLength}} characters or less
- Capture the main points
- Use clear language

## Summary:`
});

// 渲染模板
const rendered = prompt.render({
  title: 'Introduction to MCP',
  content: 'The Model Context Protocol (MCP) is a protocol...',
  maxLength: 150
});
```

## MCP服务器连接

```javascript
const { MCPServerConnection } = require('./deerflow_enhanced.js');

const server = new MCPServerConnection({
  name: 'my-server',
  url: 'http://localhost:3000/mcp',
  timeout: 30000,
  retryAttempts: 3
});

// 连接到服务器
await server.connect();

// 调用工具
const result = await server.callTool('my-tool', { param: 'value' });

// 读取资源
const resource = await server.readResource('file://data.json');

// 获取提示词
const prompt = server.getPrompt('my-prompt', { var1: 'value' });

// 断开连接
server.disconnect();
```

## 事件系统

```javascript
mcp.on('connected', ({ server }) => {
  console.log('服务器已连接:', server);
});

mcp.on('disconnected', ({ server }) => {
  console.log('服务器已断开:', server);
});

mcp.on('tool_called', ({ server, tool, params }) => {
  console.log('工具调用:', server, tool);
});

mcp.on('tool_result', ({ server, tool, result, source }) => {
  console.log('工具结果:', tool, source, result);
});

mcp.on('resource_updated', ({ resource }) => {
  console.log('资源已更新:', resource.uri);
});

mcp.on('error', ({ server, error }) => {
  console.error('MCP错误:', server, error);
});
```

## 集成到主系统

```javascript
// 在系统初始化时
const mcpManager = new MCPClientManager();

// 加载配置的MCP服务器
for (const serverConfig of config.mcpServers) {
  await mcpManager.addServer(
    serverConfig.name, 
    serverConfig.url, 
    serverConfig.options
  );
}

// 注册内置工具
mcpManager.registerTool({
  name: 'execute_code',
  description: '在沙箱中执行代码',
  handler: async (params, context) => {
    const sandbox = await sandboxPool.acquire('code');
    const result = await sandbox.execute(params.code);
    sandboxPool.release(sandbox);
    return result;
  }
});

// 在任务执行时
const tools = mcpManager.listTools();
const matchedTools = tools.filter(t => 
  task.requiresTools.includes(t.name)
);
```

## 协议版本

| 版本 | 状态 | 说明 |
|------|------|------|
| 1.0.0 | ✅ 当前 | 基础功能完整 |

## 安全考虑

- 服务器认证通过headers配置
- 请求超时保护（默认30秒）
- 重试机制（默认3次）
- 本地工具优先执行，失败后尝试远程

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
