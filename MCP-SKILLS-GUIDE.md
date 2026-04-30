# MCP 技能使用说明与触发机制

> **生成时间:** 2026-04-23  
> **技能数量:** 3 个 (GitHub MCP, Firecrawl MCP, Playwright MCP)

---

## 目录

1. [GitHub MCP](#1-github-mcp)
2. [Firecrawl MCP](#2-firecrawl-mcp)
3. [Playwright MCP](#3-playwright-mcp)

---

## 1. GitHub MCP

**版本:** v1.0.1  
**状态:** ✅ 正常使用  
**位置:** `skills/github-mcp/`

### 触发关键词

| 关键词分类 | 触发词 |
|------------|--------|
| 仓库相关 | github, 仓库, repo, 仓库信息 |
| Issues相关 | issue, issues, 问题, bug |
| PR相关 | pr, pull, pull request, 合并请求 |
| Actions相关 | actions, workflow, ci, cd, 工作流 |
| 搜索相关 | 搜索, search, 查找 |
| 用户相关 | 用户, user, 开发者 |
| 文件相关 | 文件, file, readme, 代码 |
| 提交相关 | commit, 提交, git |
| 分支相关 | branch, 分支 |

### 触发示例

```
用户: 帮我看看 GitHub 上的 wzhgfwy001/yuanshen 仓库
用户: 搜索一下有什么好看的 React 仓库
用户: 查看这个仓库的 Issues
用户: 创建个 PR
用户: 帮我爬一下 README.md
用户: 有哪些 Actions 在跑
用户: 列出所有分支
```

### CLI 使用方式

```bash
# 进入目录
cd skills/github-mcp

# 获取用户信息
node bin/cli.js user [username]

# 列出用户仓库
node bin/cli.js repos [owner]

# 搜索仓库
node bin/cli.js search <query>

# 获取仓库详情
node bin/cli.js repo <owner> <repo>

# 列出 Issues
node bin/cli.js issues <owner> <repo>

# 列出提交
node bin/cli.js commits <owner> <repo>

# 列出分支
node bin/cli.js branches <owner> <repo>

# 获取文件内容
node bin/cli.js file <owner> <repo> <path>

# 列出 Actions
node bin/cli.js actions <owner> <repo>

# 显示帮助
node bin/cli.js help
```

### 工具函数列表

#### 仓库工具 (repos)
| 工具名 | 说明 |
|--------|------|
| `github_search_repositories` | 搜索仓库 |
| `github_get_file_contents` | 获取文件内容 |
| `github_list_commits` | 列出提交 |
| `github_search_code` | 搜索代码 |
| `github_get_commit` | 获取提交详情 |
| `github_list_branches` | 列出分支 |
| `github_list_tags` | 列出标签 |
| `github_get_latest_release` | 获取最新 Release |
| `github_create_or_update_file` | 创建/更新文件 |
| `github_create_repository` | 创建仓库 |
| `github_fork_repository` | Fork 仓库 |
| `github_create_branch` | 创建分支 |
| `github_delete_file` | 删除文件 |
| `github_list_starred_repositories` | 列出星标仓库 |
| `github_star_repository` | 收藏仓库 |
| `github_unstar_repository` | 取消收藏 |

#### Issues 工具 (issues)
| 工具名 | 说明 |
|--------|------|
| `github_issue_read` | 读取 Issue |
| `github_search_issues` | 搜索 Issue |
| `github_list_issues` | 列出 Issue |
| `github_issue_write` | 创建/更新 Issue |
| `github_add_issue_comment` | 添加评论 |
| `github_list_labels` | 列出标签 |
| `github_get_label` | 获取标签 |

#### Pull Requests 工具 (pull_requests)
| 工具名 | 说明 |
|--------|------|
| `github_pull_request_read` | 读取 PR |
| `github_list_pull_requests` | 列出 PR |
| `github_search_pull_requests` | 搜索 PR |
| `github_merge_pull_request` | 合并 PR |
| `github_create_pull_request` | 创建 PR |
| `github_update_pull_request` | 更新 PR |
| `github_pull_request_review_write` | PR 审查 |

#### Actions 工具 (actions)
| 工具名 | 说明 |
|--------|------|
| `github_actions_list` | 列出工作流 |
| `github_actions_get` | 获取工作流详情 |
| `github_actions_run_trigger` | 触发运行 |
| `github_actions_get_job_logs` | 获取日志 |

#### 搜索工具 (search)
| 工具名 | 说明 |
|--------|------|
| `github_search_repositories` | 搜索仓库 |
| `github_search_code` | 搜索代码 |
| `github_search_issues` | 搜索 Issue |
| `github_search_pull_requests` | 搜索 PR |
| `github_search_users` | 搜索用户 |

#### 用户/组织工具 (users/orgs)
| 工具名 | 说明 |
|--------|------|
| `github_search_users` | 搜索用户 |
| `github_search_orgs` | 搜索组织 |
| `github_get_me` | 获取当前用户 |
| `github_get_teams` | 获取团队 |
| `github_get_team_members` | 获取成员 |

#### Gists 工具 (gists)
| 工具名 | 说明 |
|--------|------|
| `github_list_gists` | 列出 Gist |
| `github_get_gist` | 获取 Gist |
| `github_create_gist` | 创建 Gist |
| `github_update_gist` | 更新 Gist |

#### 通知工具 (notifications)
| 工具名 | 说明 |
|--------|------|
| `github_list_notifications` | 列出通知 |
| `github_mark_all_read` | 全部已读 |
| `github_get_notification_details` | 获取通知详情 |

### 认证方式

- **公开 API:** 无需认证，可访问公开仓库信息
- **私有操作:** 需要 GitHub Token (设置 `GITHUB_TOKEN` 环境变量)

---

## 2. Firecrawl MCP

**版本:** v1.0.0  
**状态:** ✅ 正常使用  
**位置:** `skills/firecrawl-mcp/`

### 触发关键词

| 关键词分类 | 触发词 |
|------------|--------|
| 爬取相关 | 爬取, crawl, 抓取, scraping |
| 网页相关 | 网页, 页面, page, website |
| 搜索相关 | 搜索, search, 查找内容 |
| 内容提取 | 提取, extract, 获取内容 |
| 链接相关 | 链接, links, 发现链接 |
| 批量相关 | 批量, batch, 多个 |

### 触发示例

```
用户: 爬取这个网页 https://example.com
用户: 帮我抓取整个网站
用户: 提取这个页面的所有链接
用户: 搜索 "AI 新闻"
用户: 批量爬取这几个 URL
用户: 获取页面的文本内容
用户: 发现这个网站的所有页面
```

### CLI 使用方式

```bash
# 进入目录
cd skills/firecrawl-mcp

# 爬取单个页面
node bin/cli.js scrape <url>

# 发现页面链接
node bin/cli.js links <url>

# 爬取整个网站
node bin/cli.js crawl <url> [depth]

# 批量爬取
node bin/cli.js batch <url1> <url2> ...

# 显示帮助
node bin/cli.js help
```

### 工具函数列表

#### 爬取工具 (crawl)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `firecrawl_crawl_url` | 爬取单个 URL | `url`, `useApi?` |
| `firecrawl_crawl_website` | 爬取整个网站 | `url`, `maxDepth?`, `useApi?` |
| `firecrawl_batch_crawl` | 批量爬取 | `urls[]` |

#### 提取工具 (extract)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `firecrawl_extract_links` | 提取页面链接 | `url` |
| `firecrawl_extract_content` | 提取文本内容 | `url` |
| `firecrawl_extract_structured` | 提取结构化数据 | `url`, `schema?` |

### 两种模式

| 模式 | 说明 | 需要 API Key |
|------|------|--------------|
| **Cheerio 模式** | 使用 Cheerio HTML 解析，无需 API | ❌ 不需要 |
| **API 模式** | 使用 Firecrawl 官方 API，功能更强 | ✅ 需要 |

### 使用示例

```typescript
// Cheerio 模式（无需 API Key）
const result = await firecrawl_crawl_url({ url: 'https://example.com' });

// API 模式（需要 API Key）
const result = await firecrawl_crawl_url({ 
  url: 'https://example.com', 
  useApi: true 
});

// 爬取网站
const result = await firecrawl_crawl_website({ 
  url: 'https://example.com', 
  maxDepth: 3 
});

// 提取链接
const result = await firecrawl_extract_links({ url: 'https://example.com' });
```

---

## 3. Playwright MCP

**版本:** v1.0.0  
**状态:** ✅ 正常使用  
**位置:** `skills/playwright-mcp/`

### 触发关键词

| 关键词分类 | 触发词 |
|------------|--------|
| 浏览器相关 | 浏览器, browser, chromium, chrome |
| 截图相关 | 截图, screenshot, 截屏 |
| 导航相关 | 导航, navigate, 打开, 访问 |
| 点击相关 | 点击, click, 按钮 |
| 表单相关 | 表单, form, 填写, 输入 |
| 内容提取 | 获取内容, snapshot, 页面内容 |
| 执行相关 | 执行, evaluate, javascript, js |
| 等待相关 | 等待, wait, 加载 |
| 标签页相关 | 标签页, tab, 新窗口 |

### 触发示例

```
用户: 帮我打开 https://example.com
用户: 给这个页面截图
用户: 点击登录按钮
用户: 填写表单，用户名是 xxx
用户: 获取页面的文本内容
用户: 执行一段 JS 代码
用户: 等待元素加载
用户: 打开新标签页
用户: 后退/前进一页
用户: 刷新页面
```

### 使用方式

Playwright MCP 需要通过代码调用，不提供 CLI：

```typescript
import { createPlaywrightMCPBridge } from './skills/playwright-mcp/src/bridge';

// 创建桥接器
const bridge = createPlaywrightMCPBridge({
  browser: {
    browserName: 'chromium',
    launchOptions: { headless: true }
  }
});

// 启动
await bridge.start();

// 导航
await bridge.callTool('browser_navigate', { url: 'https://example.com' });

// 截图
const screenshot = await bridge.callTool('browser_take_screenshot', { fullPage: true });

// 点击
await bridge.callTool('browser_click', { selector: '#submit' });

// 填写表单
await bridge.callTool('browser_fill_form', {
  data: {
    'input[name="email"]': 'test@example.com',
    'input[name="password"]': 'password123'
  }
});

// 获取内容
const content = await bridge.callTool('browser_snapshot', {});

// 执行 JS
const result = await bridge.callTool('browser_evaluate', {
  code: 'document.title'
});
```

### 工具函数列表

#### 导航工具 (Navigation)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_navigate` | 导航到 URL | `url` |
| `browser_go_back` | 后退一页 | - |
| `browser_go_forward` | 前进一页 | - |
| `browser_reload` | 刷新页面 | - |

#### 交互工具 (Interaction)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_click` | 点击元素 | `selector` |
| `browser_hover` | 悬停元素 | `selector` |
| `browser_type` | 输入文本 | `selector`, `text` |
| `browser_fill_form` | 填写表单 | `data` |
| `browser_select_option` | 选择下拉选项 | `selector`, `values` |

#### 提取工具 (Extraction)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_snapshot` | 获取页面快照 | - |
| `browser_evaluate` | 执行 JavaScript | `code` |
| `browser_network_requests` | 获取网络请求 | - |
| `browser_console_messages` | 获取控制台日志 | - |

#### 截图工具 (Screenshot)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_take_screenshot` | 页面截图 | `fullPage?` |

#### 标签页工具 (Tabs)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_tabs` | 获取所有标签页 | - |

#### 等待工具 (Wait)
| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_wait_for` | 等待元素出现 | `selector`, `timeout?` |

### 配置选项

```typescript
{
  browser: {
    browserName: 'chromium',  // chromium, firefox, webkit
    launchOptions: {
      headless: true,
      slowMo: 0  // 慢动作（毫秒）
    },
    contextOptions: {
      viewport: { width: 1280, height: 720 },
      locale: 'zh-CN'
    }
  },
  capabilities: ['core', 'network', 'vision'],
  timeouts: {
    action: 5000,
    navigation: 30000,
    expect: 5000
  }
}
```

---

## 触发机制总结

### 自动触发规则

| 技能 | 主要触发词 | 次要触发词 |
|------|-----------|-----------|
| **GitHub MCP** | github, 仓库, repo, issues, pr | user, search, commit, branch, actions, file |
| **Firecrawl MCP** | 爬取, 抓取, crawl, scrape | 搜索, 提取, 链接, 网页, 页面 |
| **Playwright MCP** | 浏览器, 截图, browser | navigate, click, form, evaluate, wait, tab |

### 技能优先级

当多个技能可能触发时，按以下优先级：

```
1. Playwright MCP (P1) - 浏览器自动化
2. Firecrawl MCP (P2) - 网页爬取/搜索
3. GitHub MCP (P3) - GitHub API
```

### 环境变量

| 变量 | GitHub | Firecrawl | Playwright |
|------|--------|-----------|------------|
| `GITHUB_TOKEN` | ✅ | - | - |
| `FIRECRAWL_API_KEY` | - | ✅ (可选) | - |
| `FIRECRAWL_API_URL` | - | ✅ | - |

---

## 快速参考卡

### GitHub MCP
```
触发: 提到 GitHub/仓库/Issues/PR/搜索
命令: cd skills/github-mcp && node bin/cli.js <command>
```

### Firecrawl MCP
```
触发: 提到爬取/抓取/网页/搜索
命令: cd skills/firecrawl-mcp && node bin/cli.js <command>
```

### Playwright MCP
```
触发: 提到浏览器/截图/表单/点击
使用: 通过 createPlaywrightMCPBridge() 调用
```

---

*文档生成: 2026-04-23*
