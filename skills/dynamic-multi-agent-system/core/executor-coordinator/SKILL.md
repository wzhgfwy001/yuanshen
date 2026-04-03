---
name: executor-coordinator
description: 执行协调器，协调子Agent的并行/串行执行，传递上下文和输入输出
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 执行协调器 (Executor Coordinator)

## 功能

协调子Agent的并行/串行执行，管理任务依赖关系，传递上下文和输入输出，确保执行顺序正确。

## 核心职责

| 职责 | 说明 |
|------|------|
| 依赖管理 | 解析任务依赖图，确定执行顺序 |
| 并行调度 | 识别可并行执行的子Agent组 |
| 数据传递 | 将前序Agent输出传递给后续Agent |
| 状态监控 | 监控所有子Agent的执行状态 |
| 异常处理 | 处理超时、失败等异常情况 |
| 进度报告 | 定期向主Agent报告执行进度 |

---

## 执行流程

### 步骤1：解析依赖图

```
输入：TaskDecompositionResult.dependency-graph

解析内容：
1. 识别所有节点（子Agent）
2. 识别所有边（依赖关系）
3. 构建有向无环图（DAG）
4. 计算关键路径
```

### 步骤2：划分并行组

```
算法：拓扑排序 + 层级划分

示例依赖图：
    A
   / \
  B   C
   \ /
    D

并行组划分：
- 组1: [A]
- 组2: [B, C]  ← 可并行
- 组3: [D]
```

### 步骤3：按序执行

```
for each 并行组 in 并行组列表:
    # 并行执行组内所有Agent
    parallel_execute(组内Agent)
    
    # 等待所有Agent完成
    wait_all_complete()
    
    # 检查是否有失败
    if any_failed():
        handle_failure()
        break
    
    # 准备下一组的输入
    prepare_next_group_inputs()
```

### 步骤4：数据传递

```
数据流：
Agent-A输出 → 共享记忆层 → Agent-B输入

传递格式：
{
  "from": "agent-A",
  "to": "agent-B",
  "data-type": "outline",
  "content": {...},
  "metadata": {
    "timestamp": "...",
    "checksum": "..."
  }
}
```

---

## 依赖图解析算法

### 拓扑排序

```python
def topological_sort(nodes, edges):
    """
    拓扑排序，返回执行顺序
    """
    in_degree = {node: 0 for node in nodes}
    for edge in edges:
        in_degree[edge['to']] += 1
    
    queue = [node for node in nodes if in_degree[node] == 0]
    result = []
    
    while queue:
        # 当前层级的所有节点（可并行）
        current_level = queue.copy()
        result.append(current_level)
        queue.clear()
        
        for node in current_level:
            for edge in edges:
                if edge['from'] == node:
                    in_degree[edge['to']] -= 1
                    if in_degree[edge['to']] == 0:
                        queue.append(edge['to'])
    
    return result
```

### 关键路径计算

```python
def calculate_critical_path(nodes, edges):
    """
    计算关键路径（最长路径）
    """
    # 动态规划计算最长路径
    dist = {node: 0 for node in nodes}
    predecessor = {node: None for node in nodes}
    
    # 按拓扑顺序处理
    topo_order = topological_sort(nodes, edges)
    
    for level in topo_order:
        for node in level:
            for edge in edges:
                if edge['from'] == node:
                    new_dist = dist[node] + edge.get('weight', 1)
                    if new_dist > dist[edge['to']]:
                        dist[edge['to']] = new_dist
                        predecessor[edge['to']] = node
    
    # 回溯找到关键路径
    end_node = max(dist, key=dist.get)
    path = []
    current = end_node
    while current:
        path.append(current)
        current = predecessor[current]
    
    return list(reversed(path))
```

---

## 并行执行策略

### 最大并行度

```yaml
max-parallel-agents: 4  # 最多同时运行4个子Agent

决策逻辑：
if 组内Agent数 <= max-parallel-agents:
    全部并行执行
else:
    分批并行执行（每批max-parallel-agents个）
```

### 资源感知调度

```
调度前检查：
1. 当前活跃子Agent数
2. 系统可用内存
3. 模型API限流状态

if 活跃数 + 新组数 > max-total-sub-agents:
    等待部分Agent完成
    延迟启动新组
```

---

## 状态监控

### Agent状态跟踪

```json
{
  "task-id": "task-001",
  "agents": {
    "agent-search-001": {
      "status": "completed",
      "started-at": "2026-04-03T10:00:00",
      "completed-at": "2026-04-03T10:02:00",
      "output": "...",
      "quality-score": 5
    },
    "agent-outline-001": {
      "status": "running",
      "started-at": "2026-04-03T10:02:00",
      "progress": 0.6,
      "estimated-remaining": 60
    }
  }
}
```

