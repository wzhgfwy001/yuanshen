/**
 * Pull Requests 工具
 * 参照官方 github-mcp-server pull_requests toolset
 */

import { getGitHubClient } from '../github/client';
import { ToolResult } from '../github/types';

/**
 * 读取 Pull Request
 * 中文名: 读取PR
 */
export async function pullRequestRead(params: {
  owner: string;
  repo: string;
  pull_number: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getPullRequest(params.owner, params.repo, params.pull_number);
}

/**
 * 列出 Pull Requests
 * 中文名: 列出PR
 */
export async function listPullRequests(params: {
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  head?: string;
  base?: string;
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listPullRequests(params.owner, params.repo, params);
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
 * 创建 Pull Request
 * 中文名: 创建PR
 */
export async function createPullRequest(params: {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.createPullRequest(params.owner, params.repo, params);
}

/**
 * 更新 Pull Request
 * 中文名: 更新PR
 */
export async function updatePullRequest(params: {
  owner: string;
  repo: string;
  pull_number: number;
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.updatePullRequest(params.owner, params.repo, params.pull_number, {
    title: params.title,
    body: params.body,
    state: params.state,
  });
}

/**
 * 合并 Pull Request
 * 中文名: 合并PR
 */
export async function mergePullRequest(params: {
  owner: string;
  repo: string;
  pull_number: number;
  commit_title?: string;
  commit_message?: string;
  merge_method?: 'merge' | 'squash' | 'rebase';
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.mergePullRequest(params.owner, params.repo, params.pull_number, {
    commit_title: params.commit_title,
    commit_message: params.commit_message,
    merge_method: params.merge_method,
  });
}

/**
 * 请求审查
 * 中文名: 请求审查
 */
export async function requestReviewers(params: {
  owner: string;
  repo: string;
  pull_number: number;
  reviewers?: string[];
  team_reviewers?: string[];
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('POST', `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/requested_reviewers`, {
    reviewers: params.reviewers,
    team_reviewers: params.team_reviewers,
  });
}

/**
 * 添加 PR 评论
 * 中文名: 添加PR评论
 */
export async function addPullRequestComment(params: {
  owner: string;
  repo: string;
  pull_number: number;
  body: string;
  commit_id?: string;
  path?: string;
  position?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('POST', `/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}/comments`, {
    body: params.body,
    commit_id: params.commit_id,
    path: params.path,
    position: params.position,
  });
}
