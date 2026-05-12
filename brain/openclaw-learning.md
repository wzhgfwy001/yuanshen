# OpenClaw 学习记录

*开始时间：2026-05-12*

---

## 学习计划

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 | Skill触发机制和加载优先级 | ✅ 已完成 |
| 2 | 多Agent协作（4种方式） | ✅ 已完成 |
| 3 | Workspace/Agent/Session概念 | 🔄 本次学习 |
| 4 | System Prompt机制 | ⬜ 待学习 |
| 5 | Cron/自动化工作流 | ⬜ 待学习 |
| 6 | 插件开发/工具扩展 | ⬜ 待学习 |
| 7 | 安全配置/权限管理 | ⬜ 待学习 |
| 8 | 实战案例/最佳实践 | ⬜ 待学习 |

---

## 学习履历

### 2026-05-12 学习记录

#### 第1次学习：Skill触发机制和加载优先级

**来源：** web_search + 官方文档分析

**核心发现：**
- Skill触发是"模型判断"机制，不是自动触发
- OpenClaw注入`<available_skills>`列表只含名称+描述
- 只有模型匹配时才读取SKILL.md
- 目的是减少上下文污染

**Skill加载6个路径（优先级由高到低）：**
1. `<workspace>/skills/` ← Agent专属
2. `<workspace>/.agents/skills/` ← Workspace内共享
3. `~/.agents/skills/` ← 用户级共享
4. `~/.openclaw/skills/` ← 全局共享
5. 内置Bundled Skills
6. `skills.load.extraDirs` ← 配置额外目录

**结论：** 专属优先，共享靠后

---

#### 第2次学习：多Agent协作（4种方式）

**来源：** yeyulingfeng.com 多Agent团队协作实战

**4种协作方式：**

| 方式 | 适用场景 | 核心工具 |
|------|---------|----------|
| Multi-Agent Routing | 强隔离、不同人格 | bindings配置 |
| Subagents | 主控+并行执行 | sessions_spawn |
| ACP | 代码代理团队 | ACP runtime |
| Agent-to-Agent | Agent间直接传话 | sessions_send |

**Subagents核心配置：**
```javascript
agents.defaults.subagents = {
  model: "minimax/MiniMax-M2.5",
  maxConcurrent: 3,
  runTimeoutSeconds: 900,
  archiveAfterMinutes: 60
}
```

**session visibility 4种级别：** self / tree / agent / all

---

#### 第3次学习：Workspace/Agent/Session概念

**来源：** yeyulingfeng.com OpenClaw Skills加载机制

**核心概念：**

| 概念 | 类比 | 说明 |
|------|------|------|
| Agent | 员工 | 独立AI助手实例 |
| Workspace | 办公桌+工作手册 | Agent的人格配置文件存放地 |
| Session | 对话实例 | 不等于Agent，一个Agent可有多个Session |

**openclaw.json配置绑定：**
```json
{
  "agents": {
    "list": [
      { "id": "main", "workspace": "~/.openclaw/workspace" },
      { "id": "coder", "workspace": "~/.openclaw/coder-agent" }
    ]
  }
}
```

**Workspace目录结构：**
```
~/.openclaw/workspace/
├── IDENTITY.md   # 助理的"名片"：名字、性格标签
├── SOUL.md       # 助理的"员工手册"：行为准则和价值观
├── USER.md       # 关于你的"档案"：你是谁、有什么偏好
├── AGENTS.md     # 助理的"岗位说明书"：工作流程和规则
├── TOOLS.md      # 助理的"设备清单"：你的环境专属信息
├── MEMORY.md     # 助理的"备忘录"：长期记忆
├── HEARTBEAT.md  # 助理的"巡检清单"：定期主动检查的事项
├── BOOT.md       # 助理的"开机任务"：网关启动时执行
├── BOOTSTRAP.md  # 助理的"入职引导"：首次运行时的初始化
├── memory/       # 每日工作日志（自动生成）
├── skills/       # 本地技能目录
└── sessions.json # 会话存储
```

