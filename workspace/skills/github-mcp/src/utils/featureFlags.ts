/**
 * Feature Flag Checker
 * 
 * 基于官方 GitHub MCP Server 的功能开关设计
 */

import { EnhancedGitHubMCPConfig, FeatureFlag } from '../config/enhanced';

/**
 * Feature Flag 检查器接口
 */
export interface FeatureChecker {
  /**
   * 检查功能是否启用
   */
  isEnabled(feature: FeatureFlag): boolean;
  
  /**
   * 获取所有启用的功能
   */
  getEnabledFeatures(): FeatureFlag[];
  
  /**
   * 获取所有禁用的功能
   */
  getDisabledFeatures(): FeatureFlag[];
}

/**
 * 创建功能检查器
 */
export function createFeatureChecker(config: EnhancedGitHubMCPConfig): FeatureChecker {
  const enabledFeatures = new Set<FeatureFlag>(config.features?.enabledFeatures || []);
  
  // Insiders mode 可以启用额外的实验性功能
  if (config.features?.insidersMode) {
    enabledFeatures.add(FeatureFlag.INSIDERS_MODE);
  }
  
  // Dynamic toolsets
  if (config.features?.dynamicToolsets) {
    enabledFeatures.add(FeatureFlag.DYNAMIC_TOOLSETS);
  }
  
  return {
    isEnabled(feature: FeatureFlag): boolean {
      return enabledFeatures.has(feature);
    },
    
    getEnabledFeatures(): FeatureFlag[] {
      return Array.from(enabledFeatures);
    },
    
    getDisabledFeatures(): FeatureFlag[] {
      const allFeatures = Object.values(FeatureFlag);
      return allFeatures.filter(f => !enabledFeatures.has(f));
    },
  };
}

/**
 * 默认启用的功能
 */
export const DEFAULT_ENABLED_FEATURES: FeatureFlag[] = [
  // 基础功能默认启用
  // FeatureFlag.DISCUSSIONS,
  // FeatureFlag.PROJECTS,
];

/**
 * 检查工具是否应该启用
 */
export function isToolEnabled(
  toolName: string,
  config: EnhancedGitHubMCPConfig,
  featureChecker: FeatureChecker
): boolean {
  // 检查是否在排除列表中
  if (config.features?.excludedTools?.includes(toolName)) {
    return false;
  }
  
  // 只读模式下，只能使用只读工具
  if (config.features?.readOnly && !isReadOnlyTool(toolName)) {
    return false;
  }
  
  // 检查工具所需的特定功能
  const toolFeatureRequirement = getToolFeatureRequirement(toolName);
  if (toolFeatureRequirement && !featureChecker.isEnabled(toolFeatureRequirement)) {
    return false;
  }
  
  return true;
}

/**
 * 判断是否为只读工具
 */
function isReadOnlyTool(toolName: string): boolean {
  const readOnlyTools = [
    'search_repositories',
    'get_repository',
    'list_commits',
    'list_branches',
    'list_tags',
    'get_latest_release',
    'list_releases',
    'search_issues',
    'get_issue',
    'list_issue_comments',
    'search_pull_requests',
    'get_pull_request',
    'list_pull_request_comments',
    'get_user',
    'list_user_repos',
    'list_user_gists',
    'list_notifications',
    'list_workflows',
    'get_workflow_run',
    'list_code_scanning_alerts',
    'list_secret_scanning_alerts',
    'list_dependabot_alerts',
  ];
  
  return readOnlyTools.includes(toolName);
}

/**
 * 获取工具所需的功能标志
 */