### 进度计算

```
总进度 = 已完成组数 / 总组数

组内进度 = 组内已完成Agent数 / 组内总Agent数

当前Agent进度 = 各Agent自报告进度的平均值
```

### 进度报告

每25%进度向主Agent报告：

```json
{
  "type": "progress-update",
  "task-id": "task-001",
  "progress": 0.5,
  "current-stage": "大纲设计",
  "completed-stages": ["素材收集"],
  "remaining-stages": ["内容撰写", "质量审查"],
  "estimated-completion": "2026-04-03T10:10:00"
}
```

---

## 异常处理

### 子Agent失败

**检测：** 状态=failed 或 超时

**处理流程：**
```
1. 记录失败信息
2. 判断是否可重试
   - 可重试：重试（最多2次）
   - 不可重试：降级处理
3. 通知主Agent
4. 决策：继续/中止/修改计划
```

### 依赖断裂

**现象：** 前序Agent失败，后续Agent无法获取输入

**处理流程：**
```
1. 暂停后续Agent启动
2. 尝试修复前序Agent
3. 如无法修复：
   - 方案A：主Agent提供替代输入
   - 方案B：跳过该分支
   - 方案C：中止任务
```

### 超时处理

**检测：** 执行时间 > estimated-time × 2

**处理流程：**
```
1. 发送警告给子Agent
2. 等待30秒
3. 如仍无响应：
   - 终止子Agent
   - 记录超时日志
   - 降级处理
```

---

## 数据传递协议

### 共享记忆层接口

```
写入：
write(task-id, agent-id, data-type, content)

读取：
read(task-id, data-type, from-agent)

删除：
delete(task-id, agent-id)
```

### 数据格式标准

```json
{
  "task-id": "task-001",
  "agent-id": "agent-outline-001",
  "data-type": "outline",
  "content": {
    "title": "小说标题",
    "chapters": [...]
  },
  "metadata": {
    "created-at": "2026-04-03T10:02:00",
    "version": 1,
    "checksum": "md5-hash"
  }
}
```

### 数据验证

```
接收数据时验证：
1. 格式正确性（JSON schema）
2. 必填字段完整性
3. 数据一致性（checksum）
4. 版本兼容性
```

---

## 执行日志

### 日志结构

```json
{
  "task-id": "task-001",
  "events": [
    {
      "timestamp": "2026-04-03T10:00:00",
      "type": "group-start",
      "group-id": 1,
      "agents": ["agent-search-001"]
    },
    {
      "timestamp": "2026-04-03T10:02:00",
      "type": "agent-complete",
      "agent-id": "agent-search-001",
      "duration": 120,
      "quality-score": 5
    },
    {
      "timestamp": "2026-04-03T10:02:00",
      "type": "group-complete",
      "group-id": 1
    }
  ]
}
```

### 关键事件

| 事件类型 | 说明 |
|----------|------|
| task-start | 任务开始执行 |
| group-start | 并行组开始 |
| agent-start | 子Agent启动 |
| agent-complete | 子Agent完成 |
| agent-failed | 子Agent失败 |
| group-complete | 并行组完成 |
| data-transfer | 数据传递 |
| task-complete | 任务完成 |
| task-failed | 任务失败 |

---

## 与其他组件的接口

### 输入

- 来自：任务分解器
  - 格式：`TaskDecompositionResult`
- 来自：子Agent管理器
  - 格式：`SubAgentCreationResult`

### 输出

- 到：主Agent
  - 格式：`ExecutionProgressReport`
- 到：质量检查器
  - 格式：`AgentOutput + SelfCheckReport`
- 到：资源清理器
  - 格式：`TaskCompletionResult`

---

## 性能优化

### 缓存策略

```
缓存内容：
- 已完成的子Agent输出
- 依赖图解析结果
- 常用数据格式模板

缓存失效：
- 任务完成后清除
- 内存不足时LRU淘汰
```

### 批处理

```
批量数据传递：
- 收集多个Agent的输出
- 一次性写入共享记忆层
- 减少I/O操作次数
```

### 异步执行

```
异步操作：
- 日志写入（不阻塞主流程）
- 进度报告（定时发送）
- 数据备份（后台进行）
```

---

## 测试用例

### 测试1：串行执行

```
输入：依赖图 A→B→C
预期：执行顺序 A, 然后B, 然后C
```

### 测试2：并行执行

```
输入：依赖图 A→[B,C]→D
预期：B和C并行执行
```

### 测试3：失败处理

```
输入：A失败
预期：B和C不启动，通知主Agent
```

### 测试4：数据传递

```
输入：A输出数据
预期：B正确接收A的输出作为输入
```
