# User Preferences（用户偏好）数据格式

## 目录说明
`brain/user_preferences/` 存储用户的决策偏好、习惯设置和个性化配置。

## 数据格式

### 文件命名规则
```
{preference_name}.json
```

- `preference_name`: 偏好名称（使用kebab-case）

### JSON 数据结构

```json
{
  "id": "pref-uuid-v4",
  "name": "preference_name",
  "category": "category_type",
  "description": "描述这个偏好的用途",
  "value": {
    "key": "value"
  },
  "type": "string|number|boolean|object|array",
  "default": "默认值",
  "created_at": "2026-04-20T19:19:00+08:00",
  "updated_at": "2026-04-20T19:19:00+08:00",
  "usage_count": 10,
  "confidence": 0.9
}
```

## 偏好类型分类

### communication（沟通偏好）
- 消息风格偏好
- 通知偏好
- 沟通方式偏好

### decision-making（决策偏好）
- 技术选型倾向
- 风险容忍度
- 质量vs速度权衡

### workflow（工作流偏好）
- 习惯使用的工具
- 任务处理顺序
- 验证标准

### output-format（输出格式偏好）
- 文档格式
- 代码风格
- 报告格式

## 示例文件

### 文件：`communication-style.json`

```json
{
  "id": "pref-001",
  "name": "communication-style",
  "category": "communication",
  "description": "用户喜欢的消息风格",
  "value": {
    "formality": "casual",
    "language": "zh-CN",
    "emoji_usage": "moderate",
    "code_blocks": true,
    "examples": true
  },
  "type": "object",
  "default": {
    "formality": "professional",
    "language": "zh-CN",
    "emoji_usage": "minimal",
    "code_blocks": true,
    "examples": true
  },
  "created_at": "2026-04-20T19:19:00+08:00",
  "updated_at": "2026-04-20T19:19:00+08:00",
  "usage_count": 45,
  "confidence": 0.95
}
```

### 文件：`tech-stack-preference.json`

```json
{
  "id": "pref-002",
  "name": "tech-stack-preference",
  "category": "decision-making",
  "description": "用户偏好的技术栈选择",
  "value": {
    "backend_framework": "fastapi",
    "database": "postgresql",
    "orm": "sqlalchemy",
    "frontend_framework": "react",
    "state_management": "zustand",
    "testing_framework": "pytest",
    "ci_cd": "github-actions"
  },
  "type": "object",
  "default": {},
  "created_at": "2026-04-20T19:19:00+08:00",
  "updated_at": "2026-04-20T19:19:00+08:00",
  "usage_count": 12,
  "confidence": 0.85
}
```

### 文件：`code-style-preference.json`

```json
{
  "id": "pref-003",
  "name": "code-style-preference",
  "category": "output-format",
  "description": "代码风格偏好",
  "value": {
    "naming_convention": "snake_case",
    "max_line_length": 88,
    "docstring_style": "google",
    "type_hints": true,
    "import_order": "standard",
    "string_quotes": "double"
  },
  "type": "object",
  "default": {
    "naming_convention": "camelCase",
    "max_line_length": 100,
    "docstring_style": "numpy",
    "type_hints": false,
    "import_order": "alphabetical",
    "string_quotes": "single"
  },
  "created_at": "2026-04-20T19:19:00+08:00",
  "updated_at": "2026-04-20T19:19:00+08:00",
  "usage_count": 28,
  "confidence": 0.92
}
```

### 文件：`risk-tolerance.json`

```json
{
  "id": "pref-004",
  "name": "risk-tolerance",
  "category": "decision-making",
  "description": "用户对风险的容忍度",
  "value": {
    "tech_adoption": "moderate",
    "stability_requirement": "high",
    "breaking_changes": "avoid",
    "experimental_features": "cautious"
  },
  "type": "object",
  "default": {
    "tech_adoption": "conservative",
    "stability_requirement": "high",
    "breaking_changes": "avoid",
    "experimental_features": "avoid"
  },
  "created_at": "2026-04-20T19:19:00+08:00",
  "updated_at": "2026-04-20T19:19:00+08:00",
  "usage_count": 8,
  "confidence": 0.78
}
```

### 文件：`notification-preference.json`

```json
{
  "id": "pref-005",
  "name": "notification-preference",
  "category": "communication",
  "description": "通知偏好设置",
  "value": {
    "task_completion": true,
    "error_alert": true,
    "daily_summary": true,
    "progress_updates": false,
    "quiet_hours": {
      "start": "23:00",
      "end": "08:00"
    }
  },
  "type": "object",
  "default": {
    "task_completion": true,
    "error_alert": true,
    "daily_summary": false,
    "progress_updates": false,
    "quiet_hours": null
  },
  "created_at": "2026-04-20T19:19:00+08:00",
  "updated_at": "2026-04-20T19:19:00+08:00",
  "usage_count": 15,
  "confidence": 0.88
}
```

## 查询API

### 按类别查询
```python
preferences = query_preferences(category="communication")
```

### 获取单个偏好
```python
pref = get_preference("communication-style")
```

### 更新偏好
```python
update_preference("communication-style", new_value)
```

### 获取默认值
```python
default = get_preference("communication-style").default
```

## 学习机制

### 主动学习
- 观察用户的决策
- 记录用户的选择
- 识别偏好模式

### 示例
```python
def learn_from_decision(decision_context, user_choice):
    """从用户决策中学习偏好"""
    category = categorize_decision(decision_context)
    pref_name = map_to_preference(decision_context)

    # 更新偏好值
    pref = get_preference(pref_name)
    pref.value = user_choice
    pref.usage_count += 1

    # 更新置信度
    pref.confidence = calculate_confidence(pref.usage_count, consistency)
    pref.updated_at = now()

    save_preference(pref)
```

### 置信度计算
- 使用次数越多，置信度越高
- 用户选择一致性越高，置信度越高
- 最小置信度：0.5
- 最大置信度：1.0

## 应用场景

### 代码生成
```python
def generate_code(task):
    pref = get_preference("code-style-preference")
    code = generate_with_style(task, pref.value)
    return code
```

### 技术选型
```python
def choose_tech_stack(requirements):
    pref = get_preference("tech-stack-preference")
    # 基于偏好进行选择
    return select_based_on_pref(requirements, pref.value)
```

### 消息发送
```python
def send_message(content):
    pref = get_preference("communication-style")
    # 根据偏好调整消息风格
    formatted = format_message(content, pref.value)
    return formatted
```

## 隐私保护

### 敏感信息处理
- 不记录敏感决策
- 匿名化个人偏好
- 提供删除偏好选项

### 偏好导出
```python
def export_preferences():
    """导出所有偏好设置"""
    return all_preferences()
```

### 偏好导入
```python
def import_preferences(prefs):
    """导入偏好设置"""
    for pref in prefs:
        save_preference(pref)
```

## 更新机制

- 每次使用偏好，`usage_count` +1
- 置信度定期重新计算
- 每30天审查，删除低置信度偏好（confidence < 0.6 且 30天未使用）
