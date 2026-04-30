/**
 * GitHub MCP 类型定义
 * 参照官方 github-mcp-server 类型设计
 */

// ============ 通用类型 ============

export interface GitHubConfig {
  token?: string;
  sshKeyPath?: string;
  username?: string;
  apiUrl: string;
  graphqlUrl: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface OwnerRepoParams {
  owner: string;
  repo: string;
}

export interface BranchParams extends OwnerRepoParams {
  branch?: string;
}

// ============ 仓库类型 ============

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface SearchRepositoriesParams extends PaginationParams {
  query: string;
  sort?: 'stars' | 'forks' | 'updated' | 'best-match';
  order?: 'asc' | 'desc';
}

export interface GetFileContentsParams extends BranchParams {
  path: string;
}

export interface FileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer?: {
    name: string;
    email: string;
    date: string;
  };
  parents: { sha: string }[];
}

export interface Branch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

export interface Release {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
}

// ============ Issues 类型 ============

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: {
    login: string;
    id: number;
  };
  labels: { name: string; color: string }[];
  assignee: string | null;
  assignees: { login: string }[];
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  url: string;
}

export interface IssueComment {
  id: number;
  body: string;
  user: { login: string };
  created_at: string;
  updated_at: string;
}

export interface CreateIssueParams extends OwnerRepoParams {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

export interface UpdateIssueParams extends CreateIssueParams {
  issue_number: number;
  state?: 'open' | 'closed';
}

// ============ Pull Requests 类型 ============

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: {
    login: string;
  };
  labels: { name: string; color: string }[];
  assignees: { login: string }[];
  reviewers?: { login: string; state: string }[];
  requested_reviewers?: { login: string }[];
  comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  mergeable_state: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export interface CreatePullRequestParams extends OwnerRepoParams {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}

export interface MergePullRequestParams extends OwnerRepoParams {
  pull_number: number;
  commit_title?: string;
  commit_message?: string;
  merge_method?: 'merge' | 'squash' | 'rebase';
}

// ============ Actions 类型 ============

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
  workflow_id: number;
  created_at: string;
  updated_at: string;
  run_number: number;
  event: string;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  logs_url: string;
}

// ============ 搜索类型 ============

export interface SearchCodeParams extends PaginationParams {
  q: string;
  sort?: 'indexed' | 'stars';
  order?: 'asc' | 'desc';
}

export interface SearchCodeResult {
  total_count: number;
  incomplete_results: boolean;
  items: {
    name: string;
    path: string;
    sha: string;
    url: string;
    repository: {
      full_name: string;
    };
  }[];
}

// ============ 用户/组织类型 ============

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string;
  location: string | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  privacy: string;
  permission: string;
}

// ============ Gist 类型 ============

export interface Gist {
  id: string;
  url: string;
  html_url: string;
  files: Record<string, { filename: string; type: string; raw_url: string; size: number }>;
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string | null;
}

export interface CreateGistParams {
  description?: string;
  public?: boolean;
  files: Record<string, { content: string }>;
}

// ============ 通知类型 ============

export interface Notification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string | null;
    type: string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
  };
}

// ============ 工具结果类型 ============

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ 工具输入类型 ============

export type ToolInput = Record<string, any>;
