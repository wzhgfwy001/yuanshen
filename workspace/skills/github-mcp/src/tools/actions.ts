/**
 * Actions 工具
 * 参照官方 github-mcp-server actions toolset
 */

import { getGitHubClient } from '../github/client';
import { ToolResult } from '../github/types';

/**
 * 列出工作流
 * 中文名: 列出工作流
 */
export async function actionsList(params: {
  owner: string;
  repo: string;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.listWorkflows(params.owner, params.repo);
}

/**
 * 获取工作流
 * 中文名: 获取工作流
 */
export async function actionsGet(params: {
  owner: string;
  repo: string;
  workflow_id: string | number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getWorkflow(params.owner, params.repo, params.workflow_id);
}

/**
 * 触发工作流运行
 * 中文名: 触发运行
 */
export async function actionsRunTrigger(params: {
  owner: string;
  repo: string;
  workflow_id: string;
  ref: string;
  inputs?: Record<string, string>;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.triggerWorkflow(params.owner, params.repo, params.workflow_id, {
    ref: params.ref,
    inputs: params.inputs,
  });
}

/**
 * 获取 Job 日志
 * 中文名: 获取日志
 */
export async function actionsGetJobLogs(params: {
  owner: string;
  repo: string;
  job_id: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.getJobLogs(params.owner, params.repo, params.job_id);
}

/**
 * 列出 workflow runs
 * 中文名: 列出运行记录
 */
export async function listWorkflowRuns(params: {
  owner: string;
  repo: string;
  workflow_id: string | number;
  branch?: string;
  event?: string;
  status?: string;
  per_page?: number;
  page?: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('GET', `/repos/${params.owner}/${params.repo}/actions/workflows/${params.workflow_id}/runs`, undefined, {
    branch: params.branch,
    event: params.event,
    status: params.status,
    per_page: params.per_page,
    page: params.page,
  });
}

/**
 * 获取 workflow run
 * 中文名: 获取运行详情
 */
export async function getWorkflowRun(params: {
  owner: string;
  repo: string;
  run_id: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('GET', `/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}`);
}

/**
 * 取消 workflow run
 * 中文名: 取消运行
 */
export async function cancelWorkflowRun(params: {
  owner: string;
  repo: string;
  run_id: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('POST', `/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}/cancel`);
}

/**
 * 列出 jobs
 * 中文名: 列出Jobs
 */
export async function listJobsForWorkflowRun(params: {
  owner: string;
  repo: string;
  run_id: number;
}): Promise<ToolResult> {
  const client = getGitHubClient();
  return client.rest('GET', `/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}/jobs`);
}
