---
name: agency-hq-integration
description: Agency HQ与混合动态多Agent系统的定制化集成模块，负责子Agent状态可视化、房间分配逻辑、活动流展示
parent: dynamic-multi-agent-system
version: 1.1.0-dmags
triggers:
  - "agent_created"
  - "agent_state_changed"
  - "agent_released"
  - "task_completed"
  - "quality_check"
  - "skill_solidified"
---

# agency-hq-integration

**【团队总部】Agency HQ Integration — 子Agent可视化与状态管理**

## 功能定位

agency-hq-integration是混合动态多Agent系统的**可视化与状态管理模块**，负责：
1. 子Agent状态实时可视化
2. 房间分配逻辑（基于任务状态）
3. 活动流展示（创建/执行/完成/审查）
4. Token消耗追踪
5. Skill固化事件通知

## 架构设计

### 模块类型
- **类型**：集成模块（TypeScript配置 + 可视化逻辑）
- **语言**：TypeScript配置 + 外部Agency HQ服务
- **依赖**：subagent-manager（状态源）、task-decomposer（任务源）

### 数据流

```
subagent-manager
    ↓ 状态更新
agency-hq-integration
    ↓ 可视化同步
Agency HQ（外部服务）
    ↓ 用户可视化
主界面
```

### 房间分配逻辑

| 任务状态 | Agent状态 | 分配房间 |
|----------|-----------|----------|
| running | executing | main_office |
| running | waiting | meeting_room |
| running | review | review_room |
| completed | - | kitchen |
| completed | idle>15min | game_room |
| released | - | rest_room |

## 核心功能

### 1. 状态同步

**触发事件**：
- `agent_created` - 创建新Agent时添加到办公室
- `agent_state_changed` - 状态变化时更新房间
- `agent_released` - 释放时移动到休息室

**数据格式**：
```typescript
interface AgentState {
  id: string;
  name: string;
  emoji: string;
  role: string;
  model: string;
  color: string;
  desk: string;
  accessory: string;
  taskId: string;
  subtaskId: string;
  progress: number;
  tokenUsage: number;
  status: 'active' | 'waiting' | 'review' | 'completed' | 'released';
  room: RoomId;
}
```

### 2. 依赖关系可视化

**功能**：
- 显示Agent之间的依赖连线
- 关键路径高亮
- 阻塞状态红色标记

**配置**：
```typescript
ENABLE_DEPENDENCY_VIS=true
```

### 3. Token消耗追踪

**功能**：
- 每个Agent显示当前Token消耗
- 显示累计Token消耗
- 显示预算剩余百分比

**配置**：
```typescript
ENABLE_TOKEN_TRACKING=true
```

### 4. 质量审查流程

**三层审查可视化**：
1. 自我审查（绿色进度条）
2. 主Agent审查（蓝色进度条）
3. 审查Agent审查（紫色进度条）

**配置**：
```typescript
ENABLE_QUALITY_VIS=true
```

### 5. Skill固化动画

**触发时机**：任务完成3次后模式识别成功

**显示效果**：
- ✨ 特殊动画效果
- 🏆 固化徽章显示
- 📊 固化计数更新

## 配置文件

### agents-dmags.config.ts

```typescript
export const dmagsConfig = {
  version: "1.1.0-dmags",
  system: "dynamic-multi-agent-system",
  syncMode: "realtime",
  syncInterval: 3000, // 3秒同步一次
  rooms: [
    "main_office",
    "meeting_room",
    "review_room",
    "kitchen",
    "game_room",
    "server_room",
    "rest_room"
  ],
  features: {
    dependencyVisualization: true,
    tokenTracking: true,
    qualityVisualization: true,
    skillSolidification: true
  },
  agentRoles: [
    { id: "worldbuilder", name: "世界观架构师", emoji: "🏰" },
    { id: "outliner", name: "大纲设计师", emoji: "📐" },
    { id: "character_designer", name: "角色塑造师", emoji: "🎭" },
    { id: "plot_weaver", name: "剧情编织师", emoji: "🕸️" },
    { id: "writer", name: "文字炼金师", emoji: "⚗️" },
    { id: "reviewer", name: "审查官", emoji: "🔍" },
    { id: "data_analyst", name: "数据分析师", emoji: "📊" },
    { id: "strategist", name: "策略顾问", emoji: "💡" },
    { id: "architect", name: "架构师", emoji: "🏗️" },
    { id: "developer", name: "开发工程师", emoji: "💻" },
    { id: "tester", name: "测试工程师", emoji: "🧪" }
  ]
};
```

