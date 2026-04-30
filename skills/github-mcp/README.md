# GitHub MCP Skill

GitHub MCP Skill 为元神系统提供 GitHub API 集成能力，复用已配置的 SSH Key，支持 80+ GitHub 操作工具。

## 特性

- 🔐 **复用 SSH Key** - 使用已配置的 `C:\Users\DELL\.ssh\id_ed25519_github`
- 🌐 **REST API + GraphQL** - 双接口支持
- 🎯 **80+ 工具** - 覆盖 GitHub 各类操作
- 📝 **中文工具名** - 更符合元神风格

## 安装

```bash
cd skills/github-mcp
npm install
npm run build
```

## 配置

```json
{
  "sshKeyPath": "C:\\Users\\DELL\\.ssh\\id_ed25519_github",
  "githubUsername": "wzhgfwy001",
  "token": "可选, 如果有 GitHub Token"
}
```

## 使用

```typescript
import { initialize, searchRepositories, createIssue } from './github-mcp';

// 初始化
await initialize();

// 搜索仓库
const result = await searchRepositories({ q: 'user:wzhgfwy001' });

// 创建 Issue
const issue = await createIssue({
  owner: 'wzhgfwy001',
  repo: 'yuanshen',
  title: 'Bug Report',
  body: '描述...'
});
```

## 工具列表

### 仓库工具 (repos)
| 工具 | 说明 |
|------|------|
| `github_search_repositories` | 搜索仓库 |
| `github_get_file_contents` | 获取文件内容 |
| `github_list_commits` | 列出提交 |
| `github_create_repository` | 创建仓库 |
| `github_fork_repository` | Fork仓库 |
| `github_star_repository` | Star仓库 |
| ... | |

### Issues 工具
| 工具 | 说明 |
|------|------|
| `github_issue_read` | 读取Issue |
| `github_issue_write` | 写入Issue |
| `github_search_issues` | 搜索Issue |
| `github_add_issue_comment` | 添加评论 |
| ... | |

### Pull Requests 工具
| 工具 | 说明 |
|------|------|
| `github_pull_request_read` | 读取PR |
| `github_create_pull_request` | 创建PR |
| `github_merge_pull_request` | 合并PR |
| ... | |

### Actions 工具
| 工具 | 说明 |
|------|------|
| `github_actions_list` | 列出工作流 |
| `github_actions_get` | 获取工作流 |
| `github_actions_run_trigger` | 触发运行 |
| `github_actions_get_job_logs` | 获取日志 |
| ... | |

## 与官方对比

| 特性 | 官方 Go 版本 | 元神 Skill |
|------|-------------|-----------|
| 工具数量 | 80+ | 80+ |
| 协议 | MCP | Skill |
| 工具名 | 英文 | 中文+英文 |
| SSH Key | 需配置 | 已配置 |
| OpenClaw | 需适配 | ✅ 原生 |

## 开发

```bash
# 构建
npm run build

# 开发模式 (监视)
npm run dev

# 测试
npm test
```

## 参考

- [GitHub REST API](https://docs.github.com/rest)
- [GitHub GraphQL API](https://docs.github.com/graphql)
- [官方 github-mcp-server](https://github.com/github/github-mcp-server)
