# feature-flags

**【通灵面板】Summon Inner Demons** — 

特性开关系统 - 新功能实验性控制

## 灵感来源

Claude Code使用 `feature('NAME')` 控制未发布功能：
```javascript
if (feature('KAIROS')) {
  // 启用KAIROS助手
}
```

## 我们的实现

### 开关配置存储位置

```
brain/feature-flags.json
```

### 默认开关状态

```json
{
  "frustration_detector": {
    "enabled": true,
    "type": "stable",
    "description": "用户情绪感知与不满检测"
  },
  "context_compactor": {
    "enabled": true,
    "type": "stable", 
    "description": "上下文分级压缩"
  },
  "auto_dream": {
    "enabled": true,
    "type": "stable",
    "description": "自动记忆整理（凌晨3点）"
  },
  "proactive_suggest": {
    "enabled": false,
    "type": "experimental",
    "description": "主动建议功能"
  },
  "voice_mode": {
    "enabled": false,
    "type": "experimental",
    "description": "语音交互模式"
  },
  "multi_agent_native": {
    "enabled": true,
    "type": "stable",
    "description": "原生多Agent协作"
  }
}
```

### 开关类型

| 类型 | 说明 | 稳定性 |
|------|------|--------|
| `stable` | 正式功能 | 高 |
| `beta` | 测试功能 | 中 |
| `experimental` | 实验性 | 低 |
| `deprecated` | 废弃中 | - |

### 用户控制命令

```
/features          - 查看所有特性
/features enable <name>   - 启用某特性
/features disable <name>  - 禁用某特性
/features status <name>   - 查看特性状态
```

### 检查机制

```javascript
// 在需要特性检查的地方
const FEATURE_FLAGS = JSON.parse(readFileSync('brain/feature-flags.json'));

function isEnabled(featureName) {
  return FEATURE_FLAGS[featureName]?.enabled === true;
}

// 使用
if (isEnabled('frustration_detector')) {
  // 启用情绪检测
}
```

### 特性分组

```json
{
  "ai_core": {
    "frustration_detector": true,
    "context_compactor": true,
    "auto_dream": true
  },
  "collaboration": {
    "multi_agent_native": true
  },
  "experimental": {
    "proactive_suggest": false,
    "voice_mode": false
  }
}
```

### 特性变更日志

```json
{
  "history": [
    {
      "date": "2026-04-12",
      "feature": "frustration_detector",
      "action": "enabled",
      "reason": "初始版本发布"
    }
  ]
}
```

## 使用场景

1. **新功能灰度发布**
   - 先对单个用户启用
   - 观察效果后全面推广

2. **A/B测试**
   - 不同用户使用不同特性
   - 对比效果

3. **快速回滚**
   - 特性出问题，一键关闭
   - 不影响其他功能

## 与其他系统联动

- **Cron Jobs** → 定时检查特性状态
- **Standing Orders** → 持久化用户偏好
- **Memory** → 记录特性使用反馈

## 实际代码

**文件：** `feature-flags.js`

### 核心函数

```javascript
const ff = require('./feature-flags.js');

// 检查特性
ff.isEnabled('frustration_detector');

// 获取所有特性
ff.getAllFeatures({type: 'stable'});

// 启用/禁用
ff.enable('new_feature');
ff.disable('feature_name');

// 切换
ff.toggle('feature_name');

// 统计
ff.getStats();
```

### 触发方式

```javascript
// 在功能代码中检查
if (ff.isEnabled('frustration_detector')) {
  // 执行情绪检测
}
```

---

_最后更新：2026-04-12_
