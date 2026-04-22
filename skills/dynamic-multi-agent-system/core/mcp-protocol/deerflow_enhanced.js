/**
 * DeerFlow增强版MCP (Model Context Protocol) 系统
 * 
 * 借鉴DeerFlow的设计：
 * 1. MCP客户端 - 连接外部MCP服务器
 * 2. 资源管理 - 模板、资源订阅
 * 3. 提示词管理 - 提示词版本和复用
 * 4. 工具调用 - 标准化的工具调用接口
 */

const { EventEmitter } = require('events');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// ============== 常量定义 ==============
const MCP_PROTOCOL = {
  VERSION: '1.0.0',
  CONTENT_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    AUDIO: 'audio',
    VIDEO: 'video',
    RESOURCE: 'resource'
  },
  ROLES: {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
    TOOL: 'tool'
  }
};

const MCP_EVENTS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  TOOL_CALLED: 'tool_called',
  TOOL_RESULT: 'tool_result',
  RESOURCE_UPDATED: 'resource_updated',
  PROMPT_INVOKED: 'prompt_invoked',
  ERROR: 'error'
};

const TOOL_ERRORS = {
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TIMEOUT: 'TIMEOUT',
  INVALID_PARAMS: 'INVALID_PARAMS'
};

// ============== MCP消息类 ==============
class MCPMessage {
  constructor(type, role, content, metadata = {}) {
    this.type = type;
    this.role = role;
    this.content = content;
    this.metadata = {
      timestamp: new Date().toISOString(),
      ...metadata
    };
  }

  toJSON() {
    return {
      type: this.type,
      role: this.role,
      content: this.content,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    return new MCPMessage(
      json.type,
      json.role,
      json.content,
      json.metadata || {}
    );
  }
}

// ============== MCP资源类 ==============
class MCPResource {
  constructor(uri, name, description, mimeType = 'text/plain') {
    this.uri = uri;
    this.name = name;
    this.description = description;
    this.mimeType = mimeType;
    this.subscribers = new Set();
    this.content = null;
    this.lastModified = null;
  }

  async fetch() {
    try {
      const response = await this._request(this.uri);
      this.content = response;
      this.lastModified = new Date().toISOString();
      return response;
    } catch (err) {
      throw new Error(`Failed to fetch resource ${this.uri}: ${err.message}`);
    }
  }

  async _request(urlString) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Accept': this.mimeType
        },
        timeout: 10000
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(content) {
    this.content = content;
    this.lastModified = new Date().toISOString();
    for (const callback of this.subscribers) {
      callback(this);
    }
  }
}

// ============== MCP工具类 ==============
class MCPTool extends EventEmitter {
  constructor(definition) {
    super();
    this.name = definition.name;
    this.description = definition.description || '';
    this.inputSchema = definition.inputSchema || { type: 'object' };
    this.outputSchema = definition.outputSchema || { type: 'object' };
    this.handler = definition.handler || null;
    this.permission = definition.permission || 'user';
    this.tags = definition.tags || [];
    this.examples = definition.examples || [];
  }

  getSchema() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
      outputSchema: this.outputSchema,
      permission: this.permission,
      tags: this.tags
    };
  }

  async execute(params, context = {}) {
    // 验证参数
    if (!this._validateParams(params)) {
      throw new Error(`${TOOL_ERRORS.INVALID_PARAMS}: ${this.name}`);
    }

    this.emit('execute', { tool: this.name, params, context });

    try {
      let result;
      
      if (this.handler) {
        result = await this.handler(params, context);
      } else {
        result = { success: true, message: 'No handler defined' };
      }

      this.emit('result', { tool: this.name, result });

      return result;
    } catch (err) {
      this.emit('error', { tool: this.name, error: err.message });
      throw new Error(`${TOOL_ERRORS.TOOL_EXECUTION_FAILED}: ${err.message}`);
    }
  }

  _validateParams(params) {
    // 简单的参数验证
    if (typeof params !== 'object' || params === null) {
      return false;
    }
    return true;
  }
}

// ============== MCP提示词类 ==============
class MCPPrompt {
  constructor(definition) {
    this.name = definition.name;
    this.description = definition.description || '';
    this.arguments = definition.arguments || [];
    this.template = definition.template;
    this.version = definition.version || '1.0.0';
    this.variables = {};
  }

