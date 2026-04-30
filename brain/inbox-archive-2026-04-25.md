# Inbox - 收件箱

*Last updated: 2026-04-23 01:16*

---

## 🔴 最高优先级

### 高考志愿小程序变现
- **状态：** 支付已配置但未绑定AppID
- **卡点：** APPID_MCHID_NOT_MATCH
- **解决：** 注册自己的商户号并绑定AppID
- **优先级：** P0 - 直接影响收入

---

## 🟡 商业目标

| 优先级 | 目标 | 状态 |
|--------|------|------|
| P1 | 高考志愿小程序上架变现 | 🔴 卡住 |
| P2 | 小说《吾名午夜》上架番茄小说 | 📝 待创作 |
| P3 | 抖音账号整改（定位"求生行动"） | ⏸️ 暂停 |

---

## 🟡 技术任务

### MCP集成进展（2026-04-23）
- **状态：** 三大MCP源码分析完成，集成方案已制定
- **Playwright MCP：** ❌ 失败（2026-04-24），Edge不支持，仅支持Chrome
- **GitHub MCP：** 📝 方案完成，待实施
- **Firecrawl：** 📝 方案完成，待实施
- **教训文档：** brain/lessons/2026-04-24-playwright-mcp-failure*.md

### StoryFlow WebSocket验证
- **状态：** ❌ 项目已删除（2026-04-25）
- **删除原因：** 长期失败，用户失望
- **失败教训：**
  - WebSocket + Flask-SocketIO + gevent 组合复杂，Windows环境兼容性问题多
  - 调试日志无法查看，无法诊断根因
  - API响应未检查，浪费排查时间
  - 不调用子Agent，自己硬扛
- **规则已更新：** AGENTS.md - 任务执行改进规则

### GitHub元神项目
- [ ] 添加Demo演示
- [ ] 跟进Issue #67648

---

## 🟡 创作任务

- [ ] 《吾名午夜》第6章创作

---

## 🟡 知识储备

- [x] OpenMythos分析（已保存brain/knowledge_reserve/openmythos.md，2026-04-23）

---

## 🟡 系统优化（进行中）

### user-profile auto-extractor
- **状态：** 已实现但未运行
- **原因：** OpenClaw消息存储较复杂
- **方案：** 作为独立工具手动运行，不强行集成heartbeat

### 改进规则触发机制
- **触发时间：** 每次会话开始时（读brain/inbox.md后）
- **检查项：**
  - [ ] 上次犯的错误是否在本次重复？
  - [ ] 是否应该调用子Agent而不是自己硬扛？
  - [ ] 是否有Skill可以主动使用？
  - [ ] 是否在不确定时直接说"我不知道"？
- **记录位置：** brain/inbox.md - "本次会话反思"

### 因果链记录
- **记录文件：** learnings/causal-chain.md（新建）
- **目的：** 追踪错误根因，不只是现象
- **格式：** 问题 → 直接原因 → 根本原因 → 预防措施

---

## 📋 2026-04-23 系统状态

| 模块 | 状态 | 说明 |
|------|------|------|
| Brain系统 | ✅ | inbox已清理归档 |
| Skills进化 | ✅ | task_tracking正常 |
| 阳神核心 | ✅ | tracker已修复 |
| 心跳系统 | ✅ | 11项检查正常 |
| 内存状态 | ✅ | 9.4GB可用 |
| 追踪系统 | ⚠️ | totalTasks=2，验证进度慢 |

---

## 🔔 升级提醒

**下次升级 OpenClaw 时，使用内置命令：**
```
openclaw update --yes
```

**不要用：** `npm install -g openclaw@latest`（会 EPERM 错误）

---

*归档历史：brain/inbox-archive-2026-04.md*