**重要结论：**
- 每个Agent绑定独立Workspace
- Workspace/skills/是Agent专属，最高优先级
- 不建议多Agent共用Workspace（人格无法区分）

---

#### 第4次学习：System Prompt机制

**来源：** longxia.best/concepts/system-prompt

**核心文件说明：**

| 文件 | 入职类比 | 加载时机 | 可变性 |
|------|----------|----------|--------|
| IDENTITY.md | 名片 | 每次Session启动 | 可修改 |
| SOUL.md | 员工手册 | 每次Session启动 | **不可变** |
| USER.md | 用户档案 | main session启动 | 可修改 |
| AGENTS.md | 岗位说明书 | 每次Session启动 | 可修改 |
| TOOLS.md | 设备清单 | 每次Session启动 | 可修改 |
| MEMORY.md | 备忘录 | main session | 可修改 |
| HEARTBEAT.md | 巡检清单 | Gateway启动 | 可修改 |
| BOOT.md | 开机任务 | Gateway启动 | 可修改 |
| BOOTSTRAP.md | 入职引导 | 仅首次运行 | 一次性删除 |

**核心设计理念（Unix哲学）：**
1. **一切皆文本** - 配置是Markdown，数据是JSON，没有私有二进制格式
2. **小工具组合** - 核心工具只有4个：Read、Write、Edit、Bash
3. **CLI是终极接口** - 通过Bash调用任何CLI程序
4. **自我扩展** - Agent可以在运行时写入、重载、测试自己的扩展

**Session树形结构：**
- Main Session可分出Side Quest（子会话）
- 子会话完成→结论合并回Main
- 不打断主对话流

**设计哲学要点：**
- SOUL.md不可变（人格锚点）
- 调整行为应该修改AGENTS.md而非SOUL.md
- 所有文件都适合用Git版本管理

---

#### 第5次学习：Cron定时任务

**来源：** yeyulingfeng.com OpenClaw定时任务详解

**三种调度方式：**

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| at | 一次性，在指定时间执行一次 | 提醒 |
| every | 固定间隔，每隔一段时间执行 | 轮询 |
| cron | Cron表达式，精确控制时间 | 复杂定时 |

**命令示例：**
```bash
# 一次性任务
openclaw cron add \
  --name "会议提醒" \
  --at "2026-04-14T15:00:00Z" \
  --session main \
  --system-event "下午3点开会" \
  --delete-after-run

# 间隔任务
openclaw cron add \
  --name "库存检查" \
  --every "1h" \
  --session isolated \
  --message "检查库存数据，低于阈值就告警"

# Cron任务
openclaw cron add \
  --name "晨间简报" \
  --cron "0 7 * * *" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "汇总昨日数据" \
  --announce --channel feishu
```

**4种执行方式：**

| 方式 | 适合场景 |
|------|----------|
| main | 定时提醒、简单系统事件 |
| isolated | 报告生成、后台任务（最常用） |
| current | 需要上下文关联的周期性工作 |
| session:xxx | 需要跨次积累的工作流 |

**关键注意事项：**
- `--tz "Asia/Shanghai"` 设置时区，默认UTC
- `--delete-after-run` 一次性任务执行完删除
- `--announce --channel feishu` 推送结果到飞书

**Cron表达式对照：**
```
0 8 * * *     # 每天早上8点
0 */2 * * *   # 每2小时
0 18 * * 1-5  # 工作日下午6点
0 9 * * 1     # 每周一早上9点
```

---

#### 第6次学习：安全配置与权限管理

**来源：** yeyulingfeng.com 强化你的OpenClaw助手:安全配置指南

**核心原则：最小权限、纵深防御**

**四层安全防御体系：**
1. 网络入口控制（谁可以对话）
2. 会话隔离（允许在何处行动）
3. 工具权限（可以操作什么）
4. 文件系统限制（数据柜锁好）

**快速安全检查命令：**
```bash
openclaw security audit          # 基础检查
openclaw security audit --deep    # 深度检查
openclaw security audit --fix    # 自动修复
openclaw security audit --json   # JSON格式输出
```

