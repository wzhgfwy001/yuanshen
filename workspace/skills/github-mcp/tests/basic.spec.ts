/**
 * GitHub MCP - 基础集成测试
 * 
 * 测试 GitHub API 核心功能
 * v1.1.0 - 包含 Bridge 集成测试
 */

import { createGitHubMCPBridge, GitHubMCPBridge } from '../src/bridge';
import { GitHubClient } from '../src/github/client';

describe('GitHub MCP Bridge', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  describe('Bridge Lifecycle', () => {
    test('should create bridge instance', () => {
      expect(bridge).toBeDefined();
    });

    test('should be connected after start', () => {
      expect(bridge.isConnected()).toBe(true);
    });

    test('should get client', () => {
      const client = bridge.getClient();
      expect(client).toBeDefined();
      expect(client instanceof GitHubClient).toBe(true);
    });
  });

  describe('Tool List', () => {
    test('should get tool list', () => {
      const tools = bridge.getToolList();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(50);
    });

    test('should get tool count', () => {
      const count = bridge.getToolCount();
      expect(count).toBeGreaterThan(50);
    });

    test('should get tools by category', () => {
      const reposTools = bridge.getToolsByCategory('repos');
      expect(Array.isArray(reposTools)).toBe(true);
      expect(reposTools.length).toBeGreaterThan(0);
      expect(reposTools[0].category).toBe('repos');
    });
  });

  describe('Capabilities', () => {
    test('should have github-repos capability', () => {
      expect(bridge.hasCapability('github-repos')).toBe(true);
    });

    test('should have github-issues capability', () => {
      expect(bridge.hasCapability('github-issues')).toBe(true);
    });

    test('should have github-pull_requests capability', () => {
      expect(bridge.hasCapability('github-pull_requests')).toBe(true);
    });

    test('should have github-actions capability', () => {
      expect(bridge.hasCapability('github-actions')).toBe(true);
    });

    test('should have github-search capability', () => {
      expect(bridge.hasCapability('github-search')).toBe(true);
    });

    test('should return false for unknown capability', () => {
      expect(bridge.hasCapability('unknown-capability')).toBe(false);
    });

    test('should get all capabilities', () => {
      const caps = bridge.getCapabilities();
      expect(Array.isArray(caps)).toBe(true);
      expect(caps.length).toBe(8);
    });
  });

  describe('Stats', () => {
    test('should get stats', () => {
      const stats = bridge.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalTools).toBeGreaterThan(50);
      expect(stats.connected).toBe(true);
      expect(stats.username).toBe('wzhgfwy001');
    });

    test('should have category count in stats', () => {
      const stats = bridge.getStats();
      expect(stats.categoryCount).toBeDefined();
      expect(stats.categoryCount['repos']).toBeGreaterThan(0);
      expect(stats.categoryCount['issues']).toBeGreaterThan(0);
    });
  });
});

describe('Repository Tools', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should search repositories', async () => {
    const result = await bridge.callTool('github_search_repositories', {
      q: 'user:wzhgfwy001',
      per_page: 5,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('github_search_repositories');
    expect(result.metadata?.category).toBe('repos');
  });

  test('should handle unknown repo tool', async () => {
    const result = await bridge.callTool('github_unknown_repo_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知工具');
  });
});

describe('Issues Tools', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should list issues', async () => {
    const result = await bridge.callTool('github_list_issues', {
      owner: 'wzhgfwy001',
      repo: 'yuanshen',
      per_page: 5,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('github_list_issues');
    expect(result.metadata?.category).toBe('issues');
  });

  test('should search issues', async () => {
    const result = await bridge.callTool('github_search_issues', {
      q: 'repo:wzhgfwy001/yuanshen bug',
      per_page: 5,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('github_search_issues');
    expect(result.metadata?.category).toBe('issues');
  });
});

describe('Pull Requests Tools', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should list pull requests', async () => {
    const result = await bridge.callTool('github_list_pull_requests', {
      owner: 'wzhgfwy001',
      repo: 'yuanshen',
      per_page: 5,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('github_list_pull_requests');
    expect(result.metadata?.category).toBe('pull_requests');
  });
});

describe('Actions Tools', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should list workflow runs', async () => {
    const result = await bridge.callTool('github_list_workflow_runs', {
      owner: 'wzhgfwy001',
      repo: 'yuanshen',
      per_page: 5,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('github_list_workflow_runs');
    expect(result.metadata?.category).toBe('actions');
  });
});

describe('Search Tools', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should search code', async () => {
    const result = await bridge.callTool('github_search_code', {
      q: 'repo:wzhgfwy001/yuanshen README',
      per_page: 5,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('github_search_code');
    expect(result.metadata?.category).toBe('search');
  });

  test('should search users', async () => {
    const result = await bridge.callTool('github_search_users', {
      q: 'wzhgfwy001',
      per_page: 5,
    });
    expect(result).toBeDefined();
    expect(result.metadata?.tool).toBe('github_search_users');
    expect(result.metadata?.category).toBe('users');
  });
});

describe('Error Handling', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should return error for unknown tool', async () => {
    const result = await bridge.callTool('github_nonexistent_tool', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('未知工具');
  });

  test('should include metadata in result', async () => {
    const result = await bridge.callTool('github_list_issues', {
      owner: 'wzhgfwy001',
      repo: 'yuanshen',
    });
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.tool).toBe('github_list_issues');
    expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('Tool Call Metadata', () => {
  let bridge: GitHubMCPBridge;

  beforeAll(async () => {
    bridge = createGitHubMCPBridge({
      username: 'wzhgfwy001',
    });
    await bridge.start();
  });

  afterAll(async () => {
    await bridge.stop();
  });

  test('should include correct category in metadata', async () => {
    const categories = ['repos', 'issues', 'pull_requests', 'actions', 'users', 'gists', 'notifications'] as const;
    
    const toolMap: Record<string, string> = {
      repos: 'github_list_branches',
      issues: 'github_list_issues',
      pull_requests: 'github_list_pull_requests',
      actions: 'github_list_workflow_runs',
      users: 'github_get_me',
      gists: 'github_list_gists',
      notifications: 'github_list_notifications',
    };

    for (const [category, toolName] of Object.entries(toolMap)) {
      const result = await bridge.callTool(toolName, {
        owner: 'wzhgfwy001',
        repo: 'yuanshen',
      });
      expect(result.metadata?.category).toBe(category);
    }
  });

  test('should measure duration in metadata', async () => {
    const result = await bridge.callTool('github_search_repositories', {
      q: 'test',
      per_page: 1,
    });
    expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
  });
});
