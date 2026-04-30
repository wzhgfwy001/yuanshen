# YangShen Flow - 事件驱动任务编排系统

> 基于CrewAI Flow设计模式重构的下一代阳神系统

## 核心设计

### 与CrewAI Flow对比

| 特性 | CrewAI | YangShen Flow |
|------|--------|--------------|
| **入口** | `@start()` decorator | `flow.start(method)` |
| **监听** | `@listen()` decorator | `flow.listen(method, targets)` |
| **状态** | `self.state` (dict/Pydantic) | `this.state` (FlowState实例或dict) |
| **持久化** | `@persist` decorator + SQLite | `persist(method)` + 自定义实现 |
| **条件触发** | `@listen(or_(A, B))` | `flow.listenAny(method, A, B)` |

### Flow架构

```
@start() ──────────────────────┐
  step1()                      │
        │                      │
        ▼                      │
@listen(step1)                 │
  step2(output)                │
        │                      │
        ▼                      │
@listen(step2)                 │
  step3(output)                │
                                │
@start() ──────────────────────┼─▶ 并行执行
  step1_alt()                  │
                                │
  @listen(or_(step1, step1_alt)) ──▶ 任一触发则执行
```

## 使用示例

### 1. Unstructured Flow（灵活模式）

```javascript
const { Flow } = require('./flow.js');

class CityFlow extends Flow {
    constructor() {
        super({});
        
        this.start(this.generateCity.bind(this));
        this.listen(this.generateFunFact.bind(this), 'generateCity');
        this.listen(this.saveResult.bind(this), 'generateFunFact');
    }
    
    generateCity() {
        console.log('🏙️ 生成随机城市...');
        this.state.city = 'Tokyo';
        return 'Tokyo';
    }
    
    generateFunFact(city) {
        console.log(`🎯 为 ${city} 生成趣事...`);
        this.state.fun_fact = 'Tokyo is the most populous metropolitan area in the world.';
        return this.state.fun_fact;
    }
    
    saveResult(fact) {
        console.log('💾 保存结果...');
        this.state.final = fact;
        return fact;
    }
}

const flow = new CityFlow();
flow.plot();
await flow.kickoff();
console.log(flow.state);
```

### 2. Structured Flow（类型安全模式）

```javascript
const { Flow, FlowState } = require('./flow.js');

// 定义State类
class MyState extends FlowState {
    constructor() {
        super();
        this.counter = 0;
        this.message = '';
        this.results = [];
    }
}

class MyFlow extends Flow {
    constructor() {
        super(new MyState());
        
        this.start(this.step1.bind(this));
        this.listen(this.step2.bind(this), 'step1');
    }
    
    step1() {
        this.state.counter += 1;
        this.state.message = 'Step 1完成';
        return this.state.message;
    }
    
    step2(output) {
        this.state.results.push(output);
        return this.state.results;
    }
}
```

### 3. Or Logic（任一触发）

```javascript
this.start(this.taskA.bind(this));
this.start(this.taskB.bind(this));
this.listenAny(this.mergeResults.bind(this), 'taskA', 'taskB');
// 当 taskA 或 taskB 任一完成时，mergeResults 会执行
```

### 4. 持久化支持

```javascript
class PersistentFlow extends Flow {
    constructor() {
        super({});
        
        this.start(this.step1.bind(this));
        this.persist(this.step1); // 标记step1需要持久化
    }
    
    async _persistState(methodName, output) {
        // 自定义持久化逻辑
        console.log(`💾 持久化: ${methodName}`);
        await saveToFile(methodName, output);
    }
}
```

## API参考

### Flow类

| 方法 | 说明 |
|------|------|
| `start(method)` | 注册入口方法，Flow开始时执行 |
| `listen(method, ...targets)` | 注册监听方法，所有targets完成后执行 |
| `listenAny(method, ...targets)` | 注册监听方法，任一target完成后执行 |
| `persist(method)` | 标记方法需要持久化 |
| `kickoff(inputs)` | 执行Flow |
| `getState()` | 获取当前状态 |
| `setState(state)` | 设置状态 |
| `plot()` | 可视化Flow结构 |

### FlowState类

| 属性 | 说明 |
|------|------|
| `id` | 自动生成的唯一标识符 |

## 与旧阳神系统的对比

### 架构改进

| 方面 | 旧阳神系统 | YangShen Flow |
|------|-----------|--------------|
| **任务编排** | task-decomposer.js | 事件驱动Flow |
| **状态管理** | progress.json文件 | this.state内存 |
| **任务依赖** | 手动的then链 | @listen自动依赖 |
| **并行执行** | 手动管理 | @start自动并行 |
| **持久化** | 文件系统 | 可扩展的_persistState |

### 迁移指南

旧系统：
```javascript
const result = await orchestrator.execute(task);
const subAgents = await taskManager.decompose(result);
for (const agent of subAgents) {
    const output = await agent.execute();
    await qualityChecker.verify(output);
}
```

新系统（YangShen Flow）：
```javascript
class MyFlow extends Flow {
    constructor() {
        super({});
        this.start(this.execute.bind(this));
        this.listen(this.decompose.bind(this), 'execute');
        this.listen(this.verify.bind(this), 'decompose');
    }
}
```

## 下一步

1. **集成到阳神核心**：将Flow作为新的编排层
2. **持久化实现**：实现SQLite或文件系统的持久化
3. **可视化工具**：创建HTML可视化Flow执行过程
4. **Crew支持**：实现类似CrewAI的Agent团队协作

---

*基于CrewAI Flow设计，2026-04-27*