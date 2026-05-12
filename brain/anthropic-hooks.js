/**
 * Anthropic Hooks - OpenClaw Hook系统集成
 * 通过OpenClaw原生Hook事件触发
 */

const fs = require('fs');
const path = require('path');

// 加载所有模块
const modules = {
  sessionLog: null,
  wakeRecovery: null,
  memdir: null,
  contextEngine: null,
  warmup: null,
  commands: null,
  cattlePolicy: null,
  cleanup: null
};

function loadModules() {
  const moduleMap = {
    'session-log': 'sessionLog',
    'wake-recovery': 'wakeRecovery',
    'memdir': 'memdir',
    'context-engine': 'contextEngine',
    'warmup': 'warmup',
    'commands': 'commands',
    'cattle-policy': 'cattleManager',
    'cleanup': 'cleanupPolicy'
  };
  
  for (const [file, key] of Object.entries(moduleMap)) {
    try {
      const mod = require(`./${file}.js`);
      modules[key] = mod[Object.keys(mod)[0]] || mod;
      console.log(`[Anthropic-Hooks] ✅ ${file} loaded`);
    } catch (e) {
      console.log(`[Anthropic-Hooks] ⚠️ ${file}: ${e.message}`);
    }
  }
}

// Hook处理器
const hooks = {
  // gateway:startup - 启动时初始化
  async 'gateway:startup'(event) {
    console.log('[Hook] gateway:startup');
    
    // warmup预热
    if (modules.warmup) {
      try {
        await modules.warmup.warmup();
      } catch(e) {}
    }
    
    // wake-recovery检查
    if (modules.wakeRecovery) {
      try {
        const sessions = modules.wakeRecovery.listSessions();
        if (sessions.length > 0) {
          console.log(`[Hook] 发现${sessions.length}个待恢复会话`);
          // 可以选择自动恢复或通知用户
        }
      } catch(e) {}
    }
  },
  
  // session:compact:before - 压缩前记录状态
  async 'session:compact:before'(event) {
    console.log('[Hook] session:compact:before');
    
    // 记录当前状态到session-log
    if (modules.sessionLog) {
      try {
        modules.sessionLog.log('compact_started', { tokenCount: event.context?.tokenCount });
      } catch(e) {}
    }
    
    // 保存checkpoint
    if (modules.wakeRecovery) {
      try {
        modules.wakeRecovery.saveCheckpoint({ type: 'compact' });
      } catch(e) {}
    }
  },
  
  // session:compact:after - 压缩后记录
  async 'session:compact:after'(event) {
    console.log('[Hook] session:compact:after');
    
    if (modules.sessionLog) {
      try {
        modules.sessionLog.log('compact_completed', { 
          before: event.context?.tokensBefore,
          after: event.context?.tokensAfter 
        });
      } catch(e) {}
    }
  },
  
  // command:new - 新命令时
  async 'command:new'(event) {
    console.log('[Hook] command:new:', event.context?.command);
    
    // commands解析
    if (modules.commands && event.context?.command?.startsWith('/')) {
      try {
        const cmd = modules.commands.parse(event.context.command);
        console.log('[Hook] 命令解析:', cmd);
      } catch(e) {}
    }
  },
  
  // message:received - 消息接收时
  async 'message:received'(event) {
    console.log('[Hook] message:received');
    
    // contextEngine处理
    if (modules.contextEngine) {
      try {
        modules.contextEngine.add('user', event.context?.content);
      } catch(e) {}
    }
  }
};

// 导出Hook配置
module.exports = {
  hooks,
  loadModules,
  
  // OpenClaw Hook配置格式
  config: {
    name: 'anthropic-hooks',
    events: ['gateway:startup', 'session:compact:before', 'session:compact:after', 'command:new', 'message:received']
  }
};
