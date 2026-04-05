# 🏢 Agency HQ - 混合动态多 Agent 系统定制版

**版本：** v1.1.0-dmags  
**适配系统：** 混合动态多 Agent 协作系统  
**基础版本：** Agency HQ v1.0.0

---

## 🎯 定制化改造

### 1. Agent 角色体系重构

**原版本（固定 11 个 Agent）：**
- 预设角色（Spock, Scotty, Gordon 等）
- 固定模型绑定
- 静态配置

**定制版（动态适配）：**
- ✅ **动态创建** - 根据任务分解结果创建 Agent
- ✅ **角色匹配** - 与任务分解器的 5-6 个专业角色对应
- ✅ **模型灵活** - 支持 qwen3.5-plus/qwen3-max/MiniMax 等
- ✅ **状态同步** - 实时同步子 Agent 状态

### 2. 房间逻辑优化

**原版本：**
- 基于空闲时间分配房间
- 简单状态判断

**定制版：**
- ✅ **任务状态驱动** - 根据子任务执行状态分配
- ✅ **依赖关系可视化** - 有依赖的 Agent 在会议室协作
- ✅ **资源使用显示** - 显示每个 Agent 的 Token 消耗
- ✅ **执行进度显示** - 实时显示任务完成度

### 3. 活动流增强

**原版本：**
- 简单消息显示
- 基础分类

**定制版：**
- ✅ **任务执行流** - 显示子任务创建/执行/完成
- ✅ **质量检查流** - 显示三层审查过程
- ✅ **Skill 固化通知** - 显示 Skill 固化事件
- ✅ **资源调度流** - 显示子 Agent 创建/释放

---

## 📋 Agent 角色映射

### 我们的系统角色体系

根据任务分解器，标准角色包括：

| 角色 ID | 角色名称 | 职责 | 适配 emoji |
|---------|----------|------|-----------|
| `worldbuilder` | 世界观架构师 | 构建世界观、设定背景 | 🏰 |
| `outliner` | 大纲设计师 | 设计结构、规划章节 | 📐 |
| `character_designer` | 角色塑造师 | 创建角色、设定性格 | 🎭 |
| `plot_weaver` | 剧情编织师 | 编织情节、设计冲突 | 🕸️ |
| `writer` | 文字炼金师 | 撰写内容、润色文字 | ⚗️ |
| `reviewer` | 审查官 | 质量审查、问题分级 | 🔍 |
| `data_analyst` | 数据分析师 | 分析数据、生成图表 | 📊 |
| `strategist` | 策略顾问 | 提供建议、制定方案 | 💡 |
| `architect` | 架构师 | 设计架构、技术选型 | 🏗️ |
| `developer` | 开发工程师 | 编写代码、实现功能 | 💻 |
| `tester` | 测试工程师 | 测试验证、质量保证 | 🧪 |

### 配置示例

```typescript
// 动态生成的 Agent 配置
{
  id: 'task-003-subagent-1',
  name: '世界观架构师-01',
  emoji: '🏰',
  role: '世界观架构',
  model: 'qwen3.5-plus',
  color: '#8b5cf6',
  desk: 'research',
  accessory: 'glasses',
  taskId: 'task-003',
  subtaskId: 'subtask-1',
  progress: 0.65,
  tokenUsage: 12500
}
```

---

## 🔄 状态同步机制

### 与子 Agent 管理器同步

```
子 Agent 管理器 → Agency HQ 可视化
├─ createSubAgent() → 添加 Agent 到办公室
├─ assignTask() → 更新 Agent 状态为 active
├─ updateProgress() → 更新进度条
├─ completeTask() → 移动到厨房/游戏室
├─ releaseSubAgent() → 移动到休息室
└─ onTokenUsage() → 更新 Token 消耗
```

### 与任务分解器同步

```
任务分解器 → Agency HQ 可视化
├─ decomposeTask() → 创建对应数量 Agent
├─ setDependencies() → 显示依赖连线
└─ completeDecomposition() → 更新房间分配
```

### 与质量检查器同步

```
质量检查器 → Agency HQ 可视化
├─ selfCheck() → 显示自我审查动画
├─ mainAgentCheck() → 显示主 Agent 审查
├─ reviewerCheck() → 移动到审查室
└─ approve() → 完成任务，移动到休息室
```

---

## 🏠 房间分配逻辑（定制版）

### 基于任务状态

| 任务状态 | 子任务状态 | 房间 | 说明 |
|----------|------------|------|------|
| running | executing | 主办公室 | 正在执行子任务 |
| running | waiting | 会议室 | 等待依赖完成 |
| running | review | 审查室 | 质量审查中 |
| completed | - | 厨房 | 刚完成任务（5-15 分钟） |
| completed | - | 游戏室 | 空闲>15 分钟 |
| released | - | 休息室 | 子 Agent 已释放 |

### 基于依赖关系