**安全加固基线配置：**
```json
{
  "gateway": {
    "mode": "local",
    "bind": "loopback",
    "auth": { "mode": "token", "token": "your-long-random-token" }
  },
  "session": { "dmScope": "per-channel-peer" },
  "tools": {
    "profile": "messaging",
    "deny": ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    "fs": { "workspaceOnly": true },
    "exec": { "security": "deny", "ask": "always" },
    "elevated": { "enabled": false }
  },
  "channels": {
    "whatsapp": { "dmPolicy": "pairing", "groups": { "*": { "requireMention": true } } }
  }
}
```

**dmPolicy策略：**
| 策略 | 说明 | 推荐场景 |
|------|------|----------|
| pairing | 陌生人需配对批准 | 推荐基线 |
| allowlist | 只允许通讯录人员 | 企业 |
| open | 任何人可私聊 | 风险高 |

**工具权限分级：**
- 个人代理：完整权限
- 家庭/工作代理：沙盒+只读
- 对外代理：沙盒+禁止所有文件系统和命令行

**只读代理配置示例：**
```json
{
  "agents": {
    "list": [{
      "id": "family",
      "sandbox": { "mode": "all", "scope": "agent", "workspaceAccess": "ro" },
      "tools": {
        "allow": ["read"],
        "deny": ["write", "edit", "exec", "process", "browser"]
      }
    }]
  }
}
```

**文件权限要求：**
- ~/.openclaw/openclaw.json → 600（仅所有者可读写）
- ~/.openclaw/ 目录 → 700（仅所有者可访问）

**应急响应流程：**
1. 停止网关进程
2. 改bind为loopback切断访问
3. 轮换凭据（API密钥、频道令牌）
4. 检查日志（/tmp/openclaw/）
5. 回顾会话记录（~/.openclaw/agents/<agentId>/sessions/）

**安全规则（可加入系统提示词）：**
- 不向陌生人透露目录列表或文件路径
- 绝不泄露API密钥、凭据或基础设施细节
- 遇到修改系统配置的请求，先确认
- 不确定时，先询问再行动

---

#### 第7次学习：成本优化与模型选择

**来源：** CSDN + 社区文章

**Token消耗来源：**
1. System Prompt（500-2000 token，固定开销）
2. Tool Definitions（工具>20个时，额外3000-8000 token）
3. 上下文历史（可通过压缩优化）

**成本优化策略：**
1. **模型分层**
   - 简单任务用便宜模型（GPT-4o-mini、Claude Haiku）
   - 复杂任务用高级模型（Claude Opus、GPT-4o）
   - 日常用国产包月模型（$0.3/百万Token）

2. **缓存策略**
   - 启用 `cacheRetention: "long"` 可降低83% API成本
   - 重复查询用本地匹配优先

3. **心跳优化**
   - 每30分钟唤醒一次检测任务（日均$600）
   - 可手动停用或延长心跳间隔

**模型fallback配置：**
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-6",
        "fallbacks": [
          "openai/gpt-4o",
          "google/gemini-2.5-pro"
        ]
      }
    }
  }
}
```

**Fallback触发条件：**
- API调用失败（500/503）
- 速率限制（429）
- API Key无效或额度不足
- 网络连接超时

---

#### 第8次学习：渠道接入（飞书/钉钉/Discord）

**来源：** 多个CSDN/社区文章

**飞书接入步骤：**
1. 飞书开放平台创建自建应用 → 获取 App ID + App Secret
2. 添加机器人能力
3. 配置权限（im:message、im:chat、contact:user.base:readonly）
4. 事件订阅选择"长连接"（WebSocket，无需公网）
5. 订阅事件 im.message.receive_v1
6. 发布应用版本
7. OpenClaw端：`openclaw config` → Channels → Feishu

**命令：**
```bash
openclaw plugins install @m1heng-clawd/feishu
openclaw plugins install @moltybob/dingtalk
```

**钉钉接入需要：** AppKey + AppSecret + HTTPS回调

**多渠道并行配置：**
```json
{
  "channels": {
    "feishu": { "enabled": true },
    "dingtalk": { "enabled": true }
  }
}
```

---

#### 第9次学习：插件/Skill开发

**来源：** yeyulingfeng.com Skill开发完全指南

**Skill结构：**
```
my-skill/
├── SKILL.md           # 技能描述（必须）
├── scripts/
│   └── main.ts        # 主程序
├── references/
│   └── config.md      # 配置说明
├── assets/            # 模板/配置/样例
└── package.json
```

**SKILL.md格式：**
```yaml
---
name: my-skill
description: "当需要执行XX任务时使用这个技能"
version: "1.0.0"
---

