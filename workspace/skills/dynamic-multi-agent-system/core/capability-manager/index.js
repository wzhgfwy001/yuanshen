/**
 * Capability Manager - 能力管理器索引
 * 
 * 导出所有能力管理相关类和函数
 */

const {
  CapabilityManager,
  MCPRegistry,
  CAPABILITY_CATEGORIES,
  CAPABILITY_TO_MCP,
  NEED_TO_CAPABILITIES,
  getCapabilityManager,
} = require('./capability-manager');

module.exports = {
  // 主类
  CapabilityManager,
  MCPRegistry,
  
  // 常量
  CAPABILITY_CATEGORIES,
  CAPABILITY_TO_MCP,
  NEED_TO_CAPABILITIES,
  
  // 单例获取函数
  getCapabilityManager,
  
  // 版本信息
  VERSION: '1.0.0',
  NAME: 'capability-manager',
};
