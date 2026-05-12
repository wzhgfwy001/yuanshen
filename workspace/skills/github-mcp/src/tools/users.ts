/**
 * 用户/组织工具
 * 参照官方 github-mcp-server users/orgs toolsets
 */

import { getGitHubClient } from '../github/client';
import { ToolResult } from '../github/types';

/**
 * 获取当前用户
 * 中文名: 获取当前用户
 */
export async function getMe(): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getMe();
}

/**
 * 获取用户信息
 * 中文名: 获取用户
 */
export async function getUser(params: {
  username: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getUser(params.username);
}

/**
 * 搜索用户
 * 中文名: 搜索用户
 */
export async function searchUsers(params: {
  q: string;
  sort?: 'followers' | 'joined' | 'repositories';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.searchUsers(params);
}

/**
 * 获取用户团队
 * 中文名: 获取团队
 */
export async function getTeams(params?: {
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getUserTeams(params);
}

/**
 * 获取团队成员
 * 中文名: 获取成员
 */
export async function getTeamMembers(params: {
  team_id: number;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getTeamMembers(params.team_id, params);
}

/**
 * 搜索组织
 * 中文名: 搜索组织
 */
export async function searchOrgs(params: {
  q: string;
  sort?: 'joined' | 'repositories' | 'pull_requests';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.searchOrgs(params);
}

/**
 * 获取组织信息
 * 中文名: 获取组织
 */
export async function getOrg(params: {
  org: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('GET', `/orgs/${params.org}`);
}
