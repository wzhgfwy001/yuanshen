# 子Agent管理器 - 子Skill

## 用途
管理临时子Agent的创建、执行、监控和清理。

## 创建子Agent
### 基本语法
使用 `sessions_spawn` 工具：


javascript
{
task: "任务描述（必填）",
label: "Agent标识名称",           // 方便追踪
model: "模型名称",                 // 可选，默认使用主Agent模型
cleanup: "delete",                 // 必填：任务完成后删除
mode: "run",                       // run=一次性, session=持续会话
runTimeoutSeconds: 300            // 可选：超时时间
}

### 模型选择建议
| 场景 | 推荐模型 | 理由 |
|------|----------|------|
| 通用对话/写作 | qwen3.5-plus | 平衡能力强，性价比高 |
| 复杂推理 | qwen3-max | 推理能力强 |
| 代码开发 | qwen3-coder-plus | 代码专项能力 |
| 快速执行 | MiniMax-M2.5 | 响应速度快 |
## 清理子Agent（必须）
任务完成后必须删除所有临时子Agent：


javascript
{
action: "kill",
target: "agent:main:subagent:xxx"
}

---
*版本：v1.0*
*依赖：dynamic-multi-agent-core*