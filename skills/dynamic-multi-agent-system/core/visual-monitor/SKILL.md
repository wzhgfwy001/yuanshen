---
name: visual-monitor
description: 可视化监控模块，实时显示子 Agent 状态、任务执行进度、资源使用情况
parent: dynamic-multi-agent-system
version: 1.1.0
---

# 可视化监控模块 (Visual Monitor)

## 功能

实时监控子 Agent 状态、任务执行进度、资源使用情况，提供直观的可视化界面。

## 核心特性

### 1. 直接文件系统读取

**不依赖 API**，直接读取 OpenClaw 文件系统：
- ✅ 读取 `~/.openclaw/subagents/status.json` - 子 Agent 状态
- ✅ 读取 `~/.openclaw/tasks/activity.jsonl` - 任务活动流
- ✅ 读取 `~/.openclaw/state/skill-counters.json` - Skill 统计
- ✅ 读取 `~/.openclaw/agents/*/sessions/*.jsonl` - Agent 会话

### 2. 动态 Agent 渲染

根据任务分解结果动态创建 Agent 角色：
- 🏰 **世界观架构师** - 研究桌 + 眼镜配饰
- 📐 **大纲设计师** - 设计桌 + 单眼镜
- 🎭 **角色塑造师** - 设计桌 + 领结
- 🕸️ **剧情编织师** - 研究桌 + 围巾
- ⚗️ **文字炼金师** - 内容桌 + 耳机
- 🔍 **审查官** - 安全桌 + 徽章
- 📊 **数据分析师** - 研究桌 + 遮阳板
- 💡 **策略顾问** - 策略桌 + 帽子
- 🏗️ **架构师** - 工程桌 + 皇冠
- 💻 **开发工程师** - 开发桌 + 眼镜
- 🧪 **测试工程师** - 工程桌 + 徽章

### 3. 房间分配逻辑

基于任务状态智能分配房间：

| 任务状态 | 子任务状态 | 房间 | 说明 |
|----------|------------|------|------|
| running | executing | 主办公室 | 正在执行 |
| running | waiting | 会议室 | 等待依赖 |
| running | review | 审查室 | 质量审查 |
| completed | idle<15min | 厨房 | 短暂休息 |
| completed | idle≥15min | 游戏室 | 长期休息 |
| released | - | 休息室 | 已释放 |

### 4. 可视化元素

#### 依赖关系图
- 🔗 虚线连接显示依赖
- 🔴 红色标记阻塞状态
- 🟢 绿色标记就绪状态

#### Token 消耗
- 💰 实时显示当前消耗
- 📊 进度条显示预算使用
- ⚠️ 超预算警告（>90% 红色）

#### 质量审查流程
- ✅ 自我审查（绿色条）
- ✅ 主 Agent 审查（蓝色条）
- ✅ 审查 Agent 审查（紫色条）

#### Skill 固化
- ✨ 特殊发光动画
- 🏆 固化徽章显示
- 📈 固化计数更新

---

## 数据结构

### Agent 状态

```typescript
interface AgentState {
  id: string;              // task-003-subagent-1
  name: string;            // 世界观架构师 -01
  emoji: string;           // 🏰
  role: string;            // 世界观架构
  model: string;           // qwen3.5-plus
  color: string;           // #8b5cf6
  desk: string;            // research
  accessory: string;       // glasses
  
  // 任务相关
  taskId: string;          // task-003
  subtaskId: string;       // subtask-1
  progress: number;        // 0.65
  status: 'active' | 'waiting' | 'review' | 'completed';
  
  // 资源相关
  tokenUsage: number;      // 12500
  tokenBudget: number;     // 50000
  
  // 时间相关
  createdAt: string;       // ISO timestamp
  lastActive: string;      // ISO timestamp
  idleMinutes: number;     // 5
  
  // 依赖相关
  dependencies: string[];  // ['subtask-0']
  isBlocked: boolean;      // false
  
  // 质量审查
  qualityChecks: {
    selfCheck: boolean;
    mainAgentCheck: boolean;
    reviewerCheck: boolean;
  };
  
  // 房间分配
  room: RoomId;
}
```

