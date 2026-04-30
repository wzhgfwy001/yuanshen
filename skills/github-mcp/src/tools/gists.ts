/**
 * Gists 工具
 * 参照官方 github-mcp-server gists toolset
 */

import { getGitHubClient } from '../github/client';
import { ToolResult } from '../github/types';

/**
 * 列出 Gists
 * 中文名: 列出Gist
 */
export async function listGists(params?: {
  username?: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  const username = params?.username || await client.getUsername();
  return client.listGists(username, params);
}

/**
 * 获取 Gist
 * 中文名: 获取Gist
 */
export async function getGist(params: {
  gist_id: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getGist(params.gist_id);
}

/**
 * 创建 Gist
 * 中文名: 创建Gist
 */
export async function createGist(params: {
  description?: string;
  public?: boolean;
  files: Record<string, { content: string }>;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.createGist({
    description: params.description,
    public: params.public ?? false,
    files: params.files,
  });
}

/**
 * 更新 Gist
 * 中文名: 更新Gist
 */
export async function updateGist(params: {
  gist_id: string;
  description?: string;
  files?: Record<string, { content?: string }>;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.updateGist(params.gist_id, {
    description: params.description,
    files: params.files,
  });
}

/**
 * 删除 Gist
 * 中文名: 删除Gist
 */
export async function deleteGist(params: {
  gist_id: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('DELETE', `/gists/${params.gist_id}`);
}
