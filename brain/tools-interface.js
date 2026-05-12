/**
 * Tools Interface - 工具接口标准化
 * 基于 Claude Code 的工具系统设计理念
 * 统一工具生命周期管理
 */

const fs = require('fs');

/**
 * 工具状态
 */
const TOOL_STATE = {
  CREATED: 'created',
  INITIALIZED: 'initialized',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CLEANED: 'cleaned'
};

/**
 * 工具错误类型
 */
const TOOL_ERROR = {
  VALIDATION: 'ToolValidationError',
  EXECUTION: 'ToolExecutionError',
  TIMEOUT: 'ToolTimeoutError',
  PERMISSION: 'ToolPermissionError'
};

/**
 * Base Tool 基类
 */
class BaseTool {
  constructor(name) {
    this.name = name;
    this.state = TOOL_STATE.CREATED;
    this.config = null;
    this.lastResult = null;
    this.lastError = null;
  }

  /**
   * 初始化工具
   */
  init(config) {
    this.config = config || {};
    this.state = TOOL_STATE.INITIALIZED;
    return this;
  }

  /**
   * 验证输入
   */
  validate(input) {
    if (this.state !== TOOL_STATE.INITIALIZED && this.state !== TOOL_STATE.COMPLETED) {
      throw new Error(`${this.name} not initialized`);
    }
    return true;
  }

  /**
   * 执行工具
   */
  async execute(params) {
    if (this.state !== TOOL_STATE.INITIALIZED && this.state !== TOOL_STATE.COMPLETED) {
      throw new Error(`${this.name} not initialized, current state: ${this.state}`);
    }
    
    this.state = TOOL_STATE.EXECUTING;
    
    try {
      const result = await this.doExecute(params);
      this.state = TOOL_STATE.COMPLETED;
      this.lastResult = result;
      return result;
    } catch (error) {
      this.state = TOOL_STATE.FAILED;
      this.lastError = error;
      throw error;
    }
  }

  /**
   * 具体执行逻辑（子类实现）
   */
  async doExecute(params) {
    throw new Error('Tool must implement doExecute()');
  }

  /**
   * 清理
   */
  cleanup() {
    this.state = TOOL_STATE.CLEANED;
    this.config = null;
    this.lastResult = null;
    this.lastError = null;
  }
}

/**
 * File Read Tool
 */
class ReadTool extends BaseTool {
  constructor() {
    super('read');
    this.allowedPaths = ['C:/Users/DELL/.openclaw/workspace/**', 'D:/obsidian知识库/**'];
  }

  validate(input) {
    super.validate(input);
    if (!input.path) {
      throw new Error('ReadTool requires path parameter');
    }
    return true;
  }

  async doExecute(params) {
    const { path: filePath } = params;
    
    // 安全检查
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`Path not allowed: ${filePath}`);
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, path: filePath, content, size: content.length };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  isPathAllowed(path) {
    // 简化版路径检查
    return this.allowedPaths.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    });
  }
}

/**
 * File Write Tool
 */
class WriteTool extends BaseTool {
  constructor() {
    super('write');
    this.allowedPaths = ['C:/Users/DELL/.openclaw/workspace/**', 'D:/obsidian知识库/**'];
  }

  validate(input) {
    super.validate(input);
    if (!input.path || !input.content) {
      throw new Error('WriteTool requires path and content parameters');
    }
    return true;
  }

  async doExecute(params) {
    const { path: filePath, content } = params;
    
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`Path not allowed: ${filePath}`);
    }
    
    try {
      // 确保目录存在
      const dir = filePath.replace(/[/\\][^/\\]+$/, '');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, path: filePath, size: content.length };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  isPathAllowed(path) {
    return this.allowedPaths.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(path);
    });
  }
}

/**
 * Exec Tool
 */
class ExecTool extends BaseTool {
  constructor() {
    super('exec');
    this.timeout = 30000;
    this.dangerousCommands = ['rm -rf /', 'format', 'del /s /q'];
  }

  validate(input) {
    super.validate(input);
    if (!input.command) {
      throw new Error('ExecTool requires command parameter');
    }
    return true;
  }

  doExecute(params) {
    const { command, timeout } = params;
    
    // 危险命令检查
    for (const dangerous of this.dangerousCommands) {
      if (command.toLowerCase().includes(dangerous.toLowerCase())) {
        throw new Error(`Dangerous command blocked: ${dangerous}`);
      }
    }
    
    // TODO: 实现实际执行
    return { success: true, command, message: 'Exec not implemented in sandbox' };
  }
}

/**
 * Tool Manager
 */
class ToolManager {
  constructor() {
    this.tools = new Map();
    this.running = new Set();
    this.registerDefaults();
  }

  registerDefaults() {
    this.register('read', new ReadTool());
    this.register('write', new WriteTool());
    this.register('exec', new ExecTool());
  }

  register(name, tool) {
    this.tools.set(name, tool);
  }

  get(name) {
    return this.tools.get(name);
  }

  /**
   * 执行工具
   */
  async execute(toolName, params) {
    // 并发检查
    if (this.running.has(toolName)) {
      throw new Error(`${toolName} is already running`);
    }
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    this.running.add(toolName);
    
    try {
      tool.validate(params);
      const result = await tool.execute(params);
      return result;
    } finally {
      this.running.delete(toolName);
    }
  }

  /**
   * 获取所有工具状态
   */
  getStatus() {
    const status = {};
    for (const [name, tool] of this.tools) {
      status[name] = {
        state: tool.state,
        running: this.running.has(name)
      };
    }
    return status;
  }
}

const toolManager = new ToolManager();

module.exports = {
  toolManager,
  BaseTool,
  ToolManager,
  ReadTool,
  WriteTool,
  ExecTool,
  TOOL_STATE,
  TOOL_ERROR
};

// 使用示例
if (require.main === module) {
  console.log('Available tools:', toolManager.getStatus());
}
