# 🔧 Agency HQ 集成补丁说明

**目标版本：** Agency HQ v1.0.0 → v1.1.0-dmags  
**适配系统：** 混合动态多 Agent 协作系统

---

## 📋 需要修改的文件

### 1. src/lib/agents.ts

**修改内容：**
- 替换固定 Agent 配置为动态生成
- 添加 DMAGS 角色映射
- 添加状态同步接口

**补丁：**
```typescript
// 原代码（删除）
export const AGENTS: AgentConfig[] = [
  { id: 'main', name: 'Spock', ... },
  { id: 'dev', name: 'Scotty', ... },
  // ... 11 个固定 Agent
];

// 新代码（替换）
import { generateAgentConfigs, DMAGSAgentConfig } from './agents-dmags.config';

// 动态 Agent 列表（从混合动态多 Agent 系统读取）
export let AGENTS: DMAGSAgentConfig[] = [];

// 从系统加载 Agent
export async function loadAgentsFromSystem(): Promise<void> {
  try {
    const response = await fetch('/api/dmags/agents');
    const taskDecomposition = await response.json();
    AGENTS = generateAgentConfigs(taskDecomposition);
  } catch (error) {
    console.error('加载 Agent 失败:', error);
    AGENTS = [];
  }
}

// 定时同步（每 3 秒）
setInterval(loadAgentsFromSystem, 3000);
```

---

### 2. src/app/api/agents/status/route.ts

**修改内容：**
- 添加与子 Agent 管理器的同步
- 读取真实任务状态

**补丁：**
```typescript
// 新增：读取子 Agent 状态
async function getSubAgentStatus() {
  const statusFile = path.join(
    process.env.OPENCLAW_HOME || '',
    'subagents/status.json'
  );
  
  try {
    const status = await fs.readFile(statusFile, 'utf-8');
    return JSON.parse(status);
  } catch {
    return { agents: [] };
  }
}

// 修改：返回真实的 Agent 状态
export async function GET() {
  const subAgentStatus = await getSubAgentStatus();
  
  return Response.json({
    agents: subAgentStatus.agents.map(agent => ({
      ...agent,
      room: assignAgentRoom(agent, agent.taskState),
    })),
  });
}
```

---

### 3. src/app/api/agents/activity/route.ts

**修改内容：**
- 读取真实的活动流
- 添加任务执行流、质量审查流

**补丁：**
```typescript
// 新增：读取任务执行流
async function getTaskActivity() {
  const activityFile = path.join(
    process.env.OPENCLAW_HOME || '',
    'tasks/activity.jsonl'
  );
  
  const activities = [];
  try {
    const lines = (await fs.readFile(activityFile, 'utf-8')).split('\n');
    for (const line of lines.slice(-50)) {  // 最近 50 条
      if (line.trim()) {
        activities.push(JSON.parse(line));
      }
    }
  } catch {
    // 文件不存在
  }
  
  return activities;
}

// 修改：返回真实活动
export async function GET() {
  const activities = await getTaskActivity();
  
  return Response.json({
    activities: activities.map(activity => ({
      timestamp: activity.timestamp,
      agentId: activity.agentId,
      type: mapActivityType(activity.type),
      content: activity.content,
      taskId: activity.taskId,
    })),
  });
}

// 活动类型映射
function mapActivityType(type: string): ActivityType {
  const mapping: Record<string, ActivityType> = {
    'subagent_created': 'scanning',
    'task_started': 'regular',
    'task_completed': 'task_complete',
    'self_check': 'regular',
    'main_agent_check': 'regular',
    'reviewer_check': 'security',
    'skill_solidified': 'deploy',
    'error': 'alert',
  };
  
  return mapping[type] || 'regular';
}
```

---

### 4. src/app/api/agents/stats/route.ts

**修改内容：**
- 读取真实的系统统计
- 添加 Skill 固化统计

**补丁：**
```typescript
// 新增：读取 Skill 固化统计
async function getSkillStats() {
  const statsFile = path.join(
    process.env.SKILL_HOME || '',
    'state/skill-counters.json'
  );
  
  try {
    const stats = await fs.readFile(statsFile, 'utf-8');
    return JSON.parse(stats);
  } catch {
    return { solidifications: 0, patterns: [] };
  }
}

// 修改：返回真实统计
export async function GET() {
  const skillStats = await getSkillStats();
  
  return Response.json({
    totalTasks: skillStats.totalTasks || 0,
    completedTasks: skillStats.completedTasks || 0,
    solidifications: skillStats.solidifications || 0,
    averageScore: skillStats.averageScore || 0,
    topAgents: skillStats.topAgents || [],
  });
}
```

---

### 5. src/components/PixelOffice.tsx

**修改内容：**
- 添加依赖关系可视化
- 添加 Token 消耗显示
- 添加质量审查进度条

