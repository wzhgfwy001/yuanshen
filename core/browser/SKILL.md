---
name: browser
description: |
  浏览器自动化配置模块，为混合动态多Agent系统提供浏览器控制能力。
  支持多浏览器实例管理、页面自动化操作、元素交互、数据抓取等功能。
  可配置Chrome、Firefox、Edge等多种浏览器，支持有头/无头模式。
  触发条件：浏览器自动化、网页抓取、UI测试、页面操作、元素交互。
parent: core
version: 1.0.0
triggers:
  - "浏览器"
  - "browser"
  - "自动化"
  - "网页"
  - "抓取"
  - "selenium"
  - "playwright"
  - "页面操作"
  - "元素交互"
  - "web automation"
usage:
  activate: |
    当用户提到需要控制浏览器、操作网页、抓取数据、自动化UI测试、
    点击按钮、填写表单、截取页面时激活此模块。
  steps:
    1. 加载 browser-controller.ts 初始化浏览器控制器
    2. 使用 page-automator.ts 进行页面操作
    3. 使用 element-handler.ts 处理元素交互
    4. 执行自动化任务
    5. 清理资源
  examples:
    - "打开网页"
    - "点击登录按钮"
    - "填写搜索框"
    - "抓取页面数据"
    - "截取页面截图"
    - "执行JavaScript"
integration:
  main_file: browser-controller.ts
  dependencies:
    - page-automator.ts
    - element-handler.ts
    - playwright or puppeteer
  events:
    - browser:launched
    - browser:closed
    - browser:error
    - page:loaded
    - page:error
    - element:found
    - element:clicked
    - element:typed
    - scrape:complete
    - screenshot:taken
---

# Browser Automation Module

## 概述

Browser模块为混合动态多Agent系统提供浏览器自动化能力，支持：

- **多浏览器支持** - Chrome, Firefox, Edge, Safari
- **多种模式** - 有头模式、无头模式、容器模式
- **页面操作** - 导航、刷新、前进后退
- **元素交互** - 点击、输入、悬停、拖拽
- **数据抓取** - 页面内容、表格、API响应
- **截图录屏** - 全屏截图、区域截图、元素截图
- **脚本执行** - 自定义JavaScript注入

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│              Browser Controller (browser-controller.ts)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Browser     │  │   Context    │  │   Session    │          │
│  │  Manager     │  │   Manager    │  │   Manager    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Page Automator (page-automator.ts)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Navigation   │  │  Scrolling   │  │   Screenshot │          │
│  │  Handler     │  │   Handler    │  │   Handler    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Element Handler (element-handler.ts)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Click      │  │    Type      │  │   Select     │          │
│  │   Handler    │  │   Handler    │  │   Handler    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Hover      │  │   Drag       │  │   Assert     │          │
│  │   Handler    │  │   Handler    │  │   Handler    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Instances                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Chrome  │  │ Firefox │  │  Edge   │  │ Safari  │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. Browser Controller (browser-controller.ts)

浏览器实例管理器：

```typescript
interface BrowserConfig {
  browser: 'chromium' | 'firefox' | 'webkit' | 'all';
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent?: string;
  proxy?: ProxyConfig;
  extensions?: string[];
  timeout: number;
  slowMo?: number;
}
```

核心方法：

- `launch(config?: BrowserConfig)` - 启动浏览器
- `close()` - 关闭浏览器
- `newPage()` - 创建新页面
- `getPage(id?: string)` - 获取页面
- `closePage(id?: string)` - 关闭页面
- `setDefaultConfig(config: Partial<BrowserConfig>)` - 设置默认配置

### 2. Page Automator (page-automator.ts)

页面操作处理器：

```typescript
interface PageAction {
  type: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot' | 'evaluate' | 'scroll';
  selector?: string;
  value?: any;
  options?: PageActionOptions;
}
```

核心方法：

- `navigate(url: string, options?)` - 导航到URL
- `waitForSelector(selector: string, options?)` - 等待元素
- `waitForNavigation(action: () => Promise)` - 等待导航
- `screenshot(options?)` - 截图
- `scroll(options?)` - 滚动页面
- `evaluate(script: string | Function)` - 执行脚本

### 3. Element Handler (element-handler.ts)

元素交互处理器：

```typescript
interface ElementAction {
  action: 'click' | 'dblclick' | 'rightclick' | 'hover' | 'type' | 'select' | 'drag' | 'upload';
  selector: string;
  value?: any;
  options?: ElementActionOptions;
}
```

核心方法：

