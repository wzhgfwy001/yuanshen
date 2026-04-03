---
name: multi-task-queue
description: 多任务队列管理器，支持多个主任务并行处理，管理任务优先级和执行状态
parent: dynamic-multi-agent-system
version: 1.0.0
---

# 多任务队列管理器 (Multi-Task Queue Manager)

## 功能

接收用户任务，识别多个不相关的主任务，管理任务优先级和执行状态，支持多任务并行处理。

## 核心职责

| 职责 | 说明 |
|------|------|
| 任务接收 | 接收用户输入的任务描述 |
| 多任务识别 | 识别输入中是否包含多个不相关的主任务 |
| 优先级管理 | 管理任务执行优先级 |
| 并发控制 | 控制同时执行的任务数量 |
| 状态跟踪 | 跟踪每个任务的执行状态 |
| 资源分配 | 在多个任务间分配子Agent资源 |

---

## 多任务识别

### 识别规则

**单个任务特征：**
- 单一主题
- 连贯的描述
- 统一的输出要求

**多个任务特征：**
- 明显的分隔（序号、分段）
- 不同的主题
- 独立的输出要求
- 连接词（"另外"、"还有"、"同时"）

### 识别算法

```python
def identify_multiple_tasks(user_input):
    """
    识别用户输入中的多个主任务
    """
    # 1. 按段落分割
    paragraphs = user_input.split('\n\n')
    
    # 2. 查找序号标记
    numbered_tasks = re.findall(r'\d+[\.\)]\s*(.+)', user_input)
    
    # 3. 查找连接词
    connectors = ['另外', '还有', '同时', '此外', 'plus', 'also']
    
    # 4. 语义分析（关键词相似度）
    # 如果两段落的关键词相似度<0.5，认为是不同任务
    
    tasks = []
    if numbered_tasks:
        tasks = numbered_tasks
    elif len(paragraphs) > 1:
        # 检查段落间独立性
        for para in paragraphs:
            if is_independent_task(para):
                tasks.append(para)
    else:
        tasks = [user_input]
    
    return tasks
```

### 示例

**单个任务：**
```
输入："写一本科幻小说，主题是2077年的北京，800字"
输出：["写一本科幻小说，主题是2077年的北京，800字"]
```

**多个任务：**
```
输入：
"1. 写一本科幻小说，主题是2077年的北京
2. 分析这本小说的市场潜力
3. 设计封面描述"

输出：
[
  "写一本科幻小说，主题是2077年的北京",
  "分析这本小说的市场潜力",
  "设计封面描述"
]
```

---

## 优先级管理

### 优先级计算

```
priority_score = base_priority + user_priority + time_priority + urgency_priority

base_priority: 10（基础分）
user_priority: 用户指定（0-20）
time_priority: 等待时间每分钟+1（上限10）
urgency_priority: 紧急任务+10（如"尽快"、"紧急"）
```

### 优先级队列

```
高优先级（>30）：立即执行
中优先级（20-30）：排队等待
低优先级（<20）：空闲时执行
```

### 抢占规则

```
if 新任务优先级 > 当前最高优先级 + 10:
    暂停当前最低优先级任务
    执行新任务
else:
    加入队列
```

---

## 并发控制

### 并发限制

```yaml
max-concurrent-tasks: 3      # 最多3个主任务并行
max-sub-agents-per-task: 6   # 单任务最多6个子Agent
max-total-sub-agents: 12     # 系统总共最多12个子Agent
```

### 资源分配策略

```
策略1：平均分配
- 每个任务分配相同的子Agent配额
- 适合任务优先级相近的情况

策略2：优先级分配
- 高优先级任务获得更多资源
- 适合任务优先级差异大的情况

策略3：动态调整
- 根据任务进度动态调整资源
- 接近完成的任务优先保证资源
```

### 分配算法

```python
def allocate_resources(tasks, total_agents):
    """
    在多个任务间分配子Agent资源
    """
    allocation = {}
    remaining = total_agents
    
    # 按优先级排序
    sorted_tasks = sorted(tasks, key=lambda t: t.priority, reverse=True)
    
    # 高优先级任务优先分配
    for task in sorted_tasks:
        if task.complexity == 'high':
            alloc = min(6, remaining)
        elif task.complexity == 'medium':
            alloc = min(4, remaining)
        else:
            alloc = min(2, remaining)
        
        allocation[task.id] = alloc
        remaining -= alloc
    
    return allocation
```

---

## 任务状态管理

### 状态定义

| 状态 | 说明 | 转换 |
|------|------|------|
| pending | 等待执行 | → running |
| running | 正在执行 | → completed / failed / paused |
| completed | 执行完成 | → archived |
| failed | 执行失败 | → retrying / archived |
| paused | 已暂停 | → running / cancelled |
| cancelled | 已取消 | → archived |