function getToolFeatureRequirement(toolName: string): FeatureFlag | null {
  // 根据工具名称返回所需的功能标志
  const toolFeatureMap: Record<string, FeatureFlag> = {
    // 代码安全
    'list_code_scanning_alerts': FeatureFlag.CODE_SCANNING,
    'get_code_scanning_alert': FeatureFlag.CODE_SCANNING,
    
    // Secret 保护
    'list_secret_scanning_alerts': FeatureFlag.SECRET_PROTECTION,
    'get_secret_scanning_alert': FeatureFlag.SECRET_PROTECTION,
    
    // 安全公告
    'list_security_advisories': FeatureFlag.SECURITY_ADVISORIES,
    'get_security_advisory': FeatureFlag.SECURITY_ADVISORIES,
    
    // Dependabot
    'list_dependabot_alerts': FeatureFlag.DEPENDABOT,
    'get_dependabot_alert': FeatureFlag.DEPENDABOT,
    
    // Discussions
    'list_discussions': FeatureFlag.DISCUSSIONS,
    'get_discussion': FeatureFlag.DISCUSSIONS,
    'create_discussion': FeatureFlag.DISCUSSIONS,
    'update_discussion': FeatureFlag.DISCUSSIONS,
    'delete_discussion': FeatureFlag.DISCUSSIONS,
    
    // Projects
    'list_projects': FeatureFlag.PROJECTS,
    'get_project': FeatureFlag.PROJECTS,
    'create_project': FeatureFlag.PROJECTS,
    'update_project': FeatureFlag.PROJECTS,
    'delete_project': FeatureFlag.PROJECTS,
  };
  
  return toolFeatureMap[toolName] || null;
}

/**
 * 工具清单条目
 */
export interface ToolEntry {
  name: string;
  description: string;
  category: string;
  readOnly: boolean;
  featureRequirement?: FeatureFlag;
}

/**
 * 所有可用工具的清单
 */