- `click(selector: string, options?)` - 点击
- `type(selector: string, text: string, options?)` - 输入
- `select(selector: string, value: string | string[])` - 选择
- `hover(selector: string)` - 悬停
- `drag(selector: string, target: string)` - 拖拽
- `upload(selector: string, files: string[])` - 上传文件

## 浏览器配置

### Chrome 配置

```typescript
{
  browser: 'chromium',
  headless: false,
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  proxy: {
    server: 'http://proxy.example.com:8080',
    bypass: ['localhost', '127.0.0.1'],
  },
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
}
```

### Firefox 配置

```typescript
{
  browser: 'firefox',
  headless: false,
  viewport: { width: 1920, height: 1080 },
  firefoxUserPrefs: {
    'media.navigator.streams.fake': true,
    'media.navigator.audio.fake': true,
  },
}
```

## 使用示例

### 基础使用

```typescript
import { BrowserController } from './browser-controller';

const browser = new BrowserController();

// 启动浏览器
await browser.launch({
  browser: 'chromium',
  headless: true,
  viewport: { width: 1920, height: 1080 },
});

// 创建页面
const page = await browser.newPage();

// 导航
await page.navigate('https://example.com');

// 截图
await page.screenshot({ path: 'screenshot.png' });

// 关闭
await browser.close();
```

### 元素交互

```typescript
const { elementHandler } = browser.getHandlers();

// 点击按钮
await elementHandler.click('button#submit');

// 输入文本
await elementHandler.type('input[name="email"]', 'test@example.com');

// 选择下拉框
await elementHandler.select('select#country', 'CN');

// 悬停
await elementHandler.hover('.dropdown-toggle');

// 拖拽
await elementHandler.drag('.draggable', '.dropzone');
```

### 页面抓取

```typescript
// 等待内容加载
await page.waitForSelector('.content');

// 获取页面内容
const title = await page.evaluate(() => document.title);
const links = await page.evaluate(() => 
  Array.from(document.querySelectorAll('a')).map(a => a.href)
);

// 抓取表格数据
const tableData = await page.evaluate(() => {
  const rows = document.querySelectorAll('table tr');
  return Array.from(rows).map(row => {
    const cells = row.querySelectorAll('td');
    return Array.from(cells).map(cell => cell.textContent);
  });
});
```

### 等待策略

```typescript
// 等待元素出现
await page.waitForSelector('.loading', { state: 'hidden' });

// 等待网络空闲
await page.waitForLoadState('networkidle');

// 等待指定时间
await page.waitForTimeout(3000);

// 等待函数返回true
await page.waitForFunction(() => 
  document.querySelector('.status')?.textContent === 'ready'
);

// 自定义等待
await page.waitFor(async () => {
  const count = await page.locator('.item').count();
  return count >= 10;
});
```

### 键盘和鼠标操作

```typescript
import { Locator } from 'playwright';

// 键盘操作
await page.keyboard.press('Enter');
await page.keyboard.type('Hello World');
await page.keyboard.down('Shift');
await page.keyboard.up('Shift');

// 鼠标操作
await page.mouse.click(100, 200);
await page.mouse.dblclick(100, 200);
await page.mouse.down();
await page.mouse.move(300, 400);
await page.mouse.up();
```

### 处理弹窗

```typescript
// 等待对话框
page.on('dialog', async dialog => {
  console.log(dialog.message());
  await dialog.accept();  // 或 dialog.dismiss()
});

// 处理新窗口
const [newPage] = await Promise.all([
  browser.waitForEvent('page'),
  page.click('a[target="_blank"]'),
]);
await newPage.waitForLoadState();
```

## 配置指南

详见 `BROWSER-CONFIG-GUIDE.md`，包含：

- 详细配置参数说明
- 代理配置
- SSL证书处理
- 浏览器扩展
- 性能优化

## 错误处理

```typescript
try {
  await page.click('button#submit', { timeout: 5000 });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('点击超时');
  } else if (error instanceof TargetClosedError) {
    console.log('页面已关闭');
  }
}
```

## 最佳实践

1. **使用显式等待** - 避免硬编码sleep
2. **复用浏览器实例** - 减少启动开销
3. **合理使用选择器** - 优先ID/Name
4. **处理网络条件** - 考虑慢网场景
5. **资源清理** - 及时关闭页面和浏览器

## 相关文件

- `browser-controller.ts` - 浏览器控制器
- `page-automator.ts` - 页面自动化
- `element-handler.ts` - 元素处理器
- `BROWSER-CONFIG-GUIDE.md` - 配置指南