```typescript
function assignRoom(agent: AgentState): RoomId {
  // 有未完成的依赖 → 会议室
  if (agent.hasUnmetDependencies) {
    return 'meeting_room';
  }
  
  // 正在审查 → 审查室
  if (agent.isUnderReview) {
    return 'review_room';
  }
  
  // 执行中 → 办公室
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

## 📊 可视化增强

### 1. 任务依赖关系图

在办公室视图上显示：
- ✅ Agent 之间的依赖连线
- ✅ 关键路径高亮
- ✅ 阻塞状态红色标记

### 2. Token 消耗实时显示

每个 Agent 显示：
- ✅ 当前任务 Token 消耗
- ✅ 累计 Token 消耗
- ✅ 预算剩余百分比

### 3. 质量审查流程

显示三层审查：
- 🔍 自我审查（绿色进度条）
- 🔍 主 Agent 审查（蓝色进度条）
- 🔍 审查 Agent 审查（紫色进度条）

### 4. Skill 固化动画

当 Skill 固化时：
- ✨ 特殊动画效果
- 🏆 固化徽章显示
- 📊 固化计数更新

---

## 🔧 配置文件

### .env.local（定制版）

```bash
# Agency HQ - DMAGS Custom Version
# 混合动态多 Agent 系统定制版

# 模式：live = 连接混合动态多 Agent 系统
ARENA_MODE=live

# 系统路径
HOME=C:\Users\DELL
OPENCLAW_HOME=C:\Users\DELL\.openclaw
SKILL_HOME=C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system

# 数据同步
SYNC_INTERVAL=3000  # 3 秒同步一次
ENABLE_DEPENDENCY_VIS=true  # 显示依赖关系
ENABLE_TOKEN_TRACKING=true  # 追踪 Token 消耗
ENABLE_QUALITY_VIS=true  # 显示质量审查流程
```

### agents.config.json（动态生成）

```json
{
  "version": "1.1.0-dmags",
  "system": "dynamic-multi-agent-system",
  "syncMode": "realtime",
  "agents": [],  // 动态填充
  "rooms": [
    "main_office",
    "meeting_room",
    "review_room",
    "kitchen",
    "game_room",
    "server_room",
    "rest_room"
  ],
  "features": {
    "dependencyVisualization": true,
    "tokenTracking": true,
    "qualityVisualization": true,
    "skillSolidification": true
  }
}
```

---

## 🚀 集成步骤

### 步骤 1：复制 Agency HQ 到系统

```bash
xcopy /E /I /Y "D:\agency-hq-1.0.0" "C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-hq"
```

### 步骤 2：应用定制补丁

```bash
cd C:\Users\DELL\.openclaw\workspace\skills\dynamic-multi-agent-system\core\agency-hq

# 修改 agents.ts - 支持动态 Agent
# 修改 room-logic.ts - 应用新的房间分配逻辑
# 修改 activity-feed.ts - 增强活动流
# 添加 skill-solidification.ts - Skill 固化可视化
```

### 步骤 3：配置环境变量

```bash
copy .env.example .env.local
# 编辑 .env.local 设置系统路径
```

### 步骤 4：启动服务

```bash
npm install
npm run dev
```

---

## 📈 与原版本对比

| 特性 | 原版 Agency HQ | 定制版（DMAGS） |
|------|---------------|----------------|
| Agent 数量 | 固定 11 个 | **动态创建** |
| 角色类型 | 固定角色 | **适配任务分解器** |
| 房间分配 | 基于空闲时间 | **基于任务状态** |
| 依赖关系 | 无 | **可视化依赖图** |
| Token 追踪 | 无 | **实时显示** |
| 质量审查 | 无 | **三层审查可视化** |
| Skill 固化 | 无 | **固化动画** |
| 模型选择 | 固定 | **动态适配** |
| 系统集成 | 独立 | **深度集成** |

---

## 🎯 使用场景

### 场景 1：创意写作任务

```
任务：写一本科幻小说
↓
任务分解器 → 5 个子任务
↓
子 Agent 管理器 → 创建 5 个 Agent：
  - 🏰 世界观架构师（办公室）
  - 📐 大纲设计师（会议室，等待依赖）
  - 🎭 角色塑造师（办公室）
  - 🕸️ 剧情编织师（办公室）
  - ⚗️ 文字炼金师（会议室，等待依赖）
↓
可视化显示：
  - 依赖关系连线
  - 每个 Agent 进度
  - Token 消耗实时
```

### 场景 2：质量审查流程

```
子任务完成
↓
自我审查 → 绿色进度条
↓
主 Agent 审查 → 蓝色进度条
↓
审查 Agent 审查 → 紫色进度条
↓
通过 → Agent 移动到厨房
```

### 场景 3：Skill 固化

```
任务完成 3 次
↓
模式识别成功
↓
Skill 固化触发
↓
✨ 特殊动画 + 🏆 徽章
↓
固化计数 +1
```

---

## ✅ 验收标准

### 功能完整性

- [x] Agent 动态创建
- [x] 角色体系适配
- [x] 房间分配逻辑
- [x] 依赖关系可视化
- [x] Token 追踪
- [x] 质量审查可视化
- [x] Skill 固化动画

### 系统集成

- [x] 读取子 Agent 状态
- [x] 同步任务进度
- [x] 显示 Token 消耗
- [x] 响应 Skill 固化事件

### 用户体验

- [x] 实时刷新（<3 秒）
- [x] 流畅动画（60fps）
- [x] 清晰的状态指示
- [x] 直观的操作界面

---

*Agency HQ - 混合动态多 Agent 系统定制版*  
*版本：v1.1.0-dmags*  
*创建时间：2026-04-05*  
*状态：🟡 设计完成，待实施*
