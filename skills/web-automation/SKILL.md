# Web Automation and Browser Control Skill

This skill provides comprehensive browser automation capabilities for OpenClaw agents. It is designed to handle complex web interactions that require more than simple HTTP requests.

## Key Functional Capabilities
- **Advanced Navigation**: Capability to navigate to any URL, handle redirects, and manage session cookies effectively.
- **Visual Capture**: Take high-resolution screenshots of the entire page or specific DOM elements for visual verification.
- **Interactive Elements**: Perform clicks, double-clicks, and hover actions on dynamic JavaScript-rendered components.
- **Data Scraping**: Intelligent extraction of text content, attribute values, and structured data from complex table layouts.
- **Form Automation**: Ability to fill out multi-step forms, select dropdown options, and trigger submit events.

## Technical Implementation
This skill utilizes a headless browser engine optimized for OpenCloudOS environments. It includes built-in retry logic for flaky elements and supports custom user-agent strings to mimic human browsing behavior.

## 🎯 快速使用

**触发场景：**
- 用户说"浏览一下这个网站"、"帮我看看这个页面" → 自动调用此Skill
- 用户说"截个图"、"给我看看这个网站长什么样" → 自动截图
- 用户说"登录到XX网站"、"帮我填表提交" → 自动执行浏览器操作
- 用户说"抓取这个页面的数据"、"提取网页内容" → 自动数据抓取

**示例对话：**
- 用户："帮我看看某宝上这个商品的价格"
- AI自动使用此Skill → 打开浏览器 → 导航到页面 → 截图/提取价格

- 用户："登录学校教务系统帮我查成绩"
- AI自动使用此Skill → 启动浏览器 → 导航 → 填表登录 → 提取数据

- 用户："这个网页加载不出来，帮我看看什么情况"
- AI自动使用此Skill → 打开页面 → 全页截图 → 分析问题原因

**不适用场景：**
- 纯API请求不需要浏览器（直接HTTP请求即可）
- 简单文本页面用 `web_fetch` 工具更快
- 不需要JavaScript渲染的静态页面

---

## Usage Context
Use this skill whenever the user asks to "browse", "check a website", "take a picture of a site", or "login to a portal".