# My First Skill

## 功能
描述这个技能能做什么。

## 使用方式
当你说"XX"时触发。
```

**Skill创建命令：**
```bash
python $(npm root -g)/openclaw/skills/skill-creator/scripts/init_skill.py \
  weather --path ~/.openclaw/workspace-main/skills
```

**Skill vs MCP Tool：**
- MCP Tool = 函数
- Skill = 插件（+配置系统+生命周期钩子+依赖声明）

---

#### 第10次学习：实战案例与最佳实践

**来源：** yeyulingfeng.com + CSDN

**最佳实践15条精华：**
1. 永远从沙盒模式开始
2. 技能安装分三梯队（基础设施→效能提升→高级场景）
3. SOUL.md不可变，调整行为修改AGENTS.md
4. 用Git管理Workspace所有配置文件
5. 定时任务优先用isolated模式
6. 不要让AI访问载有账户的浏览器配置文件
7. 模型选择：简单任务用小模型，复杂任务用大模型
8. 定期运行`openclaw security audit`
9. 善用fallbacks配置兜底
10. 启用cacheRetention: "long"

**7个可直接落地的自动化工作流：**
1. 早报机器人（信息采集→摘要→推送）
2. 客服自动回复
3. 内容一键分发（公众号/小红书/知乎）
4. 竞品动态监控
5. 会议纪要自动生成
6. 批量文件重命名
7. 个人待办执行器

**架构最小闭环：**
```
触发层 → 执行层 → 整理层 → 分发层
```

---

## 学习履历总结

### 已完成学习：10次

| 次 | 主题 | 核心收获 |
|----|------|----------|
| 1 | Skill触发机制 | 模型判断机制、6级优先级 |
| 2 | 多Agent协作 | 4种方式（Routing/Subagents/ACP/A2A） |
| 3 | Workspace/Agent/Session | 目录结构、配置绑定 |
| 4 | System Prompt机制 | 9个核心文件、Unix哲学、4个核心工具 |
| 5 | Cron定时任务 | 3种调度方式、4种执行方式 |
| 6 | 安全配置与权限管理 | 最小权限、纵深防御、tools deny/allow |
| 7 | 成本优化与模型选择 | 模型分层、缓存策略、fallbacks配置 |
| 8 | 渠道接入 | 飞书/钉钉/Discord接入步骤 |
| 9 | 插件/Skill开发 | Skill结构、开发流程 |
| 10 | 实战案例与最佳实践 | 15条精华、7个工作流 |

### 待深入学习内容

- [ ] 常见问题排查（具体错误码分析）
- [ ] Docker部署完整指南
- [ ] 云平台部署（阿里云/腾讯云）
- [ ] 多Agent协作实战（数据采集团队版配置）
- [ ] MCP协议深度理解
- [ ] Canvas交互功能
- [ ] 记忆系统内部机制（brain/目录）
- [ ] Hook生命周期深度应用

---

#### 第11次学习：常见问题排查

**来源：** yeyulingfeng.com + CSDN + 社区文章

**60秒诊断命令：**
```bash
openclaw status                    # 整体状态概览
openclaw gateway status           # 网关运行时状态
openclaw doctor                   # 配置自检+自动修复
openclaw logs --follow            # 实时日志流
openclaw channels status --probe   # 渠道连通性
```

**健康状态判断：**
| 命令 | 正常输出 | 异常信号 |
|------|----------|----------|
| gateway status | Runtime: running, RPC probe: ok | Runtime: stopped, probe failed |
| doctor | No blocking issues found | blocking issues detected |

**常见错误：**

| 错误 | 原因 | 修复 |
|------|------|------|
| EADDRINUSE | 端口18789被占用 | netstat -ano \| findstr :18789 → kill进程 |
| EBADENGINE | Node.js版本<22 | 升级Node.js |
| pairing request | 发送者未配对 | openclaw pairing approve <requestId> |
| drop guild message | 群消息未被@ | requireMention: true |
| API Key无效 | 余额耗尽/格式错误 | 检查API Key配置 |
| 401 Unauthorized | 认证失败 | 检查auth-profiles.json |
| 429 Rate Limit | 请求超限 | 等待或配置fallbacks |

**日志关键词：**
```bash
openclaw logs --follow | grep -E "(drop|blocked|pairing|error)"
```

---

#### 第12次学习：云平台部署（Docker/阿里云/腾讯云）

**来源：** CSDN + 社区文章

**最低配置要求：**
- 2核CPU + 2GB内存 + 20GB硬盘
- 推荐：2核4G内存

**阿里云轻量应用服务器部署：**
1. 选购服务器 → 镜像选择"OpenClaw(Moltbot)"
2. 安全组放行：TCP 18789、8080端口
3. 获取公网IP，访问Dashboard
4. 配置百炼API Key

**Docker部署：**
```bash
# 安装Docker
curl -fsSL https://get.docker.com | bash

