/**
 * Agency HQ - 混合动态多 Agent 系统定制版
 * 动态 Agent 配置生成器
 */

// 我们的系统角色体系
export const DMAGS_ROLES = {
  // 创意写作类
  WORLDBUILDER: { id: 'worldbuilder', name: '世界观架构师', emoji: '🏰', desk: 'research' as const },
  OUTLINER: { id: 'outliner', name: '大纲设计师', emoji: '📐', desk: 'design' as const },
  CHARACTER_DESIGNER: { id: 'character_designer', name: '角色塑造师', emoji: '🎭', desk: 'design' as const },
  PLOT_WEAVER: { id: 'plot_weaver', name: '剧情编织师', emoji: '🕸️', desk: 'research' as const },
  WRITER: { id: 'writer', name: '文字炼金师', emoji: '⚗️', desk: 'content' as const },
  REVIEWER: { id: 'reviewer', name: '审查官', emoji: '🔍', desk: 'security' as const },
  
  // 数据分析类
  DATA_ANALYST: { id: 'data_analyst', name: '数据分析师', emoji: '📊', desk: 'research' as const },
  STRATEGIST: { id: 'strategist', name: '策略顾问', emoji: '💡', desk: 'strategy' as const },
  
  // 技术开发类
  ARCHITECT: { id: 'architect', name: '架构师', emoji: '🏗️', desk: 'engineering' as const },
  DEVELOPER: { id: 'developer', name: '开发工程师', emoji: '💻', desk: 'dev' as const },
  TESTER: { id: 'tester', name: '测试工程师', emoji: '🧪', desk: 'engineering' as const },
} as const;

// 模型映射（根据我们的系统配置）
export const MODEL_MAPPING = {
  'qwen3.5-plus': { name: 'Qwen3.5-Plus', color: '#8b5cf6' },
  'qwen3-max': { name: 'Qwen3-Max', color: '#7c3aed' },
  'qwen3-coder-plus': { name: 'Qwen3-Coder', color: '#6366f1' },
  'minimax-m2.5': { name: 'MiniMax-M2.5', color: '#3b82f6' },
  'gpt-4': { name: 'GPT-4', color: '#10b981' },
  'claude-3': { name: 'Claude-3', color: '#f59e0b' },
} as const;

// 配饰映射（根据角色类型）
export const ACCESSORY_MAPPING = {
  'worldbuilder': 'glasses' as const,      // 眼镜 - 学者型
  'outliner': 'monocle' as const,          // 单眼镜 - 规划师
  'character_designer': 'bowtie' as const, // 领结 - 艺术家
  'plot_weaver': 'scarf' as const,         // 围巾 - 创作者
  'writer': 'headphones' as const,         // 耳机 - 专注写作
  'reviewer': 'badge' as const,            // 徽章 - 审查官
  'data_analyst': 'visor' as const,        // 遮阳板 - 分析师
  'strategist': 'hat' as const,            // 帽子 - 策略师
  'architect': 'crown' as const,           // 皇冠 - 架构师
  'developer': 'glasses' as const,         // 眼镜 - 开发者
  'tester': 'badge' as const,              // 徽章 - 测试员
} as const;

export interface DMAGSAgentConfig {
  id: string;
  name: string;
  emoji: string;
  role: string;
  model: string;
  color: string;
  desk: string;
  accessory: string;
  // 我们的系统特有字段
  taskId?: string;
  subtaskId?: string;
  progress?: number;
  tokenUsage?: number;
  tokenBudget?: number;
  createdAt?: string;
  lastActive?: string;
}

/**
 * 根据任务分解结果动态生成 Agent 配置
 */