### 活动流

```typescript
interface ActivityItem {
  timestamp: string;       // ISO timestamp
  agentId: string;         // task-003-subagent-1
  type: ActivityType;      // task_started
  content: string;         // "开始执行子任务 1"
  taskId: string;          // task-003
  subtaskId: string;       // subtask-1
}

type ActivityType = 
  | 'subagent_created'     // 子 Agent 创建
  | 'task_started'         // 任务开始
  | 'task_progress'        // 任务进度
  | 'task_completed'       // 任务完成
  | 'self_check'           // 自我审查
  | 'main_agent_check'     // 主 Agent 审查
  | 'reviewer_check'       // 审查 Agent 审查
  | 'skill_solidified'     // Skill 固化
  | 'token_warning'        // Token 警告
  | 'error';               // 错误
```

### 系统统计

```typescript
interface SystemStats {
  // 任务统计
  totalTasks: number;
  completedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  
  // Agent 统计
  totalSubAgents: number;
  activeSubAgents: number;
  idleSubAgents: number;
  
  // 资源统计
  totalTokenUsage: number;
  averageTokenPerTask: number;
  
  // Skill 统计
  solidifications: number;
  patterns: Array<{
    name: string;
    count: number;
    lastUsed: string;
  }>;
  
  // 质量统计
  averageScore: number;
  passRate: number;
}
```

---

## 文件读取

### 读取子 Agent 状态

```typescript
async function readSubAgentStatus(): Promise<AgentState[]> {
  const statusFile = path.join(
    process.env.OPENCLAW_HOME || '',
    'subagents/status.json'
  );
  
  try {
    const data = await fs.readFile(statusFile, 'utf-8');
    const status = JSON.parse(data);
    return status.agents || [];
  } catch (error) {
    console.error('读取子 Agent 状态失败:', error);
    return [];
  }
}
```

### 读取任务活动流

```typescript
async function readTaskActivity(): Promise<ActivityItem[]> {
  const activityFile = path.join(
    process.env.OPENCLAW_HOME || '',
    'tasks/activity.jsonl'
  );
  
  const activities: ActivityItem[] = [];
  
  try {
    const content = await fs.readFile(activityFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // 读取最近 50 条
    for (const line of lines.slice(-50)) {
      try {
        activities.push(JSON.parse(line));
      } catch (e) {
        // 跳过无效行
      }
    }
  } catch (error) {
    console.error('读取活动流失败:', error);
  }
  
  return activities;
}
```

### 读取 Skill 统计

```typescript
async function readSkillStats(): Promise<SystemStats> {
  const statsFile = path.join(
    process.env.SKILL_HOME || '',
    'state/skill-counters.json'
  );
  
  try {
    const data = await fs.readFile(statsFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取 Skill 统计失败:', error);
    return {
      totalTasks: 0,
      solidifications: 0,
      patterns: [],
    };
  }
}
```

---

## 定时同步

```typescript
// 每 3 秒同步一次
setInterval(async () => {
  const [agents, activities, stats] = await Promise.all([
    readSubAgentStatus(),
    readTaskActivity(),
    readSkillStats(),
  ]);
  
  // 更新前端显示
  updateDashboard({ agents, activities, stats });
}, 3000);
```

---

## 房间分配算法

