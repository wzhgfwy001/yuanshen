# 部署指南

**版本：** v1.0.0-alpha  
**更新日期：** 2026-04-04  
**适用平台：** OpenClaw 2026.4.1+

---

## 📋 前置要求

### 系统要求

| 要求 | 最低配置 | 推荐配置 |
|------|----------|----------|
| OpenClaw 版本 | 2026.4.1 | 2026.4.2+ |
| 内存 | 4GB | 8GB+ |
| 磁盘空间 | 100MB | 500MB+ |
| 网络 | 需要（API 调用） | 稳定连接 |

### 依赖检查

```bash
# 检查 OpenClaw 版本
openclaw --version

# 检查 Gateway 状态
openclaw gateway status

# 检查设备配对
openclaw devices list
```

**要求：**
- ✅ OpenClaw ≥ 2026.4.1
- ✅ Gateway 正常运行
- ✅ 至少配对 1 个设备（用于子 Agent 创建）

---

## 📦 安装步骤

### 方法 1：手动安装（推荐）

**步骤 1：下载 Skill 包**

```bash
# 克隆或下载项目到本地
git clone <repository-url> dynamic-multi-agent-system
# 或下载 ZIP 解压
```

**步骤 2：复制到 Skills 目录**

```bash
# Windows PowerShell
Copy-Item -Path ".\dynamic-multi-agent-system" `
  -Destination "$env:APPDATA\npm\node_modules\openclaw\skills\" `
  -Recurse

# 或手动复制文件夹到：
# C:\Users\<用户名>\AppData\Roaming\npm\node_modules\openclaw\skills\
```

**步骤 3：验证安装**

```bash
# 检查 Skill 是否被识别
openclaw skills list

# 应该看到：
# dynamic-multi-agent-system - 混合动态多 Agent 协作系统
```

**步骤 4：重启 Gateway**

```bash
openclaw gateway restart
```

---

### 方法 2：使用安装包（待提供）

```bash
# 未来支持（待实现）
openclaw skills install dynamic-multi-agent-system
```

---

## ⚙️ 配置说明

### 默认配置

安装后无需额外配置，系统使用默认设置：

```json
{
  "max-concurrent-tasks": 3,
  "max-subagents-total": 12,
  "max-subagents-per-task": 6,
  "confidence-threshold": 0.7,
  "solidify-threshold": 3
}
```

### 自定义配置（可选）

**配置文件位置：**
```
skills/dynamic-multi-agent-system/config/user-config.json
```

**可配置项：**

```json
{
  "limits": {
    "max-concurrent-tasks": 3,      // 最大并发主任务数
    "max-subagents-total": 12,      // 最大子 Agent 总数
    "max-subagents-per-task": 6     // 单任务最大子 Agent 数
  },
  "thresholds": {
    "confidence": 0.7,              // 分类置信度阈值
    "solidify": 3,                  // 固化所需成功次数
    "quality-min": 85               // 最低质量分
  },
  "feedback": {
    "auto-send": true,              // 自动发送反馈请求
    "delay-seconds": 30             // 延迟发送时间
  }
}
```

---

## 🧪 验证安装

### 快速测试

**测试 1：单一任务**

```
任务：翻译"你好，世界"为英文
预期：直接翻译，无子 Agent 创建
```

**测试 2：标准任务**

```
任务：写一篇科幻短篇小说（800 字）
预期：创建 4 个子 Agent（世界观→大纲→写作→审查）
```

**测试 3：创新任务**

```
任务：设计一套公司管理体系
预期：创建 6-8 个子 Agent，动态分解
```

### 检查清单

- [ ] Skill 出现在 `openclaw skills list` 中
- [ ] 单一任务测试通过
- [ ] 标准任务测试通过
- [ ] 子 Agent 创建正常
- [ ] 输出质量达标（≥85 分）

---

## 🔧 故障排除

### 问题 1：Skill 未识别

**症状：** `openclaw skills list` 未显示

**解决：**
```bash
# 1. 检查文件夹位置
ls "$env:APPDATA\npm\node_modules\openclaw\skills\dynamic-multi-agent-system"

# 2. 确认 SKILL.md 存在
ls skills/dynamic-multi-agent-system/SKILL.md

# 3. 重启 Gateway
openclaw gateway restart

