/**
 * 搜索工具
 * 参照官方 github-mcp-server search tools
 */

import { getGitHubClient } from '../github/client';
import { ToolResult } from '../github/types';

/**
 * 搜索仓库
 * 中文名: 搜索仓库
 */
export async function searchRepositories(params: {
  q: string;
  sort?: 'stars' | 'forks' | 'updated' | 'best-match';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.searchRepositories(params);
}

/**
 * 搜索代码
 * 中文名: 搜索代码
 */
export async function searchCode(params: {
  q: string;
  sort?: 'indexed';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.searchCode(params);
}

/**
 * 搜索 Issues
 * 中文名: 搜索Issue
 */
export async function searchIssues(params: {
  q: string;
  sort?: 'comments' | 'reactions' | 'created' | 'updated';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.searchIssues(params);
}

/**
 * 搜索 Pull Requests
 * 中文名: 搜索PR
 */
export async function searchPullRequests(params: {
  q: string;
  sort?: 'comments' | 'reactions' | 'created' | 'updated';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.searchPullRequests(params);
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
