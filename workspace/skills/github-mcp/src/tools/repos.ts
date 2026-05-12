/**
 * 仓库工具 (Repository Tools)
 * 参照官方 github-mcp-server repos toolset
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
 * 获取文件内容
 * 中文名: 获取文件内容
 */
export async function getFileContents(params: {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getFileContents(params.owner, params.repo, params.path, params.ref);
}

/**
 * 列出提交
 * 中文名: 列出提交
 */
export async function listCommits(params: {
  owner: string;
  repo: string;
  sha?: string;
  path?: string;
  author?: string;
  since?: string;
  until?: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listCommits(params.owner, params.repo, params);
}

/**
 * 获取提交
 * 中文名: 获取提交
 */
export async function getCommit(params: {
  owner: string;
  repo: string;
  ref: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getCommit(params.owner, params.repo, params.ref);
}

/**
 * 列出分支
 * 中文名: 列出分支
 */
export async function listBranches(params: {
  owner: string;
  repo: string;
  protected?: boolean;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listBranches(params.owner, params.repo, params);
}

/**
 * 列出标签
 * 中文名: 列出标签
 */
export async function listTags(params: {
  owner: string;
  repo: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listTags(params.owner, params.repo, params);
}

/**
 * 获取最新 Release
 * 中文名: 获取最新版本
 */
export async function getLatestRelease(params: {
  owner: string;
  repo: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getLatestRelease(params.owner, params.repo);
}

/**
 * 列出 Releases
 * 中文名: 列出版本
 */
export async function listReleases(params: {
  owner: string;
  repo: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listReleases(params.owner, params.repo, params);
}

/**
 * 创建仓库
 * 中文名: 创建仓库
 */
export async function createRepository(params: {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.createRepository(params);
}

/**
 * Fork 仓库
 * 中文名: Fork仓库
 */
export async function forkRepository(params: {
  owner: string;
  repo: string;
  organization?: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.forkRepository(params.owner, params.repo, params.organization);
}

/**
 * 创建分支
 * 中文名: 创建分支
 */
export async function createBranch(params: {
  owner: string;
  repo: string;
  ref: string;
  sha: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.createBranch(params.owner, params.repo, { ref: params.ref, sha: params.sha });
}

/**
 * 创建/更新文件
 * 中文名: 创建/更新文件
 */
export async function createOrUpdateFile(params: {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string;
  sha?: string;
  branch?: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.createOrUpdateFile(params.owner, params.repo, params.path, {
    message: params.message,
    content: Buffer.from(params.content).toString('base64'),
    sha: params.sha,
    branch: params.branch,
  });
}

/**
 * 删除文件
 * 中文名: 删除文件
 */
export async function deleteFile(params: {
  owner: string;
  repo: string;
  path: string;
  message: string;
  sha: string;
  branch?: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.deleteFile(params.owner, params.repo, params.path, {
    message: params.message,
    sha: params.sha,
    branch: params.branch,
  });
}

/**
 * 列出星标仓库
 * 中文名: 列出星标
 */
export async function listStarredRepositories(params?: {
  username?: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  const username = params?.username || await client.getUsername();
  return client.listStarredRepositories(username, params);
}

/**
 * Star 仓库
 * 中文名: 收藏仓库
 */
export async function starRepository(params: {
  owner: string;
  repo: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.starRepository(params.owner, params.repo);
}

/**
 * Unstar 仓库
 * 中文名: 取消收藏
 */
export async function unstarRepository(params: {
  owner: string;
  repo: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.unstarRepository(params.owner, params.repo);
}