# 4. 清除缓存（如需要）
openclaw skills refresh
```

---

### 问题 2：子 Agent 创建失败

**症状：** `pairing required` 错误

**解决：**
```bash
# 1. 检查设备配对状态
openclaw devices list

# 2. 如有待批准请求，批准它
openclaw devices approve <requestId>

# 3. 重启 Gateway
openclaw gateway restart
```

**参考：** 配对问题修复指南

---

### 问题 3：任务分类错误

**症状：** 任务类型识别不准确

**解决：**
```bash
# 1. 检查分类器配置
cat skills/dynamic-multi-agent-system/core/task-classifier/SKILL.md

# 2. 调整置信度阈值（如需要）
# 编辑 config/user-config.json
# "confidence-threshold": 0.6  # 降低阈值

# 3. 手动指定任务类型（临时方案）
# 在任务描述中明确说明："这是一个创新任务，需要..."
```

---

### 问题 4：输出质量不达标

**症状：** 质量分 <85 分

**解决：**
1. **检查输入质量** - 任务描述是否清晰详细
2. **增加审查环节** - 要求启用审查 Agent
3. **提供示例** - 给出参考样例
4. **多次迭代** - 使用反馈机制改进

---

### 问题 5：系统超时

**症状：** 任务执行超时（>5 分钟无响应）

**解决：**
```bash
# 1. 检查 Gateway 日志
openclaw logs --follow

# 2. 检查子 Agent 状态
openclaw subagents list

# 3. 终止卡住的子 Agent
openclaw subagents kill <session-id>

# 4. 重试任务
```

---

## 📊 性能基准

### 典型任务耗时

| 任务类型 | 字数/规模 | 预计耗时 | 资源使用 |
|----------|-----------|----------|----------|
| 单一任务 | <500 字 | <5 分钟 | 1 次 LLM 调用 |
| 标准任务 | 800-1000 字 | 60-90 分钟 | 4 个子 Agent |
| 创新任务 | 3000-5000 字 | 120-180 分钟 | 6-8 个子 Agent |
| 混合任务 | 2000-3000 字 | 90-120 分钟 | 5 个子 Agent |

### 资源限制

| 资源 | 限制 | 说明 |
|------|------|------|
| 并发主任务 | 3 个 | 同时运行的主任务数 |
| 子 Agent 总数 | 12 个 | 所有任务共享 |
| 单任务子 Agent | 6 个 | 单个任务最多占用 |
| 任务超时 | 60 分钟 | 默认超时时间 |
| 子 Agent 超时 | 5 分钟 | 无响应自动终止 |

---

## 🔄 更新方法

### 手动更新

```bash
# 1. 备份现有配置
Copy-Item skills/dynamic-multi-agent-system/config `
  skills/dynamic-multi-agent-system/config.backup

# 2. 下载新版本
# 覆盖安装文件夹

# 3. 恢复用户配置
Copy-Item skills/dynamic-multi-agent-system/config.backup/user-config.json `
  skills/dynamic-multi-agent-system/config/user-config.json

# 4. 重启 Gateway
openclaw gateway restart
```

### 自动更新（待实现）

```bash
# 未来支持
openclaw skills update dynamic-multi-agent-system
```

---

## 📞 获取帮助

### 文档资源

- [架构说明](docs/architecture.md)
- [API 参考](docs/api-reference.md)
- [故障排除](docs/troubleshooting.md)
- [使用示例](examples/)

### 社区支持

- **Discord:** https://discord.com/invite/clawd
- **GitHub:** https://github.com/openclaw/openclaw
- **文档：** https://docs.openclaw.ai

### 报告问题

遇到问题？请提供：
1. OpenClaw 版本
2. 错误信息（完整日志）
3. 复现步骤
4. 任务描述

---

## ✅ 安装完成检查清单

- [ ] Skill 已安装到正确目录
- [ ] `openclaw skills list` 显示 Skill
- [ ] Gateway 已重启
- [ ] 设备已配对
- [ ] 单一任务测试通过
- [ ] 标准任务测试通过
- [ ] 阅读了故障排除指南
- [ ] 保存了社区支持链接

---

**安装完成！开始使用混合动态多 Agent 系统吧！** 🚀

---

*部署指南版本：1.0*  
*最后更新：2026-04-04*
