# Playwright MCP 二次失败教训 (2026-04-24)

## 事件概述

用户需要打开Microsoft Edge浏览器访问抖音，但Playwright MCP无法工作。

## 失败原因

### 1. @playwright/mcp 只支持 Chrome
- @playwright/mcp 包硬编码查找 `C:\Users\DELL\AppData\Local\Google\Chrome\Application\chrome.exe`
- 不支持 Microsoft Edge
- 不支持通过环境变量配置浏览器路径

### 2. 环境变量无效
尝试过的环境变量：
- `PLAYWRIGHT_BROWSERS_PATH` - 无效
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` - 无效

### 3. 复制Chromeexe失败
- 将 Chromium 复制到 Chrome 路径后，启动失败
- 错误：`spawn UNKNOWN`
- 原因：Edge/Chrome 启动参数是特制的，Chromium 不兼容

### 4. JSON Schema错误
- 错误：`no schema with key or ref "https://json-schema.org/draft/2020-12/schema"`
- 原因：MCP服务器启动失败或配置错误

## 关键教训

| 教训 | 说明 |
|------|------|
| **不要尝试欺骗MCP** | @playwright/mcp 硬编码Chrome路径，无法通过复制exe或环境变量绕过 |
| **确认浏览器支持** | Edge用户不应使用@playwright/mcp，它只支持Chrome |
| **避免复杂变通方案** | 复制exe的方法最终失败，浪费了大量时间 |
| **及早承认失败** | 多次尝试后应停止，询问用户其他方案 |

## 解决方案

1. **卸载包**：`npm uninstall -g @playwright/mcp`
2. **清理配置**：从 openclaw.json 移除 playwright MCP 配置
3. **询问用户**：是否有其他浏览器需求或替代方案

## 时间浪费

- 多次尝试环境变量配置
- 尝试复制Chromeexe
- 多次重启Gateway
- 总计约2小时

## 下次遇到浏览器需求

1. 先确认用户需要Chrome还是Edge
2. 如果是Edge，不使用@playwright/mcp
3. 探索其他方案（如直接使用Edge命令行）
4. 如果30分钟内无法解决，承认失败并报告
