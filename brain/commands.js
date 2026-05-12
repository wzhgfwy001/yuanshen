/**
 * Commands System - Slash Commands 实现
 * 基于 Claude Code 的 slash commands 设计理念
 */

const { exec } = require('child_process');
const path = require('path');

/**
 * 内置命令定义
 */
const BUILTIN_COMMANDS = {
  // 基础命令（所有用户可用）
  all: ['help', 'status', 'search', 'memory', 'task', 'cancel'],
  
  // 信任命令（需要权限）
  trusted: ['exec', 'run'],
  
  // 管理命令（管理员）
  admin: ['agent', 'kill', 'reload', 'config']
};

/**
 * 自然语言到命令的映射
 */
const NL_TO_CMD = {
  '搜一下': 'search',
  '查找': 'search',
  '找文件': 'search',
  '搜索': 'search',
  '运行': 'exec',
  '执行': 'exec',
  '跑一下': 'exec',
  '做个任务': 'task',
  '创建任务': 'task',
  '进度': 'status',
  '状态': 'status',
  '查看状态': 'status',
  '取消': 'cancel',
  '停止': 'cancel',
  '帮助': 'help',
  '帮我': 'help'
};

/**
 * 命令处理器基类
 */
class CommandHandler {
  constructor(name, description, permission = 'all') {
    this.name = name;
    this.description = description;
    this.permission = permission;
  }
  
  async execute(args, context) {
    throw new Error('Command must implement execute()');
  }
}

/**
 * Search 命令
 */
class SearchCommand extends CommandHandler {
  constructor() {
    super('search', '搜索文件', 'all');
  }
  
  async execute(args) {
    const keyword = args.join(' ');
    if (!keyword) {
      return { error: '请提供搜索关键词' };
    }
    
    // 实际搜索逻辑（简化版）
    return {
      success: true,
      command: 'search',
      keyword,
      message: `正在搜索: ${keyword}`,
      results: [] // TODO: 实现实际搜索
    };
  }
}

/**
 * Status 命令
 */
class StatusCommand extends CommandHandler {
  constructor() {
    super('status', '查看任务状态', 'all');
  }
  
  async execute(args) {
    // 返回任务状态
    return {
      success: true,
      command: 'status',
      message: '任务状态查询',
      tasks: [] // TODO: 从任务系统获取
    };
  }
}

/**
 * Task 命令
 */
class TaskCommand extends CommandHandler {
  constructor() {
    super('task', '创建新任务', 'all');
  }
  
  async execute(args) {
    const description = args.join(' ');
    if (!description) {
      return { error: '请提供任务描述' };
    }
    
    const taskId = `t-${Date.now()}`;
    return {
      success: true,
      command: 'task',
      taskId,
      message: `任务已创建: ${taskId}`,
      description
    };
  }
}

/**
 * Help 命令
 */
class HelpCommand extends CommandHandler {
  constructor() {
    super('help', '显示帮助', 'all');
  }
  
  async execute(args) {
    const cmd = args[0];
    
    if (cmd) {
      // 显示特定命令帮助
      return {
        success: true,
        command: 'help',
        help: `/${cmd} - ${BUILTIN_COMMANDS[cmd] || '未知命令'}`
      };
    }
    
    // 显示所有命令
    return {
      success: true,
      command: 'help',
      commands: BUILTIN_COMMANDS.all,
      trusted: BUILTIN_COMMANDS.trusted,
      admin: BUILTIN_COMMANDS.admin
    };
  }
}

/**
 * Exec 命令
 */
class ExecCommand extends CommandHandler {
  constructor() {
    super('exec', '执行系统命令', 'trusted');
  }
  
  async execute(args) {
    const command = args.join(' ');
    if (!command) {
      return { error: '请提供要执行的命令' };
    }
    
    // TODO: 沙箱检查
    
    return new Promise((resolve) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }
}

/**
 * Commands Parser
 */
class CommandsParser {
  constructor() {
    this.handlers = new Map();
    this.registerDefaults();
  }
  
  registerDefaults() {
    this.register('search', new SearchCommand());
    this.register('status', new StatusCommand());
    this.register('task', new TaskCommand());
    this.register('help', new HelpCommand());
    this.register('exec', new ExecCommand());
  }
  
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  
  /**
   * 解析用户输入
   */
  parse(input, userRole = 'all') {
    if (!input || typeof input !== 'string') {
      return null;
    }
    
    const trimmed = input.trim();
    
    // 检查是否 slash command
    if (trimmed.startsWith('/')) {
      const [cmd, ...args] = trimmed.slice(1).split(' ');
      return { command: cmd.toLowerCase(), args, raw: trimmed };
    }
    
    // 自然语言映射
    for (const [nl, cmd] of Object.entries(NL_TO_CMD)) {
      if (trimmed.includes(nl)) {
        return { command: cmd, args: [trimmed.replace(nl, '').trim()], raw: trimmed, isNL: true };
      }
    }
    
    return null;
  }
  
  /**
   * 执行命令
   */
  async execute(parsed, userRole = 'all') {
    if (!parsed) {
      return { error: '无法解析输入' };
    }
    
    const handler = this.handlers.get(parsed.command);
    if (!handler) {
      return { error: `未知命令: /${parsed.command}` };
    }
    
    // 权限检查
    const permissionLevel = { all: 0, trusted: 1, admin: 2 };
    const userLevel = permissionLevel[userRole] || 0;
    const cmdLevel = permissionLevel[handler.permission] || 0;
    
    if (userLevel < cmdLevel) {
      return { error: `权限不足: 需要 ${handler.permission} 权限` };
    }
    
    try {
      return await handler.execute(parsed.args, { raw: parsed.raw });
    } catch (error) {
      return { error: error.message };
    }
  }
  
  /**
   * 处理用户输入
   */
  async process(input, userRole = 'all') {
    const parsed = this.parse(input, userRole);
    if (!parsed) {
      return { isCommand: false, input };
    }
    
    const result = await this.execute(parsed, userRole);
    return { isCommand: true, ...result };
  }
}

const commandsParser = new CommandsParser();

module.exports = {
  commandsParser,
  CommandsParser,
  CommandsParser,
  BUILTIN_COMMANDS
};

// 使用示例
if (require.main === module) {
  const parser = new CommandsParser();
  
  // 测试 slash command
  parser.process('/search OpenClaw').then(r => console.log('Result:', r));
  
  // 测试自然语言
  parser.process('帮我搜索一下文件').then(r => console.log('NL Result:', r));
}