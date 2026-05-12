/**
 * Issues 工具
 * 参照官方 github-mcp-server issues toolset
 */

import { getGitHubClient } from '../github/client';
import { ToolResult } from '../github/types';

/**
 * 读取 Issue
 * 中文名: 读取Issue
 */
export async function issueRead(params: {
  owner: string;
  repo: string;
  issue_number: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getIssue(params.owner, params.repo, params.issue_number);
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
 * 列出 Issues
 * 中文名: 列出Issue
 */
export async function listIssues(params: {
  owner: string;
  repo: string;
  milestone?: string;
  state?: 'open' | 'closed' | 'all';
  labels?: string;
  assignee?: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listIssues(params.owner, params.repo, params);
}

/**
 * Issue 写入 (创建/更新)
 * 中文名: 写入Issue
 */
export async function issueWrite(params: {
  owner: string;
  repo: string;
  issue_number?: number;
  title: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
}): Promise<ToolResult> {
  const client = getGitHubClient();
  
  if (params.issue_number) {
    // 更新现有 Issue
    return client.updateIssue(params.owner, params.repo, params.issue_number, {
      title: params.title,
      body: params.body,
      state: params.state,
      labels: params.labels,
      assignees: params.assignees,
    });
  } else {
    // 创建新 Issue
    return client.createIssue(params.owner, params.repo, {
      title: params.title,
      body: params.body,
      labels: params.labels,
      assignees: params.assignees,
    });
  }
}

/**
 * 添加 Issue 评论
 * 中文名: 添加评论
 */
export async function addIssueComment(params: {
  owner: string;
  repo: string;
  issue_number: number;
  body: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.addIssueComment(params.owner, params.repo, params.issue_number, params.body);
}

/**
 * 获取标签
 * 中文名: 获取标签
 */
export async function getLabel(params: {
  owner: string;
  repo: string;
  name: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('GET', `/repos/${params.owner}/${params.repo}/labels/${params.name}`);
}

/**
 * 列出标签
 * 中文名: 列出标签
 */
export async function listLabels(params: {
  owner: string;
  repo: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('GET', `/repos/${params.owner}/${params.repo}/labels`, undefined, {
    per_page: params.per_page,
    page: params.page,
  });
}

/**
 * 创建/更新标签
 * 中文名: 管理标签
 */
export async function labelWrite(params: {
  owner: string;
  repo: string;
  name: string;
  color?: string;
  description?: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('PUT', `/repos/${params.owner}/${params.repo}/labels/${params.name}`, {
    name: params.name,
    color: params.color,
    description: params.description,
  });
}