export const TOOL_INVENTORY: ToolEntry[] = [
  // Context tools
  { name: 'get_current_user', description: 'Get current user info', category: 'context', readOnly: true },
  { name: 'get_user_context', description: 'Get user context and permissions', category: 'context', readOnly: true },
  
  // Repository tools
  { name: 'search_repositories', description: 'Search repositories', category: 'repos', readOnly: true },
  { name: 'get_repository', description: 'Get repository details', category: 'repos', readOnly: true },
  { name: 'list_commits', description: 'List repository commits', category: 'repos', readOnly: true },
  { name: 'list_branches', description: 'List repository branches', category: 'repos', readOnly: true },
  { name: 'list_tags', description: 'List repository tags', category: 'repos', readOnly: true },
  { name: 'get_latest_release', description: 'Get latest release', category: 'repos', readOnly: true },
  { name: 'list_releases', description: 'List all releases', category: 'repos', readOnly: true },
  { name: 'create_repository', description: 'Create a new repository', category: 'repos', readOnly: false },
  { name: 'fork_repository', description: 'Fork a repository', category: 'repos', readOnly: false },
  { name: 'create_branch', description: 'Create a new branch', category: 'repos', readOnly: false },
  { name: 'delete_branch', description: 'Delete a branch', category: 'repos', readOnly: false },
  { name: 'star_repository', description: 'Star a repository', category: 'repos', readOnly: false },
  { name: 'unstar_repository', description: 'Unstar a repository', category: 'repos', readOnly: false },
  
  // Issue tools
  { name: 'search_issues', description: 'Search issues', category: 'issues', readOnly: true },
  { name: 'get_issue', description: 'Get issue details', category: 'issues', readOnly: true },
  { name: 'create_issue', description: 'Create an issue', category: 'issues', readOnly: false },
  { name: 'update_issue', description: 'Update an issue', category: 'issues', readOnly: false },
  { name: 'close_issue', description: 'Close an issue', category: 'issues', readOnly: false },
  { name: 'add_issue_comment', description: 'Add comment to issue', category: 'issues', readOnly: false },
  
  // Pull request tools
  { name: 'search_pull_requests', description: 'Search pull requests', category: 'pull_requests', readOnly: true },
  { name: 'get_pull_request', description: 'Get pull request details', category: 'pull_requests', readOnly: true },
  { name: 'create_pull_request', description: 'Create a pull request', category: 'pull_requests', readOnly: false },
  { name: 'update_pull_request', description: 'Update a pull request', category: 'pull_requests', readOnly: false },
  { name: 'merge_pull_request', description: 'Merge a pull request', category: 'pull_requests', readOnly: false },
  { name: 'close_pull_request', description: 'Close a pull request', category: 'pull_requests', readOnly: false },
  
  // User tools
  { name: 'get_user', description: 'Get user details', category: 'users', readOnly: true },
  { name: 'list_user_repos', description: 'List user repositories', category: 'users', readOnly: true },
  { name: 'list_user_gists', description: 'List user gists', category: 'users', readOnly: true },
  { name: 'list_followers', description: 'List user followers', category: 'users', readOnly: true },
  { name: 'list_following', description: 'List users being followed', category: 'users', readOnly: true },
  
  // Gist tools
  { name: 'list_gists', description: 'List gists', category: 'gists', readOnly: true },
  { name: 'get_gist', description: 'Get gist details', category: 'gists', readOnly: true },
  { name: 'create_gist', description: 'Create a gist', category: 'gists', readOnly: false },
  { name: 'update_gist', description: 'Update a gist', category: 'gists', readOnly: false },
  { name: 'delete_gist', description: 'Delete a gist', category: 'gists', readOnly: false },
  
  // Notification tools
  { name: 'list_notifications', description: 'List notifications', category: 'notifications', readOnly: true },
  { name: 'mark_notification_as_read', description: 'Mark notification as read', category: 'notifications', readOnly: false },
  { name: 'mark_all_notifications_as_read', description: 'Mark all notifications as read', category: 'notifications', readOnly: false },
  
  // Action tools
  { name: 'list_workflows', description: 'List workflows', category: 'actions', readOnly: true },
  { name: 'get_workflow', description: 'Get workflow details', category: 'actions', readOnly: true },
  { name: 'list_workflow_runs', description: 'List workflow runs', category: 'actions', readOnly: true },
  { name: 'get_workflow_run', description: 'Get workflow run details', category: 'actions', readOnly: true },
  { name: 'run_workflow', description: 'Trigger a workflow', category: 'actions', readOnly: false },
  { name: 'cancel_workflow_run', description: 'Cancel a workflow run', category: 'actions', readOnly: false },
  
  // Code security tools (require feature flag)
  { name: 'list_code_scanning_alerts', description: 'List code scanning alerts', category: 'code_security', readOnly: true, featureRequirement: FeatureFlag.CODE_SCANNING },
  { name: 'get_code_scanning_alert', description: 'Get code scanning alert', category: 'code_security', readOnly: true, featureRequirement: FeatureFlag.CODE_SCANNING },
  
  // Secret scanning tools (require feature flag)
  { name: 'list_secret_scanning_alerts', description: 'List secret scanning alerts', category: 'secret_protection', readOnly: true, featureRequirement: FeatureFlag.SECRET_PROTECTION },
  { name: 'get_secret_scanning_alert', description: 'Get secret scanning alert', category: 'secret_protection', readOnly: true, featureRequirement: FeatureFlag.SECRET_PROTECTION },
  
  // Dependabot tools (require feature flag)
  { name: 'list_dependabot_alerts', description: 'List Dependabot alerts', category: 'dependabot', readOnly: true, featureRequirement: FeatureFlag.DEPENDABOT },
  { name: 'get_dependabot_alert', description: 'Get Dependabot alert', category: 'dependabot', readOnly: true, featureRequirement: FeatureFlag.DEPENDABOT },
  
  // Discussion tools (require feature flag)
  { name: 'list_discussions', description: 'List discussions', category: 'discussions', readOnly: true, featureRequirement: FeatureFlag.DISCUSSIONS },
  { name: 'get_discussion', description: 'Get discussion details', category: 'discussions', readOnly: true, featureRequirement: FeatureFlag.DISCUSSIONS },
  { name: 'create_discussion', description: 'Create a discussion', category: 'discussions', readOnly: false, featureRequirement: FeatureFlag.DISCUSSIONS },
  
  // Project tools (require feature flag)
  { name: 'list_projects', description: 'List projects', category: 'projects', readOnly: true, featureRequirement: FeatureFlag.PROJECTS },
  { name: 'get_project', description: 'Get project details', category: 'projects', readOnly: true, featureRequirement: FeatureFlag.PROJECTS },
  { name: 'create_project', description: 'Create a project', category: 'projects', readOnly: false, featureRequirement: FeatureFlag.PROJECTS },
];

/**
 * 根据配置获取可用的工具列表
 */
export function getAvailableTools(
  config: EnhancedGitHubMCPConfig,
  featureChecker: FeatureChecker
): ToolEntry[] {
  return TOOL_INVENTORY.filter(tool => isToolEnabled(tool.name, config, featureChecker));
}

/**
 * 按类别分组工具
 */
export function groupToolsByCategory(tools: ToolEntry[]): Record<string, ToolEntry[]> {
  return tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolEntry[]>);
}
