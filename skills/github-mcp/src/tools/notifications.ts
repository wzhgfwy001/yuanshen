/**
 * 通知工具
 * 参照官方 github-mcp-server notifications toolset
 */

import { getGitHubClient } from '../github/client';
import { ToolResult } from '../github/types';

/**
 * 列出通知
 * 中文名: 列出通知
 */
export async function listNotifications(params?: {
  all?: boolean;
  participating?: boolean;
  since?: string;
  before?: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listNotifications(params);
}

/**
 * 获取通知详情
 * 中文名: 获取通知详情
 */
export async function getNotificationDetails(params: {
  thread_id: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('GET', `/notifications/threads/${params.thread_id}`);
}

/**
 * 标记所有通知为已读
 * 中文名: 全部已读
 */
export async function markAllNotificationsRead(params?: {
  last_read_at?: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.markAllNotificationsRead(params);
}

/**
 * 标记单个线程为已读
 * 中文名: 标记已读
 */
export async function markThreadAsRead(params: {
  thread_id: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('PATCH', `/notifications/threads/${params.thread_id}`);
}

/**
 * 设置线程订阅
 * 中文名: 设置订阅
 */
export async function setThreadSubscription(params: {
  thread_id: number;
  ignored?: boolean;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('PUT', `/notifications/threads/${params.thread_id}/subscription`, {
    ignored: params.ignored,
  });
}