**补丁：**
```typescript
// 新增：绘制依赖关系连线
function drawDependencyLines(
  ctx: CanvasRenderingContext2D,
  agents: DMAGSAgentConfig[]
) {
  agents.forEach(agent => {
    if (agent.dependencies) {
      agent.dependencies.forEach((depId: string) => {
        const depAgent = agents.find(a => a.id === depId);
        if (depAgent) {
          // 绘制连线
          ctx.beginPath();
          ctx.moveTo(agent.x, agent.y);
          ctx.lineTo(depAgent.x, depAgent.y);
          ctx.strokeStyle = 'rgba(139,92,246,0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);  // 虚线
          ctx.stroke();
        }
      });
    }
  });
}

// 新增：绘制 Token 消耗
function drawTokenUsage(
  ctx: CanvasRenderingContext2D,
  agent: DMAGSAgentConfig
) {
  const usagePercent = (agent.tokenUsage / agent.tokenBudget) * 100;
  const color = usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#10b981';
  
  ctx.fillStyle = color;
  ctx.font = '10px monospace';
  ctx.fillText(`${Math.round(usagePercent)}%`, agent.x - 20, agent.y + 40);
}

// 新增：绘制质量审查进度
function drawQualityProgress(
  ctx: CanvasRenderingContext2D,
  agent: DMAGSAgentConfig
) {
  if (agent.qualityChecks) {
    const checks = agent.qualityChecks;
    const colors = ['#10b981', '#3b82f6', '#8b5cf6'];  // 绿/蓝/紫
    
    checks.forEach((check: any, index: number) => {
      ctx.fillStyle = colors[index];
      ctx.fillRect(
        agent.x - 30 + (index * 20),
        agent.y - 40,
        15,
        5
      );
    });
  }
}
```

---

### 6. 新增文件：src/lib/agents-dmags.config.ts

**内容：** 见 `agents-dmags.config.ts` 文件

---

## 🔧 配置文件

### .env.local

```bash
# Agency HQ - DMAGS Custom
ARENA_MODE=live
HOME=C:\Users\DELL
OPENCLAW_HOME=C:\Users\DELL\.openclaw
SKILL_HOME=C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system

# 数据同步
SYNC_INTERVAL=3000
ENABLE_DEPENDENCY_VIS=true
ENABLE_TOKEN_TRACKING=true
ENABLE_QUALITY_VIS=true
ENABLE_SKILL_SOLIDIFICATION=true
```

---

## 📊 数据流

```
混合动态多 Agent 系统
├─ 任务分解器
│  └─ 生成子任务 → Agency HQ 动态创建 Agent
├─ 子 Agent 管理器
│  ├─ 创建子 Agent → Agency HQ 添加 Agent
│  ├─ 更新状态 → Agency HQ 更新位置/进度
│  └─ 释放子 Agent → Agency HQ 移动到休息室
├─ 质量检查器
│  ├─ 自我审查 → Agency HQ 显示绿色进度条
│  ├─ 主 Agent 审查 → Agency HQ 显示蓝色进度条
│  └─ 审查 Agent 审查 → Agency HQ 显示紫色进度条
└─ Skill 进化分析器
   └─ Skill 固化 → Agency HQ 播放固化动画
```

---

## ✅ 测试清单

### 功能测试

- [ ] Agent 动态创建
- [ ] 状态同步（<3 秒延迟）
- [ ] 依赖关系显示
- [ ] Token 消耗显示
- [ ] 质量审查进度
- [ ] Skill 固化动画
- [ ] 房间分配逻辑

### 性能测试

- [ ] 刷新频率 3 秒
- [ ] 动画 60fps
- [ ] 内存占用 <200MB
- [ ] CPU 占用 <10%

### 集成测试

- [ ] 读取子 Agent 状态
- [ ] 读取任务活动
- [ ] 读取 Skill 统计
- [ ] 响应系统事件

---

## 🚀 部署步骤

1. **备份原文件**
```bash
cd D:\agency-hq-1.0.0
git checkout -b backup-original
```

2. **应用补丁**
```bash
# 复制补丁文件
xcopy /Y "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-hq-integration\*.ts" "src\lib\"
xcopy /Y "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-hq-integration\*.tsx" "src\components\"
```

3. **修改配置文件**
```bash
copy .env.example .env.local
# 编辑 .env.local 设置路径
```

4. **安装依赖**
```bash
npm install
```

5. **启动测试**
```bash
npm run dev
# 访问 http://localhost:3000
```

6. **验证功能**
- [ ] 查看 Agent 列表
- [ ] 检查状态同步
- [ ] 验证依赖显示
- [ ] 测试 Skill 固化动画

---

*集成补丁说明 v1.0*  
*创建时间：2026-04-05*  
*版本：v1.1.0-dmags*
