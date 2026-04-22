# Inbox - 收件箱

*Last updated: 2026-04-22 06:25*

## 🔴 最高优先级

### 高考志愿小程序变现
- **状态：** 支付已配置但未绑定AppID
- **卡点：** APPID_MCHID_NOT_MATCH
- **解决：** 注册自己的商户号并绑定AppID

## 🟡 商业目标

1. 高考志愿小程序 - **优先级1**，尽快上架变现
2. 小说《吾名午夜》上架番茄小说 - **优先级2**
3. 抖音账号整改 - 定位"求生行动"

## 🟡 StoryFlow 开发调试

### 当前问题：前端WebSocket刷新问题
- **问题描述：** 后端执行成功，但前端页面一直刷新
- **排查进度：**
  - ✅ 已添加DEBUG代码到engine.py和websocket/manager.py
  - ✅ 已重启后端
  - ⬜ 待验证：运行工作流确认DEBUG消息是否出现

### P0任务
- [ ] 启动后端和前端服务
- [ ] 验证API Key配置弹窗
- [ ] 验证5-Agent模板加载
- [ ] 端到端测试：加载→执行→查看结果
- [ ] 解决"工作流配置不能为空"错误

### 历史记录
- ✅ 2026-04-21：完成全面复盘（54个问题，9个P0已修复）
- ✅ 创建复盘文档：memory/2026-04-21-storyflow-retrospective.md

## 🟡 待办事项

- [ ] 《吾名午夜》第6章创作
- [ ] GitHub 元神项目添加Demo
- [ ] 跟进Issue #67648
- [x] StoryFlow 开发调试（✅ 54个问题，9个P0已修复，2026-04-21完成）

## 🟡 升级提醒

**下次升级 OpenClaw 时，使用内置命令：**
```
openclaw update --yes
```

**不要用：** `npm install -g openclaw@latest`（会 EPERM 错误）

**正确流程：** `openclaw update` 内置命令自动处理 Gateway 停启

## 🟢 已完成优化（2026-04-22）

- [x] err-006 已标记resolved（tracker集成已修复，SKILL.md已添加第9步）
- [x] subagent-log.md 已更新状态说明（设计阶段未实现，已澄清）
- [x] inbox清理（标记StoryFlow已完成）
- [x] tasks/active.md刷新

## 🟡 待优化项（可延后）

- [ ] user-profile auto-extractor集成
  - auto-extractor.js已实现但从未运行
  - 需要消息历史才能提取，但OpenClaw消息存储较复杂
  - 建议：作为独立工具手动运行，不强行集成heartbeat

## 📋 2026-04-22 全面检查结论

| 模块 | 状态 |
|------|------|
| Brain系统 | ✅ 正常 |
| Skills系统 | ✅ 正常 |
| 阳神系统 | ✅ tracker修复完成 |
| OpenClaw配置 | ✅ 正常 |
| 心跳系统 | ✅ 正常 |
| learnings | ✅ err-006已解决 |
| 追踪系统 | ✅ tracker开始生效 |
| subagent-log | ⚠️ 设计阶段未实现（已澄清）|

## 📝 阳神核心价值

> **框架的可塑性** — 不是固化的工作流，而是"根据你的场景，快速搭建你能跑起来的工作流"
>
> **目标用户：** 普通用户/新手用户
> **核心卖点：** 根据使用场景，搭建多条不同类型的工作流

---

## 🔔 升级提醒（2026-04-22）

**下次升级 OpenClaw 时，使用内置命令：**
```
openclaw update --yes
```

**不要用：** `npm install -g openclaw@latest`（会 EPERM 错误）

**正确流程：** `openclaw update` 内置命令自动处理 Gateway 停启

---

*Last updated: 2026-04-22 20:25*
