# Anthropic模块集成规则

*不需要改OpenClaw核心的实现规则*

---

## 1. 安全规则（替代sandbox/vault-proxy）

### 危险命令拦截规则

**执行前必检：**

```
执行exec/command前，我必须检查：
1. 危险命令黑名单
2. 凭证访问规则
3. 路径安全
```

**黑名单命令：**
```
rm -rf /, format, del /s /q, powershell -enc, curl | bash, wget | bash
```

**凭证访问规则：**
```
不直接输出token/key
通过vault.proxy()访问
```

### 2. Token节省规则（替代tool-result-clearer/observation-masker）

```
大结果(>10KB)处理：
1. 记录到brain/tool-result-log.json
2. 返回摘要，不返回全文
3. 不把原始结果带入后续上下文

调试日志处理：
1. 保留错误和关键日志
2. 屏蔽DEBUG/console.log内容
```

### 3. 任务追踪规则（替代wake-recovery/session-log）

```
每次任务：
1. 开始 → 记录到brain/sessions/session-YYYY-MM-DD.md
2. 完成 → 更新状态
3. 失败 → 记录错误到brain/tasks/recovery.md
```

---

## 3. 压缩触发规则（替代context-engine）

```
上下文>70%时自动触发：
1. 读取brain/context-engine.js
2. 调用compact()方法
3. 更新brain/progress.json
```

---

## 4. 失败恢复规则（替代cattle-policy）

```
子Agent失败时：
1. 记录到brain/cattle-state.json
2. 重试≤3次
3. 3次后通知用户
4. 保留失败日志供调试
```

---

## 5. Warmup规则

```
每次gateway:startup时：
1. 调用warmupManager.warmup()
2. 预热常用工具
```

---

## 6. 清理规则（替代cleanup）

```
每周一Cron Job执行：
1. 读取cleanup.js
2. 调用fullCleanup()
3. 归档旧文件到brain/archive/
```
