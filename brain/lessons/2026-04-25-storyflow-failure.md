# 失败教训 - StoryFlow项目失败

**时间：** 2026-04-25T11:27:00.000Z
**任务：** StoryFlow项目开发
**任务类型：** project_development

## 发生场景

project_development StoryFlow websocket exec read windows node

## 失败模式

storyflow_ws_port_conflict + agent_no_output + api_key_mismatch

## 根因

1. **WebSocket端口冲突** - 多个进程争用5001端口，没有检测端口是否已被占用就直接启动
2. **调试日志无法查看** - 添加了print语句但看不到输出，不知道程序执行到哪一步
3. **Agent 1 "No output"** - 始终未诊断出根本原因，一直在同一问题上重复尝试
4. **API Key名称不匹配** - nodes.py查找STORYFLOW_API_KEY，但实际环境变量是MINIMAX_API_KEY

## 影响范围 10/10 - 项目被用户删除

## 失败步骤

1. 创建项目后直接启动，没有检查端口占用
2. 启动失败后多次重启，没有先诊断问题
3. 调试日志没有正确配置，输出看不到
4. 遇到"No output"错误时没有追溯因果链，在表面问题上反复
5. 没有先验证API Key是否匹配就开始调试其他问题

## 改进建议

1. **端口检测** - 启动前用 `netstat` 或 PowerShell `Get-NetTCPConnection` 检查端口是否被占用
2. **调试日志** - 确保日志输出到stderr或文件，不要只依赖console.log
3. **Agent "No output"** - 先验证实际行为，用最简单的输入测试Agent是否响应
4. **API Key** - 先检查环境变量名称和实际值是否匹配
5. **因果链分析** - 遇到问题时先列出可能的根因，逐一验证，不要猜测

## 因果链

- 长度：5 步
- 第一个失败：启动WebSocket服务时端口被占用
- 因果链：
  1. 后端5001端口已被占用（如另一个node进程）
  2. 连接失败，但调试日志没有正确输出
  3. 用户看不到错误原因
  4. Agent诊断时没有追溯到端口冲突
  5. 反复重启导致端口一直被占用

## 规避规则

当检测到以下情况时，必须先解决再继续：
1. 启动服务前检查端口占用
2. Agent返回"No output"时先验证基本功能
3. 调试前确认环境变量名称和值匹配
4. 日志必须输出到可查看的位置

---
*手动记录 by 元神 - 2026-04-25*
