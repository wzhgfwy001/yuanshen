/**
 * GitHub API Client
 * 支持 REST API 和 GraphQL API
 * 复用 SSH Key 进行认证
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { GitHubConfig, ToolResult, ToolInput } from './types';

// 默认配置
const DEFAULT_CONFIG: GitHubConfig = {
  apiUrl: 'https://api.github.com',
  graphqlUrl: 'https://api.github.com/graphql',
};

export class GitHubClient {
  private restClient: AxiosInstance;
  private graphqlClient: AxiosInstance;
  private config: GitHubConfig;
  private username: string;

  constructor(config: Partial<GitHubConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 创建 REST API 客户端
    this.restClient = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` }),
      },
      timeout: 30000,
    });

    // 创建 GraphQL API 客户端
    this.graphqlClient = axios.create({
      baseURL: this.config.graphqlUrl,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(this.config.token && { 'Authorization': `Bearer ${this.config.token}` }),
      },
      timeout: 30000,
    });

    this.username = this.config.username || '';
  }

  /**
   * 从 SSH Key 文件获取认证信息
   */
  static async fromSSHKey(sshKeyPath: string, username: string): Promise<GitHubClient> {
    // 验证 SSH Key 文件存在
    if (!fs.existsSync(sshKeyPath)) {
      throw new Error(`SSH Key 文件不存在: ${sshKeyPath}`);
    }

    // 注意：SSH Key 不能直接用于 REST/GraphQL API 认证
    // 需要使用 GitHub Token 进行 API 调用
    // SSH Key 主要用于 git 操作
    const config: Partial<GitHubConfig> = {
      sshKeyPath,
      username,
    };

    return new GitHubClient(config);
  }

  /**
   * 设置 GitHub Token
   */
  setToken(token: string): void {
    this.config.token = token;
    this.restClient.defaults.headers['Authorization'] = `Bearer ${token}`;
    this.graphqlClient.defaults.headers['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 获取当前用户名
   */
  async getUsername(): Promise<string> {
    if (this.username) return this.username;
    
    try {
      const response = await this.restClient.get('/user');
      this.username = response.data.login;
      return this.username;
    } catch (error) {
      throw new Error(`获取用户信息失败: ${error}`);
    }
  }

  /**
   * 通用 REST API 调用
   */
  async rest<T = any>(method: string, endpoint: string, data?: any, params?: any): Promise<ToolResult<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        data,
        params,
      };
      
      const response = await this.restClient.request<T>(config);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error',
      };
    }
  }

  /**
   * GraphQL 查询
   */
  async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<ToolResult<T>> {
    try {
      const response = await this.graphqlClient.request<{ data: T; errors?: any[] }>({
        data: { query, variables },
      });

      if (response.data.errors && response.data.errors.length > 0) {
        return {
          success: false,
          error: response.data.errors.map((e: any) => e.message).join(', '),
        };
      }

      return { success: true, data: response.data.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error',
      };
    }
  }

  // ==================== 仓库操作 ====================

  /**
   * 搜索仓库
   */
  async searchRepositories(params: { q: string; sort?: string; order?: string; per_page?: number; page?: number }) {
    return this.rest('GET', '/search/repositories', undefined, params);
  }

  /**
   * 获取仓库详情
   */
  async getRepository(owner: string, repo: string) {
    return this.rest('GET', `/repos/${owner}/${repo}`);
  }

  /**
   * 获取文件内容
   */
  async getFileContents(owner: string, repo: string, path: string, ref?: string) {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    const params = ref ? { ref } : undefined;
    return this.rest('GET', endpoint, undefined, params);
  }

  /**
   * 列出提交
   */
  async listCommits(owner: string, repo: string, params?: { sha?: string; path?: string; author?: string; since?: string; until?: string; per_page?: number; page?: number }) {
    return this.rest('GET', `/repos/${owner}/${repo}/commits`, undefined, params);
  }

  /**
   * 获取单个提交
   */
  async getCommit(owner: string, repo: string, ref: string) {
    return this.rest('GET', `/repos/${owner}/${repo}/commits/${ref}`);
  }

  /**
   * 列出分支
   */
  async listBranches(owner: string, repo: string, params?: { protected?: boolean; per_page?: number; page?: number }) {
    return this.rest('GET', `/repos/${owner}/${repo}/branches`, undefined, params);
  }

  /**
   * 列出标签
   */
  async listTags(owner: string, repo: string, params?: { per_page?: number; page?: number }) {
    return this.rest('GET', `/repos/${owner}/${repo}/tags`, undefined, params);
  }

  /**
   * 获取最新 Release
   */
  async getLatestRelease(owner: string, repo: string) {
    return this.rest('GET', `/repos/${owner}/${repo}/releases/latest`);
  }

  /**
   * 列出 Releases
   */
  async listReleases(owner: string, repo: string, params?: { per_page?: number; page?: number }) {
    return this.rest('GET', `/repos/${owner}/${repo}/releases`, undefined, params);
  }

  /**
   * 创建仓库
   */
  async createRepository(data: { name: string; description?: string; private?: boolean; auto_init?: boolean }) {
    return this.rest('POST', '/user/repos', data);
  }

  /**
   * Fork 仓库
   */
  async forkRepository(owner: string, repo: string, organization?: string) {
    const endpoint = `/repos/${owner}/${repo}/forks`;
    const data = organization ? { organization } : undefined;
    return this.rest('POST', endpoint, data);
  }

  /**
   * 创建分支
   */
  async createBranch(owner: string, repo: string, data: { ref: string; sha: string }) {
    return this.rest('POST', `/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${data.ref}`,
      sha: data.sha,
    });
  }

  /**
   * 创建/更新文件
   */
  async createOrUpdateFile(owner: string, repo: string, path: string, data: { message: string; content: string; sha?: string; branch?: string }) {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    return this.rest('PUT', endpoint, data);
  }

  /**
   * 删除文件
   */
  async deleteFile(owner: string, repo: string, path: string, data: { message: string; sha: string; branch?: string }) {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}`;
    return this.rest('DELETE', endpoint, data);
  }

  /**
   * 列出星标仓库
   */
  async listStarredRepositories(username: string, params?: { per_page?: number; page?: number }) {
    return this.rest('GET', `/users/${username}/starred`, undefined, params);
  }

  /**
   * Star 仓库
   */
  async starRepository(owner: string, repo: string) {
    return this.rest('PUT', `/user/starred/${owner}/${repo}`);
  }

  /**
   * Unstar 仓库
   */
  async unstarRepository(owner: string, repo: string) {
    return this.rest('DELETE', `/user/starred/${owner}/${repo}`);
  }

  // ==================== Issues 操作 ====================

  /**
   * 获取 Issue
   */
  async getIssue(owner: string, repo: string, issueNumber: number) {
    return this.rest('GET', `/repos/${owner}/${repo}/issues/${issueNumber}`);
  }

  /**
   * 搜索 Issues
   */
  async searchIssues(params: { q: string; sort?: string; order?: string; per_page?: number; page?: number }) {
    return this.rest('GET', '/search/issues', undefined, params);
  }

  /**
   * 列出仓库 Issues
   */
  async listIssues(owner: string, repo: string, params?: { milestone?: string; state?: string; labels?: string; assignee?: string; per_page?: number; page?: number }) {
    return this.rest('GET', `/repos/${owner}/${repo}/issues`, undefined, params);
  }

  /**
   * 创建 Issue
   */
  async createIssue(owner: string, repo: string, data: { title: string; body?: string; labels?: string[]; assignees?: string[] }) {
    return this.rest('POST', `/repos/${owner}/${repo}/issues`, data);
  }

  /**
   * 更新 Issue
   */
  async updateIssue(owner: string, repo: string, issueNumber: number, data: { title?: string; body?: string; state?: string; labels?: string[]; assignees?: string[] }) {
    return this.rest('PATCH', `/repos/${owner}/${repo}/issues/${issueNumber}`, data);
  }

  /**
   * 添加 Issue 评论
   */
  async addIssueComment(owner: string, repo: string, issueNumber: number, body: string) {
    return this.rest('POST', `/repos/${owner}/${repo}/issues/${issueNumber}/comments`, { body });
  }

  // ==================== Pull Requests 操作 ====================

  /**
   * 获取 PR
   */
  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    return this.rest('GET', `/repos/${owner}/${repo}/pulls/${pullNumber}`);
  }

  /**
   * 列出 PRs
   */
  async listPullRequests(owner: string, repo: string, params?: { state?: string; head?: string; base?: string; sort?: string; per_page?: number; page?: number }) {
    return this.rest('GET', `/repos/${owner}/${repo}/pulls`, undefined, params);
  }

  /**
   * 搜索 PRs
   */
  async searchPullRequests(params: { q: string; sort?: string; order?: string; per_page?: number; page?: number }) {
    return this.rest('GET', '/search/issues', undefined, { ...params, type: 'pr' });
  }

  /**
   * 创建 PR
   */
  async createPullRequest(owner: string, repo: string, data: { title: string; body?: string; head: string; base: string; draft?: boolean }) {
    return this.rest('POST', `/repos/${owner}/${repo}/pulls`, data);
  }

  /**
   * 更新 PR
   */
  async updatePullRequest(owner: string, repo: string, pullNumber: number, data: { title?: string; body?: string; state?: string }) {
    return this.rest('PATCH', `/repos/${owner}/${repo}/pulls/${pullNumber}`, data);
  }

  /**
   * 合并 PR
   */
  async mergePullRequest(owner: string, repo: string, pullNumber: number, data?: { commit_title?: string; commit_message?: string; merge_method?: string }) {
    return this.rest('PUT', `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, data);
  }

  // ==================== Actions 操作 ====================

  /**
   * 列出工作流
   */
  async listWorkflows(owner: string, repo: string) {
    return this.rest('GET', `/repos/${owner}/${repo}/actions/workflows`);
  }

  /**
   * 获取工作流
   */
  async getWorkflow(owner: string, repo: string, workflowId: string | number) {
    return this.rest('GET', `/repos/${owner}/${repo}/actions/workflows/${workflowId}`);
  }

  /**
   * 触发工作流
   */
  async triggerWorkflow(owner: string, repo: string, workflowId: string, data: { ref: string; inputs?: Record<string, string> }) {
    return this.rest('POST', `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, data);
  }

  /**
   * 获取 Job 日志
   */
  async getJobLogs(owner: string, repo: string, jobId: number) {
    return this.rest('GET', `/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`);
  }

  // ==================== 搜索操作 ====================

  /**
   * 搜索代码
   */
  async searchCode(params: { q: string; sort?: string; order?: string; per_page?: number; page?: number }) {
    return this.rest('GET', '/search/code', undefined, params);
  }

  /**
   * 搜索用户
   */
  async searchUsers(params: { q: string; sort?: string; order?: string; per_page?: number; page?: number }) {
    return this.rest('GET', '/search/users', undefined, params);
  }

  // ==================== 用户/组织操作 ====================

  /**
   * 获取当前用户
   */
  async getMe() {
    return this.rest('GET', '/user');
  }

  /**
   * 获取用户信息
   */
  async getUser(username: string) {
    return this.rest('GET', `/users/${username}`);
  }

  /**
   * 获取用户团队
   */
  async getUserTeams(params?: { per_page?: number; page?: number }) {
    return this.rest('GET', '/user/teams', undefined, params);
  }

  /**
   * 获取团队成员
   */
  async getTeamMembers(teamId: number, params?: { per_page?: number; page?: number }) {
    return this.rest('GET', `/teams/${teamId}/members`, undefined, params);
  }

  /**
   * 搜索组织
   */
  async searchOrgs(params: { q: string; sort?: string; order?: string; per_page?: number; page?: number }) {
    return this.rest('GET', '/search/orgs', undefined, params);
  }

  // ==================== Gist 操作 ====================

  /**
   * 列出 Gists
   */
  async listGists(username: string, params?: { per_page?: number; page?: number }) {
    return this.rest('GET', `/users/${username}/gists`, undefined, params);
  }

  /**
   * 获取 Gist
   */
  async getGist(gistId: string) {
    return this.rest('GET', `/gists/${gistId}`);
  }

  /**
   * 创建 Gist
   */
  async createGist(data: { description?: string; public?: boolean; files: Record<string, { content: string }> }) {
    return this.rest('POST', '/gists', data);
  }

  /**
   * 更新 Gist
   */
  async updateGist(gistId: string, data: { description?: string; files?: Record<string, { content?: string }> }) {
    return this.rest('PATCH', `/gists/${gistId}`, data);
  }

  // ==================== 通知操作 ====================

  /**
   * 列出通知
   */
  async listNotifications(params?: { all?: boolean; participating?: boolean; since?: string; before?: string; per_page?: number; page?: number }) {
    return this.rest('GET', '/notifications', undefined, params);
  }

  /**
   * 标记所有通知为已读
   */
  async markAllNotificationsRead(data?: { last_read_at?: string }) {
    return this.rest('PUT', '/notifications', data);
  }
}

// 导出单例
let clientInstance: GitHubClient | null = null;

export function getGitHubClient(config?: Partial<GitHubConfig>): GitHubClient {
  if (!clientInstance) {
    clientInstance = new GitHubClient(config);
  }
  return clientInstance;
}
