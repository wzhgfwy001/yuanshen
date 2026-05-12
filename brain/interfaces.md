# 稳定接口定义

> 基于 Anthropic Managed Agents 的"元编排层"设计理念
> 目标：定义稳定接口，让未来实现可以自由替换
> 生成时间：2026-05-12

## 设计原则

**最重要不是"今天怎么做"，而是"未来怎么改都不需要推倒重来"。**

## 核心接口

### 1. 执行器接口（ExecutionUnit）

```typescript
interface ExecutionUnit {
  // 执行任务
  execute(task: Task): Promise<Result>
  
  // 健康检查
  health(): boolean
  
  // 替换实例
  replace(): void
  
  // 获取状态
  status(): AgentStatus
}
```

**当前实现：**
- `YangShenAgent` implements ExecutionUnit

**未来可替换为：**
- `ExternalAgent`（外部Agent服务）
- `RemoteAgent`（远程Agent）
- `HybridAgent`（混合Agent）

### 2. 任务队列接口（TaskQueue）

```typescript
interface TaskQueue {
  // 入队
  enqueue(task: Task): taskId
  
  // 出队
  dequeue(): Task | null
  
  // 状态查询
  status(taskId: string): TaskStatus
  
  // 优先级排序
  reorder(priority: Priority): void
}
```

### 3. 存储接口（Storage）

```typescript
interface Storage {
  // 写入
  write(key: string, value: any): void
  
  // 读取
  read(key: string): any | null
  
  // 查询
  query(filter: Filter): any[]
  
  // 删除
  delete(key: string): void
}
```

**当前实现：**
- 文件系统存储（brain/*.md）

**未来可替换为：**
- 数据库存储
- 云存储
- 分布式存储

## 接口稳定性保证

| 接口 | 稳定性 | 说明 |
|------|--------|------|
| ExecutionUnit.execute() | 高 | Task→Result语义不变 |
| TaskQueue.* | 高 | 入队出队语义不变 |
| Storage.* | 高 | 键值语义不变 |

## 好处

1. **实现可替换**：今天的YangShen可以换成明天的另一个Agent
2. **测试容易**：可以mock接口进行单元测试
3. **升级平滑**：局部升级不影响整体架构

---

*本设计由元神系统于 2026-05-12 生成*
*基于 Anthropic Managed Agents 元编排层理念*