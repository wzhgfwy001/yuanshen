# 浏览器自动化深度学习笔记 (2026-04-29)

## 学习时间
2026-04-29 03:30-03:40

## 学习目的
通过GitHub实例学习，提升完成浏览器自动化任务的能力。

## 学习的3个核心项目

### 1. gsd-browser (207 stars) - AI Agent专用CLI ⭐⭐⭐⭐⭐
**链接：** https://github.com/gsd-build/gsd-browser

**核心创新：Snapshot + Ref 模式**
- 页面元素用版本化refs（@v1:e3）引用
- 不依赖CSS选择器，更稳定
- 页面变化后重新snapshot即可

**63个命令分类：**
- 导航：navigate, back, forward, reload
- 交互：click, type, press, hover, scroll, select-option, drag
- 快照：snapshot, click-ref, fill-ref, hover-ref
- 等待：network_idle, selector_visible, delay, text_visible
- 断言：url_contains, text_visible, no_console_errors等17种
- 表单：analyze-form, fill-form, find-best, act
- 提取：extract - 结构化数据
- 视觉：screenshot, save-pdf, visual-diff
- 网络：mock-route, block-urls
- 状态：save-state, restore-state, vault-save

**15种语义意图：**
submit_form, close_dialog, primary_cta, search_field, next_step, dismiss, auth_action, back_navigation, fill_email, fill_password, accept_cookies

**批量执行：**
batch --steps '[...]' - 一次执行多条命令，原子性

### 2. Pydoll (6,780 stars) - 反检测CDP ⭐⭐⭐⭐
**链接：** https://github.com/autoscrape-labs/pydoll

**核心特点：**
- 无WebDriver，直接CDP连接
- 没有navigator.webdriver标志
- Async + Pydantic类型提取

**Pydantic结构化提取：**
```python
class Product(ExtractionModel):
    name: str = Field(selector='.title')
    price: float = Field(selector='.price')
```

**反检测技术：**
- Human-like Mouse Movement（贝塞尔曲线、菲茨定律）
- Realistic Typing（真实打字速度）
- Fingerprint Management（浏览器指纹控制）

**Shadow DOM支持：**
支持closed shadow root，直接用CDP访问

### 3. Lightpanda (29,568 stars) - 轻量级AI浏览器 ⭐⭐⭐⭐⭐
**链接：** https://github.com/lightpanda-io/browser

**性能对比：**
- 内存：123MB vs Chrome 2GB（16倍更少）
- 速度：5秒 vs 46秒（9倍更快）

**架构：**
- 不是Chromium分支，用Zig从零编写
- CDP服务器 + Puppeteer/Playwright连接
- 支持MCP server

## 能力提升：可借鉴的模式

### P0 - 可立即应用
1. **断言验证** - assert --checks '[...]'
2. **批量执行** - batch --steps '[...]'

### P1 - 需要开发
3. **语义意图** - act --intent accept_cookies
4. **Snapshot + Ref** - 稳定元素引用

### P2 - 架构改进
5. **结构化提取** - extract --schema
6. **Daemon持久化** - 后台常驻进程

### P3 - 特殊场景
7. **反检测** - human-like行为

## 具体改进建议

| 模式 | 复杂度 | 实用性 | 优先级 |
|------|--------|--------|--------|
| 断言验证 | 低 | 高 | P0 |
| 批量执行 | 低 | 高 | P0 |
| 语义意图 | 中 | 高 | P1 |
| Snapshot+Ref | 中 | 高 | P1 |
| 结构化提取 | 高 | 中 | P2 |
| Daemon持久化 | 高 | 中 | P2 |
| 反检测 | 中 | 中 | P3 |

## 与我们web-automation skill的关联

**当前架构：**
- playwright.connectOverCDP() → CDP连接已打开的浏览器
- screenshot, evaluate, click等基本操作

**可增强的方向：**
1. 添加断言命令验证结果
2. 实现批量执行减少往返
3. 添加语义意图自动识别
4. 考虑Lightpanda作为轻量替代方案

---

*学习完成，已整合到能力中*