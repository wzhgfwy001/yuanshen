/**
 * GitHub MCP Skill - 入口文件
 * 
 * 参照官方 github-mcp-server，用 Node.js/TypeScript 实现
 * 复用 SSH Key，支持 80+ GitHub 操作
 */

import * as fs from 'fs';
import * as path from 'path';
import { getGitHubClient, GitHubClient } from './github/client';
import { GitHubMCPConfig, DEFAULT_CONFIG } from './config/default';

// 导出所有工具
export * from './tools';

// 导出类型
export { GitHubClient } from './github/client';
export * from './github/types';
export { GitHubMCPConfig, DEFAULT_CONFIG } from './config/default';

/**
 * 初始化 GitHub MCP
 * 从配置文件加载配置并初始化客户端
 */
export async function initialize(config?: Partial<GitHubMCPConfig>): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 验证 SSH Key 存在
  if (finalConfig.sshKeyPath && !fs.existsSync(finalConfig.sshKeyPath)) {
    console.warn(`警告: SSH Key 文件不存在: ${finalConfig.sshKeyPath}`);
    console.warn('将使用无认证模式（只能访问公共仓库）');
  }
  
  // 初始化客户端
  const client = getGitHubClient({
    apiUrl: finalConfig.apiUrl,
    graphqlUrl: finalConfig.graphqlUrl,
    token: finalConfig.token,
    username: finalConfig.githubUsername,
  });
  
  // 如果提供了 token，设置认证
  if (finalConfig.token) {
    client.setToken(finalConfig.token);
  }
  
  console.log(`GitHub MCP 初始化完成`);
  console.log(`  用户: ${finalConfig.githubUsername}`);
  console.log(`  SSH Key: ${finalConfig.sshKeyPath}`);
  console.log(`  API: ${finalConfig.apiUrl}`);
}

/**
 * 获取工具列表
 * 返回所有可用的 GitHub 工具
 */
export function getToolList(): { name: string; description: string; category: string }[] {
  return [
    // 仓库工具
    { name: 'github_search_repositories', description: '搜索 GitHub 仓库', category: 'repos' },
    { name: 'github_get_file_contents', description: '获取仓库文件内容', category: 'repos' },
    { name: 'github_list_commits', description: '列出仓库提交', category: 'repos' },
    { name: 'github_get_commit', description: '获取提交详情', category: 'repos' },
    { name: 'github_list_branches', description: '列出仓库分支', category: 'repos' },
    { name: 'github_list_tags', description: '列出仓库标签', category: 'repos' },
    { name: 'github_get_latest_release', description: '获取最新 Release', category: 'repos' },
    { name: 'github_list_releases', description: '列出所有 Release', category: 'repos' },
    { name: 'github_create_repository', description: '创建新仓库', category: 'repos' },
    { name: 'github_fork_repository', description: 'Fork 仓库', category: 'repos' },
    { name: 'github_create_branch', description: '创建分支', category: 'repos' },
    { name: 'github_create_or_update_file', description: '创建/更新文件', category: 'repos' },
    { name: 'github_delete_file', description: '删除文件', category: 'repos' },
    { name: 'github_list_starred_repositories', description: '列出星标仓库', category: 'repos' },
    { name: 'github_star_repository', description: 'Star 仓库', category: 'repos' },
    { name: 'github_unstar_repository', description: 'Unstar 仓库', category: 'repos' },
    
    // Issues 工具
    { name: 'github_issue_read', description: '读取 Issue', category: 'issues' },
    { name: 'github_search_issues', description: '搜索 Issues', category: 'issues' },
    { name: 'github_list_issues', description: '列出 Issues', category: 'issues' },
    { name: 'github_issue_write', description: '创建/更新 Issue', category: 'issues' },
    { name: 'github_add_issue_comment', description: '添加 Issue 评论', category: 'issues' },
    { name: 'github_get_label', description: '获取标签', category: 'issues' },
    { name: 'github_list_labels', description: '列出标签', category: 'issues' },
    { name: 'github_label_write', description: '创建/更新标签', category: 'issues' },
    
    // Pull Requests 工具
    { name: 'github_pull_request_read', description: '读取 PR', category: 'pull_requests' },
    { name: 'github_list_pull_requests', description: '列出 PRs', category: 'pull_requests' },
    { name: 'github_search_pull_requests', description: '搜索 PRs', category: 'pull_requests' },
    { name: 'github_create_pull_request', description: '创建 PR', category: 'pull_requests' },
    { name: 'github_update_pull_request', description: '更新 PR', category: 'pull_requests' },
    { name: 'github_merge_pull_request', description: '合并 PR', category: 'pull_requests' },
    { name: 'github_request_reviewers', description: '请求审查', category: 'pull_requests' },
    { name: 'github_add_pull_request_comment', description: '添加 PR 评论', category: 'pull_requests' },
    
    // Actions 工具
    { name: 'github_actions_list', description: '列出工作流', category: 'actions' },
    { name: 'github_actions_get', description: '获取工作流', category: 'actions' },
    { name: 'github_actions_run_trigger', description: '触发工作流', category: 'actions' },
    { name: 'github_actions_get_job_logs', description: '获取 Job 日志', category: 'actions' },
    { name: 'github_list_workflow_runs', description: '列出运行记录', category: 'actions' },
    { name: 'github_get_workflow_run', description: '获取运行详情', category: 'actions' },
    { name: 'github_cancel_workflow_run', description: '取消运行', category: 'actions' },
    { name: 'github_list_jobs_for_workflow_run', description: '列出 Jobs', category: 'actions' },
    
    // 搜索工具
    { name: 'github_search_repositories', description: '搜索仓库', category: 'search' },
    { name: 'github_search_code', description: '搜索代码', category: 'search' },
    { name: 'github_search_issues', description: '搜索 Issues', category: 'search' },
    { name: 'github_search_pull_requests', description: '搜索 PRs', category: 'search' },
    { name: 'github_search_users', description: '搜索用户', category: 'search' },
    
    // 用户/组织工具
    { name: 'github_get_me', description: '获取当前用户', category: 'users' },
    { name: 'github_get_user', description: '获取用户', category: 'users' },
    { name: 'github_search_users', description: '搜索用户', category: 'users' },
    { name: 'github_get_teams', description: '获取团队', category: 'users' },
    { name: 'github_get_team_members', description: '获取成员', category: 'users' },
    { name: 'github_search_orgs', description: '搜索组织', category: 'users' },
    { name: 'github_get_org', description: '获取组织', category: 'users' },
    
    // Gists 工具
    { name: 'github_list_gists', description: '列出 Gists', category: 'gists' },
    { name: 'github_get_gist', description: '获取 Gist', category: 'gists' },
    { name: 'github_create_gist', description: '创建 Gist', category: 'gists' },
    { name: 'github_update_gist', description: '更新 Gist', category: 'gists' },
    { name: 'github_delete_gist', description: '删除 Gist', category: 'gists' },
    
    // 通知工具
    { name: 'github_list_notifications', description: '列出通知', category: 'notifications' },
    { name: 'github_get_notification_details', description: '获取通知详情', category: 'notifications' },
    { name: 'github_mark_all_notifications_read', description: '全部已读', category: 'notifications' },
    { name: 'github_mark_thread_as_read', description: '标记已读', category: 'notifications' },
    { name: 'github_set_thread_subscription', description: '设置订阅', category: 'notifications' },
  ];
}

// 导出工具列表
export const TOOLS = getToolList();