## 环境变量

```bash
# Agency HQ - DMAGS Custom Version
ARENA_MODE=live
HOME=C:\\Users\\DELL
OPENCLAW_HOME=C:\\Users\\DELL\\.openclaw
SKILL_HOME=C:\\Users\\DELL\\.openclaw\\workspace\\skills\\dynamic-multi-agent-system
SYNC_INTERVAL=3000
ENABLE_DEPENDENCY_VIS=true
ENABLE_TOKEN_TRACKING=true
ENABLE_QUALITY_VIS=true
```

## 集成步骤

### 1. 安装Agency HQ

```bash
xcopy /E /I /Y "D:\\agency-hq-1.0.0" "[core]\\agency-hq"
```

### 2. 应用定制补丁

```bash
cd [core]\\agency-hq
# 修改 agents.ts - 支持动态Agent
# 修改 room-logic.ts - 应用新的房间分配逻辑
# 修改 activity-feed.ts - 增强活动流
```

### 3. 配置环境变量

```bash
copy .env.example .env.local
# 编辑 .env.local 设置系统路径
```

### 4. 启动服务

```bash
npm install
npm run dev
```

## 与其他模块的集成

### subagent-manager

```
subagent-manager → agency-hq-integration
├─ createSubAgent() → 添加Agent到办公室
├─ assignTask() → 更新Agent状态为active
├─ updateProgress() → 更新进度条
├─ completeTask() → 移动到厨房/游戏室
├─ releaseSubAgent() → 移动到休息室
└─ onTokenUsage() → 更新Token消耗
```

### task-decomposer

```
task-decomposer → agency-hq-integration
├─ decomposeTask() → 创建对应数量Agent
├─ setDependencies() → 显示依赖连线
└─ completeDecomposition() → 更新房间分配
```

### quality-checker

```
quality-checker → agency-hq-integration
├─ selfCheck() → 显示自我审查动画
├─ mainAgentCheck() → 显示主Agent审查
├─ reviewerCheck() → 移动到审查室
└─ approve() → 完成任务，移动到休息室
```

## 使用示例

### 场景1：创意写作任务

```
任务：写一本科幻小说
↓
任务分解器 → 5个任务
↓
子Agent管理器 → 创建5个Agent：
  - 🏰 世界观架构师（办公室）
  - 📐 大纲设计师（会议室，等待依赖）
  - 🎭 角色塑造师（办公室）
  - 🕸️ 剧情编织师（办公室）
  - ⚗️ 文字炼金师（会议室，等待依赖）
↓
可视化显示：
  - 依赖关系连线
  - 每个Agent进度
  - Token消耗实时
```

### 场景2：质量审查流程

```
子任务完成
↓
自我审查 → 绿色进度条
↓
主Agent审查 → 蓝色进度条
↓
审查Agent审查 → 紫色进度条
↓
通过 → Agent移动到厨房
```

## 状态码

| 状态码 | 含义 |
|--------|------|
| active | Agent正在执行任务 |
| waiting | 等待依赖任务完成 |
| review | 质量审查中 |
| completed | 任务完成 |
| released | Agent已释放 |

## 错误处理

| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| SYNC_001 | 同步失败 | 重试3次，间隔3秒 |
| SYNC_002 | 连接超时 | 切换备用服务器 |
| AGENT_001 | Agent不存在 | 忽略，跳过更新 |
| AGENT_002 | 房间分配冲突 | 使用备用房间 |

## 验收标准

### 功能完整性
- [x] Agent动态创建
- [x] 角色体系适配
- [x] 房间分配逻辑
- [x] 依赖关系可视化
- [x] Token追踪
- [x] 质量审查可视化
- [x] Skill固化动画

### 系统集成
- [x] 读取子Agent状态
- [x] 同步任务进度
- [x] 显示Token消耗
- [x] 响应Skill固化事件

### 性能指标
- [x] 实时刷新（<3秒）
- [x] 流畅动画（60fps）
- [x] 清晰的状态指示
- [x] 直观的操作界面

---

*版本：v1.1.0-dmags*  
*创建时间：2026-04-05*  
*最后更新：2026-04-24*