export function generateAgentConfigs(
  taskDecomposition: any,
  model: string = 'qwen3.5-plus'
): DMAGSAgentConfig[] {
  const agents: DMAGSAgentConfig[] = [];
  const subtasks = taskDecomposition.subtasks || [];
  
  subtasks.forEach((subtask: any, index: number) => {
    const roleKey = getRoleFromSubtask(subtask);
    const roleConfig = DMAGS_ROLES[roleKey as keyof typeof DMAGS_ROLES];
    
    if (!roleConfig) {
      console.warn(`未知角色类型：${subtask.role}`);
      return;
    }
    
    const modelConfig = MODEL_MAPPING[model as keyof typeof MODEL_MAPPING] || MODEL_MAPPING['qwen3.5-plus'];
    const accessory = ACCESSORY_MAPPING[roleKey as keyof typeof ACCESSORY_MAPPING] || 'glasses';
    
    agents.push({
      id: `${taskDecomposition.taskId}-subagent-${index + 1}`,
      name: `${roleConfig.name}-${index + 1}`,
      emoji: roleConfig.emoji,
      role: roleConfig.name,
      model: modelConfig.name,
      color: modelConfig.color,
      desk: roleConfig.desk,
      accessory: accessory,
      // 系统特有字段
      taskId: taskDecomposition.taskId,
      subtaskId: subtask.id,
      progress: 0,
      tokenUsage: 0,
      tokenBudget: subtask.tokenBudget || 50000,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });
  });
  
  return agents;
}

/**
 * 根据子任务类型推断角色
 */
function getRoleFromSubtask(subtask: any): string {
  const description = (subtask.description || '').toLowerCase();
  const role = (subtask.role || '').toLowerCase();
  
  // 世界观相关
  if (description.includes('世界观') || description.includes('设定') || role.includes('world')) {
    return 'WORLDBUILDER';
  }
  
  // 大纲相关
  if (description.includes('大纲') || description.includes('结构') || role.includes('outline')) {
    return 'OUTLINER';
  }
  
  // 角色相关
  if (description.includes('角色') || description.includes('人物') || role.includes('character')) {
    return 'CHARACTER_DESIGNER';
  }
  
  // 剧情相关
  if (description.includes('剧情') || description.includes('情节') || role.includes('plot')) {
    return 'PLOT_WEAVER';
  }
  
  // 写作相关
  if (description.includes('撰写') || description.includes('写作') || role.includes('writer')) {
    return 'WRITER';
  }
  
  // 审查相关
  if (description.includes('审查') || description.includes('检查') || role.includes('review')) {
    return 'REVIEWER';
  }
  
  // 数据分析相关
  if (description.includes('分析') || description.includes('数据') || role.includes('data')) {
    return 'DATA_ANALYST';
  }
  
  // 策略相关
  if (description.includes('策略') || description.includes('建议') || role.includes('strategy')) {
    return 'STRATEGIST';
  }
  
  // 架构相关
  if (description.includes('架构') || description.includes('设计') || role.includes('architect')) {
    return 'ARCHITECT';
  }
  
  // 开发相关
  if (description.includes('开发') || description.includes('代码') || role.includes('developer')) {
    return 'DEVELOPER';
  }
  
  // 测试相关
  if (description.includes('测试') || description.includes('验证') || role.includes('test')) {
    return 'TESTER';
  }
  
  // 默认
  return 'WRITER';
}

/**
 * 根据任务状态更新 Agent 状态
 */
export function updateAgentStatus(
  agent: DMAGSAgentConfig,
  taskState: any
): DMAGSAgentConfig {
  return {
    ...agent,
    progress: taskState.progress || 0,
    tokenUsage: taskState.tokenUsage || 0,
    lastActive: new Date().toISOString(),
  };
}

/**
 * 计算 Agent 应该所在的房间
 */
export function assignAgentRoom(agent: DMAGSAgentConfig, taskState: any): string {
  // 有未完成的依赖 → 会议室
  if (taskState.hasUnmetDependencies) {
    return 'meeting_room';
  }
  
  // 正在审查 → 审查室
  if (taskState.isUnderReview) {
    return 'review_room';
  }
  
  // 执行中 → 主办公室
  if (taskState.status === 'executing') {
    return 'main_office';
  }
  
  // 等待中 → 会议室
  if (taskState.status === 'waiting') {
    return 'meeting_room';
  }
  
  // 已完成但空闲<15 分钟 → 厨房
  const idleMinutes = taskState.idleMinutes || 0;
  if (idleMinutes < 15) {
    return 'kitchen';
  }
  
  // 已完成且空闲>15 分钟 → 游戏室
  if (idleMinutes >= 15) {
    return 'game_room';
  }
  
  // 离线/已释放 → 休息室
  return 'rest_room';
}
