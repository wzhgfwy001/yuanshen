/**
 * GitHub MCP 默认配置
 */

export interface GitHubMCPConfig {
  // SSH Key 路径
  sshKeyPath: string;
  
  // GitHub 用户名
  githubUsername: string;
  
  // GitHub Token (可选, 如果有的话)
  token?: string;
  
  // API 配置
  apiUrl: string;
  graphqlUrl: string;
  
  // 默认分页大小
  defaultPerPage: number;
  
  // 超时配置 (毫秒)
  timeout: number;
  
  // 重试配置
  retries: number;
}

// 默认配置
export const DEFAULT_CONFIG: GitHubMCPConfig = {
  sshKeyPath: 'C:\\Users\\DELL\\.ssh\\id_ed25519_github',
  githubUsername: 'wzhgfwy001',
  apiUrl: 'https://api.github.com',
  graphqlUrl: 'https://api.github.com/graphql',
  defaultPerPage: 30,
  timeout: 30000,
  retries: 3,
};

// 配置验证
export function validateConfig(config: Partial<GitHubMCPConfig>): GitHubMCPConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}
