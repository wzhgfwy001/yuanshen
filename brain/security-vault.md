# 凭证保险库设计（Security Vault）

> 基于 Anthropic Managed Agents 的结构化凭证隔离理念
> 目标：AI永远不直接接触凭证，靠结构隔离实现安全
> 生成时间：2026-05-12

## 核心理念

**Anthropic观点：**
> "根本不给模型直接碰到凭证，而不是少给点权限"

## 当前问题（不安全）

```
当前：API Key 在 MEMORY.md 或环境变量

风险链：
prompt injection成功 → 诱导AI读取环境变量 → 凭证泄露
```

## 优化后架构（安全）

```
AI Prompt
    ↓ 调用
Proxy 代理层
    ↓ 获取Token
Vault 保险库（外部存储）
    ↓ 转发
External Service
    ↑
Token永不经过AI
```

## 设计目标

| 目标 | 说明 |
|------|------|
| 隔离性 | AI永远不直接读取凭证 |
| 可审计 | 每次访问都有日志 |
| 最小权限 | 凭证只有必要权限 |
| 可替换 | Vault实现可切换 |

## 凭证分类

| 类型 | 示例 | 安全要求 |
|------|------|---------|
| LLM API Keys | MiniMax, OpenAI | 高 |
| Git Tokens | GitHub, GitLab | 高 |
| 数据库凭证 | MySQL, PostgreSQL | 极高 |
| 云服务凭证 | AWS, Azure | 极高 |
| 第三方API | 飞书, Slack | 中 |

## 访问流程

```
1. AI需要调用外部服务
        ↓
2. AI只发送请求（不包含凭证）
        ↓
3. Proxy拦截请求
        ↓
4. Proxy从Vault获取对应凭证
        ↓
5. Proxy将凭证附加到请求
        ↓
6. Proxy转发请求到外部服务
        ↓
7. 返回结果给AI
        ↓
8. Vault记录访问日志
```

## 待实现清单

- [ ] Vault加密存储（brain/vault-encrypted.json）
- [ ] Proxy代理层
- [ ] 访问日志系统
- [ ] 凭证自动轮换
- [ ] 紧急撤回机制

## 凭证Vault结构（示例）

```json
{
  "version": "1.0",
  "updated": "2026-05-12",
  "credentials": {
    "minimax": {
      "type": "api_key",
      "encrypted": true,
      "lastUsed": "2026-05-12T10:00:00Z",
      "usage": "LLM调用"
    },
    "github": {
      "type": "token",
      "encrypted": true,
      "lastUsed": "2026-05-12T09:30:00Z",
      "usage": "git push"
    }
  }
}
```

## 访问日志格式

```markdown
## vault-access-log

| 时间 | 服务 | 操作 | AI角色 | 结果 |
|------|------|------|--------|------|
| 2026-05-12 10:00 | minimax | API调用 | main | 成功 |
| 2026-05-12 09:30 | github | git push | main | 成功 |
```

## 安全边界

```
┌─────────────────────────────────────┐
│           AI Agent (无法触达凭证)       │
└─────────────────────────────────────┘
                    ↓ 调用
              ┌─────────────┐
              │   Proxy    │
              └─────────────┘
                    ↓ 获取
              ┌─────────────┐
              │   Vault    │
              └─────────────┘
                    ↓ 转发
         ┌────────────────────┐
         │ External Services │
         └────────────────────┘
```

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Anthropic Managed Agents 凭证隔离理念*