### 状态流转图

```
pending → running → completed → archived
            ↓          ↓
          failed    failed
            ↓          ↓
         retrying → archived
            ↓
         paused → running
            ↓
        cancelled → archived
```

### 状态跟踪

```json
{
  "task-id": "task-001",
  "status": "running",
  "created-at": "2026-04-03T10:00:00",
  "started-at": "2026-04-03T10:01:00",
  "progress": 0.6,
  "current-stage": "大纲设计",
  "sub-agents-active": 2,
  "estimated-completion": "2026-04-03T10:10:00"
}
```

---

## 队列管理

### 队列结构

```
任务队列：
┌─────────────────────────────────────┐
│ 高优先级队列                         │
│ ┌─────────┐ ┌─────────┐            │
│ │ task-001│ │ task-002│            │
│ └─────────┘ └─────────┘            │
├─────────────────────────────────────┤
│ 中优先级队列                         │
│ ┌─────────┐                         │
│ │ task-003│                         │
│ └─────────┘                         │
├─────────────────────────────────────┤
│ 低优先级队列                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ task-004│ │ task-005│ │ task-006││
│ └─────────┘ └─────────┘ └─────────┘│
└─────────────────────────────────────┘
```

### 调度策略

```
调度循环（每5秒）：
1. 检查当前运行任务数
2. 如有空闲容量，从队列取出任务
3. 按优先级顺序启动任务
4. 检查超时任务
5. 更新任务状态
```

### 队列操作

```
enqueue(task): 加入队列
dequeue(): 取出最高优先级任务
remove(task-id): 移除指定任务
reorder(task-id, new-priority): 调整优先级
clear(): 清空队列（仅pending状态）
```

---

## 任务合并与拆分

### 任务合并

**条件：**
- 多个任务类型相同
- 任务间有依赖关系
- 合并后效率更高

**示例：**
```
任务1："写科幻小说第1章"
任务2："写科幻小说第2章"
合并后："写科幻小说第1-2章"（共享世界观设定）
```

### 任务拆分

**条件：**
- 任务过于复杂（>6个子Agent）
- 任务可独立执行
- 用户要求拆分

**示例：**
```
原任务："写一本小说并分析市场潜力"
拆分后：
- 任务1："写一本小说"
- 任务2："分析市场潜力"
```

---

## 超时管理

### 超时检测

```
超时阈值 = 预计时间 × 2

检查频率：每30秒

超时任务：
- 发送警告
- 询问用户是否继续
- 如无响应，标记为failed
```

### 超时处理

```json
{
  "task-id": "task-001",
  "timeout-at": "2026-04-03T10:20:00",
  "estimated-time": 600,
  "actual-time": 1200,
  "action": "notify-user",
  "options": [
    "继续等待",
    "终止任务",
    "增加资源"
  ]
}
```

---

## 用户交互

### 任务提交

```
用户输入任务
    ↓
识别是否多任务
    ↓
确认任务列表
    ↓
用户确认
    ↓
加入队列
```

### 进度查询

```
用户查询："任务进度如何？"
    ↓
返回：
- 当前状态
- 完成百分比
- 预计剩余时间
- 当前环节
```

### 任务控制

```
用户可执行操作：
- 暂停任务
- 恢复任务
- 终止任务
- 调整优先级
- 增加资源
```

---

## 与其他组件的接口

### 输入

- 来自：用户
  - 格式：`{ description: string, priority?: number }`
- 来自：主Agent
  - 格式：`{ action: string, task-id: string }`

### 输出

- 到：任务分类器
  - 格式：`TaskDescription`
- 到：主Agent
  - 格式：`TaskStatusReport`
- 到：用户
  - 格式：`ProgressUpdate`

---

## 日志与审计

### 队列日志

```json
{
  "timestamp": "2026-04-03T10:00:00",
  "event": "task-enqueued",
  "task-id": "task-001",
  "priority": 25,
  "queue-length": 3
}
```

### 审计信息

- 任务提交时间
- 任务开始时间
- 任务完成时间
- 使用的子Agent数
- 总耗时
- 用户满意度

---

## 测试用例

### 测试1：单任务识别

```
输入："写一本科幻小说"
预期：识别为1个任务
```

### 测试2：多任务识别

```
输入："1.写小说 2.分析市场"
预期：识别为2个任务
```

### 测试3：优先级调度

```
输入：3个任务，优先级分别为10、30、20
预期：执行顺序 30→20→10
```

### 测试4：并发控制

```
输入：5个任务同时提交
预期：最多3个并行，其余排队
```
