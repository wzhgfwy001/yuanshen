# Browser Configuration Guide

> 详细指南：如何配置浏览器自动化模块以适应不同的使用场景。

## 基础配置

### 最小配置

```typescript
const browser = new BrowserController();
await browser.launch({ browser: 'chromium' });
```

### 完整配置

```typescript
const browser = new BrowserController();
await browser.launch({
  browser: 'chromium',
  headless: false,
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0...',
  timeout: 30000,
  slowMo: 100,  // 慢动作模式，便于调试
});
```

## 代理配置

### HTTP代理

```typescript
{
  proxy: {
    server: 'http://proxy.example.com:8080',
    username: 'user',
    password: 'pass',
  }
}
```

### SOCKS代理

```typescript
{
  proxy: {
    server: 'socks5://proxy.example.com:1080',
  }
}
```

## 浏览器参数

### Chrome常用参数

```typescript
{
  args: [
    '--disable-blink-features=AutomationControlled',  // 隐藏自动化特征
    '--disable-dev-shm-usage',                        // 避免共享内存问题
    '--no-sandbox',                                   // Docker环境需要
    '--disable-setuid-sandbox',
    '--disable-gpu',                                  // 无头模式禁用GPU
    '--window-size=1920,1080',
    '--disable-web-security',                          // 禁用同源策略
    '--allow-running-insecure-content',
  ]
}
```

### Firefox常用参数

```typescript
{
  firefoxUserPrefs: {
    'media.navigator.streams.fake': true,
    'media.navigator.audio.fake': true,
    'media.autoplay.default': 0,
    'general.useragent.override': 'Custom User Agent',
  }
}
```

## SSL证书处理

### 接受所有证书

```typescript
{
  args: [
    '--ignore-certificate-errors',
    '--allow-insecure-localhost',
  ]
}
```

### 自定义证书路径

```typescript
{
  args: [
    `--cert-home-dir=/path/to/certs`,
  ]
}
```

## 无头模式

### 标准无头

```typescript
{
  headless: true,
}
```

### Docker/Linux无头

```typescript
{
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ]
}
```

## 性能优化

### 禁用图片加载

```typescript
{
  pageInit: async (page) => {
    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', route => route.abort());
  }
}
```

### 禁用CSS

```typescript
{
  pageInit: async (page) => {
    await page.addStyleTag({ content: 'body { visibility: hidden; }' });
  }
}
```

### 并发限制

```typescript
const browser = new BrowserController({
  maxConcurrency: 3,  // 最多3个并发页面
});
```

## 调试配置

### 开启调试端口

```typescript
{
  devtools: true,
  args: [
    '--remote-debugging-port=9222',
  ]
}
```

### 慢动作模式

```typescript
{
  slowMo: 100,  // 每个操作延迟100ms
}
```

## 常见问题

### Q1: Linux/Docker环境运行失败

添加必要参数：
```typescript
{
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ]
}
```

### Q2: 被网站检测为机器人

隐藏自动化特征：
```typescript
{
  args: [
    '--disable-blink-features=AutomationControlled',
  ],
  pageInit: async (page) => {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
  }
}
```

### Q3: 内存占用过高

限制并发和添加内存优化：
```typescript
{
  maxConcurrency: 2,
  args: [
    '--disable-dev-shm-usage',
    '--js-flags=--max-old-space-size=512',
  ]
}
```
