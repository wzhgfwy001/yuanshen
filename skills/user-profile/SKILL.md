# User Profile System - 用户画像系统

**版本：** v1.0.0
**创建时间：** 2026-04-16T01:05:00+08:00
**状态：** 阶段1实施中

---

## 核心原理

用户画像系统通过**分析用户行为和偏好，自动积累用户特征**，让元神更懂用户。

```
Skills进化数据 → 用户画像（自动填充）
用户反馈 → 画像更新
```

---

## 数据来源

### 1. Skills进化副产品（自动）
- 任务类型偏好（用户经常让元神做什么）
- 成功率模式（用户在哪些领域成功率高）
- 反馈模式（用户喜欢什么样的输出）

### 2. 直接反馈（手动）
- 用户明确表达的偏好
- 用户纠正的行为
- 用户设定的规则

---

## 数据结构

```json
{
  "user_profile": {
    "updated_at": "2026-04-16T01:05:00+08:00",
    "preferences": {
      "communication_style": "简洁/详细/技术化",
      "output_format": "Markdown/表格/纯文本",
      "proactive_level": "高/中/低",
      "tone": "正式/轻松/友好"
    },
    "patterns": {
      "active_task_types": ["code", "research"],
      "preferred_models": ["MiniMax-M2.7"],
      "work_hours": "09:00-23:00",
      "session_length": "长会话（>30min）"
    },
    "feedback_history": [
      {
        "date": "2026-04-16",
        "type": "correction",
        "topic": "输出格式",
        "detail": "偏好表格而非列表"
      }
    ]
  }
}
```

---

## 自动积累机制

### 从Skills进化数据推断

| Skills数据 | 推断用户画像 |
|------------|-------------|
| `task_tracking[code].total` 高 | 用户偏好多做代码任务 |
| `task_tracking[research].success_rate` 高 | 用户擅长研究分析 |
| 用户经常纠正格式化 | `preferences.communication_style = "简洁"` |

### 从session历史推断

| Session模式 | 推断用户画像 |
|-------------|-------------|
| 长时间session | `patterns.session_length = "长"` |
| 频繁新话题 | `patterns.active_task_types` 多样 |
| 经常要求改稿 | `preferences.tone = "严格"` |

---

## 与 Skills进化的关系

```
Skills进化记录用户行为
        ↓
用户画像提取行为特征
        ↓
画像反哺Skills进化（优先级调整）
```

**画像是Skills进化的副产品，无需单独投入。**

---

## 存储位置

- 主状态：`brain/progress.json` → `user_profile`
- 历史反馈：`brain/user-profile/feedback-history.json`

---

## 使用方式

### 查询用户偏好
```javascript
getUserPreference("communication_style");
// 返回: "简洁"
```

### 更新用户画像
```javascript
updateUserProfile({
  type: "direct_feedback",
  field: "preferences.output_format",
  value: "表格"
});
```

---

## 自动提取功能

### 概述

用户画像支持**从对话历史中自动提取**用户特征，无需手动配置。

### 实现文件

| 文件 | 说明 |
|------|------|
| `auto-extractor.js` | 核心提取器 |
| `extraction-rules.md` | 提取规则文档 |
| `auto-extract.schema.json` | 数据结构 Schema |

### 提取内容

| 字段 | 说明 | 置信度阈值 |
|------|------|-----------|
| `communication_style` | 沟通风格（详细/简洁/分步/直接） | 0.6 |
| `preferred_language` | 语言偏好（中文/英文） | 0.6 |
| `active_hours` | 活跃时段 | 0.6 |
| `tech_familiarity` | 技术熟悉度 | 0.6 |
| `work_type` | 工作类型 | 0.6 |
| `decision_style` | 决策风格 | 0.6 |
| `feedback_style` | 反馈风格 | 0.6 |
| `long_term_goals` | 长期目标 | 0.6 |

### 使用方式

```javascript
const { extract, saveResult, loadProfile, mergeProfiles } = require('./skills/user-profile/auto-extractor');

// 提取用户画像
const messages = [
  { id: '1', content: '详细说明一下这个方案', timestamp: '2026-04-17T10:00:00+08:00' },
  { id: '2', content: '财富自由是我的目标', timestamp: '2026-04-17T11:00:00+08:00' }
];

const result = extract(messages, userId);

// 保存到状态文件
saveResult(result);

// 增量更新
const oldProfile = loadProfile();
const merged = mergeProfiles(oldProfile, result);
```

### 状态存储

- **路径：** `state/user-profile.json`
- **格式：** 参见 `auto-extract.schema.json`

### 置信度机制

- 每项特征有独立置信度（0.0-1.0）
- 低于阈值（默认0.6）的特征不纳入最终结果
- 高置信度（≥0.8）可直接采纳
- 低置信度（<0.6）仅记录供参考

---

## 待完善

- [x] 自动提取逻辑实现 ✓
- [ ] 与brain/inbox.md联动
- [ ] 用户确认机制
- [ ] 历史反馈分析