  /**
   * 渲染提示词模板
   */
  render(variables = {}) {
    let result = this.template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    }

    // 检查未解析的变量
    const unresolved = result.match(/\{\{([^}]+)\}\}/g);
    if (unresolved) {
      console.warn(`Unresolved variables: ${unresolved.join(', ')}`);
    }

    return {
      content: result,
      variables: { ...this.variables, ...variables }
    };
  }

  /**
   * 获取提示词定义
   */
  getDefinition() {
    return {
      name: this.name,
      description: this.description,
      arguments: this.arguments,
      version: this.version
    };
  }
}

// ============== MCP服务器连接 ==============
class MCPServerConnection extends EventEmitter {
  constructor(config) {
    super();
    this.url = config.url;
    this.name = config.name || 'mcp-server';
    this.headers = config.headers || {};
    this.timeout = config.timeout || 30000;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    
    this.connected = false;
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
  }

  /**
   * 连接到MCP服务器
   */
  async connect() {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this._probeServer();
        this.connected = true;
        
        this.emit(MCP_EVENTS.CONNECTED, { 
          server: this.name, 
          url: this.url 
        });
        
        // 获取服务器提供的工具、资源、提示词
        await this._discoverCapabilities();
        
        return true;
      } catch (err) {
        if (attempt === this.retryAttempts) {
          this.emit(MCP_EVENTS.ERROR, { 
            server: this.name, 
            error: `Failed to connect after ${attempt} attempts: ${err.message}` 
          });
          throw err;
        }
        
        await this._delay(this.retryDelay * attempt);
      }
    }
  }

  /**
   * 探测服务器
   */
  async _probeServer() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.url);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/health',
        method: 'GET',
        timeout: this.timeout
      };

      const req = protocol.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });

      req.end();
    });
  }

  /**
   * 发现服务器能力
   */
  async _discoverCapabilities() {
    // 发送MCP discover请求
    try {
      const capabilities = await this._sendRequest({
        jsonrpc: '2.0',
        method: 'discover',
        params: {}
      });

      // 注册工具
      for (const toolDef of capabilities.tools || []) {
        this.tools.set(toolDef.name, new MCPTool(toolDef));
      }

      // 注册资源
      for (const resourceDef of capabilities.resources || []) {
        const resource = new MCPResource(
          resourceDef.uri,
          resourceDef.name,
          resourceDef.description,
          resourceDef.mimeType
        );
        this.resources.set(resource.uri, resource);
      }

      // 注册提示词
      for (const promptDef of capabilities.prompts || []) {
        this.prompts.set(promptDef.name, new MCPPrompt(promptDef));
      }
    } catch (err) {
      // 如果discover失败，尝试使用静态配置
      console.warn(`Discover failed for ${this.name}, using static config`);
    }
  }

  /**
   * 发送请求到服务器
   */
  async _sendRequest(request) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.url);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const body = JSON.stringify(request);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Accept': 'application/json',
          ...this.headers
        },
        timeout: this.timeout
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * 调用工具
   */
  async callTool(toolName, params, context = {}) {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`${TOOL_ERRORS.TOOL_NOT_FOUND}: ${toolName}`);
    }

    this.emit(MCP_EVENTS.TOOL_CALLED, { 
      server: this.name, 
      tool: toolName, 
      params 
    });

    try {
      // 先尝试本地执行
      const localResult = await tool.execute(params, context);
      
      this.emit(MCP_EVENTS.TOOL_RESULT, { 
        server: this.name, 
        tool: toolName, 
        result: localResult,
        source: 'local'
      });

      return localResult;
    } catch (localErr) {
      // 本地失败，尝试远程执行
      try {
        const remoteResult = await this._sendRequest({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: toolName, arguments: params }
        });

        this.emit(MCP_EVENTS.TOOL_RESULT, { 
          server: this.name, 
          tool: toolName, 
          result: remoteResult,
          source: 'remote'
        });

        return remoteResult.result;
      } catch (remoteErr) {
        throw new Error(`${TOOL_ERRORS.TOOL_EXECUTION_FAILED}: ${remoteErr.message}`);
      }
    }
  }

  /**
   * 读取资源
   */
  async readResource(uri) {
    const resource = this.resources.get(uri);
    if (resource) {
      return await resource.fetch();
    }
    throw new Error(`Resource not found: ${uri}`);
  }

  /**
   * 获取提示词
   */
  getPrompt(name, variables = {}) {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    return prompt.render(variables);
  }

  /**
   * 列出所有工具
   */
  listTools() {
    return Array.from(this.tools.values()).map(t => t.getSchema());
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.connected = false;
    this.tools.clear();
    this.resources.clear();
    this.prompts.clear();
    
    this.emit(MCP_EVENTS.DISCONNECTED, { server: this.name });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============== MCP客户端管理器 ==============
class MCPClientManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.servers = new Map();
    this.globalTools = new Map();
    this.globalResources = new Map();
    this.globalPrompts = new Map();
  }

  /**
   * 添加服务器
   */
  async addServer(name, url, options = {}) {
    const connection = new MCPServerConnection({
      name,
      url,
      ...options
    });

    try {
      await connection.connect();
      this.servers.set(name, connection);
      return connection;
    } catch (err) {
      this.emit(MCP_EVENTS.ERROR, { server: name, error: err.message });
      throw err;
    }
  }

  /**
   * 移除服务器
   */
  removeServer(name) {
    const server = this.servers.get(name);
    if (server) {
      server.disconnect();
      this.servers.delete(name);
    }
  }

  /**
   * 调用工具（自动路由到正确的服务器）
   */
  async callTool(toolName, params, context = {}) {
    // 先检查全局工具
    const globalTool = this.globalTools.get(toolName);
    if (globalTool) {
      return await globalTool.execute(params, context);
    }

    // 在所有服务器中查找工具
    for (const [serverName, server] of this.servers) {
      if (server.tools.has(toolName)) {
        return await server.callTool(toolName, params, {
          ...context,
          server: serverName
        });
      }
    }

    throw new Error(`${TOOL_ERRORS.TOOL_NOT_FOUND}: ${toolName}`);
  }

  /**
   * 注册全局工具
   */
  registerTool(toolDef) {
    const tool = new MCPTool(toolDef);
    this.globalTools.set(tool.name, tool);
    return tool;
  }

  /**
   * 注册全局资源
   */
  registerResource(uri, name, description, mimeType) {
    const resource = new MCPResource(uri, name, description, mimeType);
    this.globalResources.set(uri, resource);
    return resource;
  }

  /**
   * 注册全局提示词
   */
  registerPrompt(promptDef) {
    const prompt = new MCPPrompt(promptDef);
    this.globalPrompts.set(prompt.name, prompt);
    return prompt;
  }

  /**
   * 获取工具列表
   */
  listTools() {
    const tools = Array.from(this.globalTools.values()).map(t => t.getSchema());
    
    for (const server of this.servers.values()) {
      tools.push(...server.listTools());
    }
    
    return tools;
  }

  /**
   * 获取提示词
   */
  getPrompt(name, variables) {
    // 先检查全局提示词
    const globalPrompt = this.globalPrompts.get(name);
    if (globalPrompt) {
      return globalPrompt.render(variables);
    }

    // 在所有服务器中查找
    for (const server of this.servers.values()) {
      if (server.prompts.has(name)) {
        return server.getPrompt(name, variables);
      }
    }

    throw new Error(`Prompt not found: ${name}`);
  }

  /**
   * 获取服务器状态
   */
  getServerStatus() {
    const status = {};
    for (const [name, server] of this.servers) {
      status[name] = {
        connected: server.connected,
        tools: server.tools.size,
        resources: server.resources.size,
        prompts: server.prompts.size
      };
    }
    return status;
  }

  /**
   * 关闭所有连接
   */
  close() {
    for (const server of this.servers.values()) {
      server.disconnect();
    }
    this.servers.clear();
    this.globalTools.clear();
    this.globalResources.clear();
    this.globalPrompts.clear();
  }
}

// ============== 导出 ==============
module.exports = {
  MCPClientManager,
  MCPServerConnection,
  MCPResource,
  MCPTool,
  MCPPrompt,
  MCPMessage,
  MCP_PROTOCOL,
  MCP_EVENTS,
  TOOL_ERRORS
};