```typescript
function assignAgentRoom(agent: AgentState): RoomId {
  // 有未完成的依赖 → 会议室
  if (agent.dependencies && agent.dependencies.length > 0) {
    const unmetDeps = agent.dependencies.filter(depId => {
      const depAgent = agents.find(a => a.subtaskId === depId);
      return depAgent && depAgent.status !== 'completed';
    });
    
    if (unmetDeps.length > 0) {
      return 'meeting_room';
    }
  }
  
  // 正在审查 → 审查室
  if (agent.status === 'review') {
    return 'review_room';
  }
  
  // 执行中 → 主办公室
  if (agent.status === 'active') {
    return 'main_office';
  }
  
  // 等待中 → 会议室
  if (agent.status === 'waiting') {
    return 'meeting_room';
  }
  
  // 已完成但空闲<15 分钟 → 厨房
  if (agent.idleMinutes < 15) {
    return 'kitchen';
  }
  
  // 已完成且空闲>15 分钟 → 游戏室
  if (agent.idleMinutes >= 15) {
    return 'game_room';
  }
  
  // 离线/已释放 → 休息室
  return 'rest_room';
}
```

---

## 渲染逻辑

### Canvas 渲染

```typescript
function renderOffice(canvas: HTMLCanvasElement, agents: AgentState[]) {
  const ctx = canvas.getContext('2d')!;
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制房间背景
  drawRoomBackground(ctx);
  
  // 绘制依赖关系连线
  drawDependencyLines(ctx, agents);
  
  // 绘制每个 Agent
  agents.forEach(agent => {
    if (agent.room === 'main_office') {
      drawAgent(ctx, agent);
    }
  });
}

function drawAgent(ctx: CanvasRenderingContext2D, agent: AgentState) {
  // 绘制 Agent 身体
  ctx.fillStyle = agent.color;
  ctx.beginPath();
  ctx.arc(agent.x, agent.y, 20, 0, Math.PI * 2);
  ctx.fill();
  
  // 绘制 emoji
  ctx.font = '24px Arial';
  ctx.fillText(agent.emoji, agent.x - 12, agent.y + 8);
  
  // 绘制配饰
  drawAccessory(ctx, agent.accessory, agent.x, agent.y);
  
  // 绘制名称
  ctx.fillStyle = '#fff';
  ctx.font = '10px Arial';
  ctx.fillText(agent.name, agent.x - 30, agent.y + 35);
  
  // 绘制进度条
  drawProgressBar(ctx, agent.progress, agent.x - 20, agent.y + 45, 40, 4);
  
  // 绘制 Token 消耗
  const usagePercent = (agent.tokenUsage / agent.tokenBudget) * 100;
  ctx.fillStyle = usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#10b981';
  ctx.font = '9px monospace';
  ctx.fillText(`${Math.round(usagePercent)}%`, agent.x - 15, agent.y + 60);
  
  // 绘制质量审查进度
  drawQualityChecks(ctx, agent.qualityChecks, agent.x - 15, agent.y - 30);
}
```

---

## 配置选项

```typescript
interface VisualMonitorConfig {
  // 同步配置
  syncInterval: number;           // 3000ms
  
  // 可视化配置
  enableDependencyVis: boolean;   // true
  enableTokenTracking: boolean;   // true
  enableQualityVis: boolean;      // true
  enableSkillSolidification: boolean; // true
  
  // 性能配置
  maxActivities: number;          // 50
  canvasWidth: number;            // 800
  canvasHeight: number;           // 600
  
  // 路径配置
  openclawHome: string;           // ~/.openclaw
  skillHome: string;              // ~/.openclaw/workspace/skills/dynamic-multi-agent-system
}
```

---

## 使用示例

```typescript
// 初始化监控器
const monitor = new VisualMonitor({
  syncInterval: 3000,
  enableDependencyVis: true,
  enableTokenTracking: true,
  enableQualityVis: true,
  enableSkillSolidification: true,
  openclawHome: 'C:\\Users\\DELL\\.openclaw',
  skillHome: 'C:\\Users\\DELL\\.openclaw\\workspace\\skills\\dynamic-multi-agent-system',
});

// 启动监控
await monitor.start();

// 停止监控
await monitor.stop();
```

---

*可视化监控模块 v1.1.0*  
*创建时间：2026-04-05*  
*完全原生实现，不依赖外部 API*
