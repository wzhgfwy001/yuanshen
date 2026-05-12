#!/usr/bin/env node
/**
 * GitHub MCP CLI - 命令行工具
 * 用于从命令行调用 GitHub API
 */

const { getGitHubClient } = require('../dist/github/client');

// 解析命令
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  const client = getGitHubClient();
  
  try {
    switch (command) {
      case 'user':
        // 获取用户信息
        const username = args[1] || 'wzhgfwy001';
        const userResult = await client.rest('GET', `/users/${username}`);
        console.log(JSON.stringify(userResult, null, 2));
        break;
        
      case 'repos':
        // 列出用户仓库
        const owner = args[1] || 'wzhgfwy001';
        const reposResult = await client.rest('GET', `/users/${owner}/repos`, undefined, { per_page: 10 });
        console.log(JSON.stringify(reposResult, null, 2));
        break;
        
      case 'search':
        // 搜索仓库
        const query = args.slice(1).join(' ') || 'user:wzhgfwy001';
        const searchResult = await client.searchRepositories({ q: query, per_page: 5 });
        console.log(JSON.stringify(searchResult, null, 2));
        break;
        
      case 'repo':
        // 获取仓库详情
        const [owner2, repo] = args.slice(1, 3);
        if (!repo) {
          console.error('用法: github-mcp repo <owner> <repo>');
          process.exit(1);
        }
        const repoResult = await client.rest('GET', `/repos/${owner2}/${repo}`);
        console.log(JSON.stringify(repoResult, null, 2));
        break;
        
      case 'issues':
        // 列出 Issues
        const [issueOwner, issueRepo] = args.slice(1, 3);
        if (!issueRepo) {
          console.error('用法: github-mcp issues <owner> <repo>');
          process.exit(1);
        }
        const issuesResult = await client.listIssues(issueOwner, issueRepo, { per_page: 10 });
        console.log(JSON.stringify(issuesResult, null, 2));
        break;
        
      case 'commits':
        // 列出提交
        const [commitOwner, commitRepo] = args.slice(1, 3);
        if (!commitRepo) {
          console.error('用法: github-mcp commits <owner> <repo>');
          process.exit(1);
        }
        const commitsResult = await client.listCommits(commitOwner, commitRepo, { per_page: 5 });
        console.log(JSON.stringify(commitsResult, null, 2));
        break;
        
      case 'branches':
        // 列出分支
        const [branchOwner, branchRepo] = args.slice(1, 3);
        if (!branchRepo) {
          console.error('用法: github-mcp branches <owner> <repo>');
          process.exit(1);
        }
        const branchesResult = await client.listBranches(branchOwner, branchRepo);
        console.log(JSON.stringify(branchesResult, null, 2));
        break;
        
      case 'file':
        // 获取文件内容
        const [fileOwner, fileRepo, ...filePathParts] = args.slice(1, 4);
        const filePath = filePathParts.join('/');
        if (!filePath) {
          console.error('用法: github-mcp file <owner> <repo> <path>');
          process.exit(1);
        }
        const fileResult = await client.getFileContents(fileOwner, fileRepo, filePath);
        console.log(JSON.stringify(fileResult, null, 2));
        break;
        
      case 'actions':
        // 列出 Actions
        const [actionOwner, actionRepo] = args.slice(1, 3);
        if (!actionRepo) {
          console.error('用法: github-mcp actions <owner> <repo>');
          process.exit(1);
        }
        const actionsResult = await client.listWorkflows(actionOwner, actionRepo);
        console.log(JSON.stringify(actionsResult, null, 2));
        break;
        
      case 'help':
      default:
        console.log(`
GitHub MCP CLI - GitHub API 命令行工具

用法: github-mcp <command> [options]

命令:
  user [username]          获取用户信息 (默认: wzhgfwy001)
  repos [owner]             列出用户仓库 (默认: wzhgfwy001)
  search <query>            搜索仓库
  repo <owner> <repo>       获取仓库详情
  issues <owner> <repo>     列出 Issues
  commits <owner> <repo>    列出提交
  branches <owner> <repo>   列出分支
  file <owner> <repo> <path> 获取文件内容
  actions <owner> <repo>    列出 Actions
  help                      显示帮助

示例:
  github-mcp user wzhgfwy001
  github-mcp repo wzhgfwy001 yuanshen
  github-mcp search user:wzhgfwy001
  github-mcp issues wzhgfwy001 yuanshen
        `);
        process.exit(command === 'help' ? 0 : 1);
    }
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
