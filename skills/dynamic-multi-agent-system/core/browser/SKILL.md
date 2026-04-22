---
name: deerflow-browser
description: DeerFlow增强版浏览器模拟器 - 网页抓取、内容提取、链接分析
parent: dynamic-multi-agent-system
version: 1.0.0
trigger: deerflow_mode=true | scraping=true | browser=true | web_extraction=true
---

# DeerFlow增强版浏览器模拟器

**【附魔·改】Browser Enchant**

## 触发条件

| 条件 | 配置键 | 说明 |
|------|--------|------|
| DeerFlow模式 | `deerflow_mode=true` | 使用DeerFlow增强模式 |
| 网页抓取 | `scraping=true` | 启用抓取 |
| 浏览器模拟 | `browser=true` | 浏览器模拟 |

## 核心功能

### 1. 获取网页

```javascript
const { BrowserSession } = require('./deerflow_enhanced.js');

const browser = new BrowserSession();

const response = await browser.fetch('https://example.com');
console.log(response.status, response.body);
```

### 2. 提取链接

```javascript
const { html } = await browser.getHTML('https://example.com');
const links = browser.extractLinks(html, 'https://example.com');
console.log(links);
```

### 3. 提取图片

```javascript
const images = browser.extractImages(html);
console.log(images);
```

### 4. 表单处理

```javascript
const forms = browser.findForms(html);
console.log(forms);
```

## 维护

- **版本**: 1.0.0
- **借鉴**: DeerFlow 2.0 by ByteDance
- **更新**: 2026-04-22
