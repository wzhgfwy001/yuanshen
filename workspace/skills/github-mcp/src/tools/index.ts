/**
 * GitHub MCP Tools - 统一导出
 * 导出所有 GitHub 工具
 * 
 * 注意: 某些工具在多个文件中定义(search*),使用别名避免冲突
 */

// 仓库工具
export * from './repos';

// Issues 工具
export * from './issues';

// Pull Requests 工具
export * from './pullrequests';

// Actions 工具
export * from './actions';

// 用户/组织工具
export * from './users';

// Gists 工具
export * from './gists';

// 通知工具
export * from './notifications';

// 搜索工具 (有重复函数名,只导出Search开头的版本)
export {
  searchCode,
} from './search';

// 别名导出 (避免重复)
// searchRepositories 在 repos.ts 中
export {
  searchRepositories as searchRepositoriesForSearch,
  searchIssues as searchIssuesForSearch,
  searchPullRequests as searchPullRequestsForSearch,
  searchUsers as searchUsersForSearch,
} from './search';