# 创建网络
docker network create openclaw-net

# 启动OpenClaw
docker run -d \
  --name openclaw \
  --network openclaw-net \
  -p 18789:18789 \
  -v ~/.openclaw:/root/.openclaw \
  openclaw/openclaw
```

**腾讯云轻量应用服务器：**
- 地域选香港/新加坡（内地访问大模型受限）
- 镜像选"OpenClaw(Clawdbot) 2026稳定版"
- 安全组放行18789端口

**安全加固：**
- 使用强密码（16位+大小写+数字+符号）
- 修改SSH端口
- 配置Nginx反向代理+HTTPS
- 限制IP访问

---

## 学习履历总结

### 已完成学习：12次

| 次 | 主题 | 核心收获 |
|----|------|----------|
| 1 | Skill触发机制 | 模型判断机制、6级优先级 |
| 2 | 多Agent协作 | 4种方式（Routing/Subagents/ACP/A2A） |
| 3 | Workspace/Agent/Session | 目录结构、配置绑定 |
| 4 | System Prompt机制 | 9个核心文件、Unix哲学、4个核心工具 |
| 5 | Cron定时任务 | 3种调度方式、4种执行方式 |
| 6 | 安全配置与权限管理 | 最小权限、纵深防御、tools deny/allow |
| 7 | 成本优化与模型选择 | 模型分层、缓存策略、fallbacks配置 |
| 8 | 渠道接入 | 飞书/钉钉/Discord接入步骤 |
| 9 | 插件/Skill开发 | Skill结构、开发流程 |
| 10 | 实战案例与最佳实践 | 15条精华、7个工作流 |
| 11 | 常见问题排查 | 60秒诊断、常见错误修复 |
| 12 | 云平台部署 | Docker/阿里云/腾讯云部署 |

### OpenClaw学习地图（完成）

```
入门 → 安装配置 → 渠道接入 → 多Agent → 自动化(Cron) → 安全 → 成本 → 实战
```

**核心知识点已全部覆盖。**

### 待深入学习（可选）

- [ ] MCP协议深度理解（工具扩展）
- [ ] Canvas交互功能（UI控制）
- [ ] 记忆系统内部机制（brain/目录）
- [ ] 多Agent协作实战（完整配置示例）

---

## 待学习内容清单

- [ ] System Prompt机制（注入顺序、内容结构）
- [ ] Cron/定时任务工作流
- [ ] 插件开发/工具扩展
- [ ] 安全配置/权限管理
- [ ] 成本优化/模型切换
- [ ] 渠道接入（飞书/钉钉/Discord）
- [ ] 实战案例分析
- [ ] 常见问题排查

---

*最后更新：2026-05-12*