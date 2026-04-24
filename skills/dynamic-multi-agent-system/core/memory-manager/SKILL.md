# Memory Manager - 记忆管理器

**版本：** v1.0.0  
**类型：** 核心组件

## 功能

- **记忆写入 (write)** - 将信息存储为记忆
- **记忆读取 (read)** - 根据关键词读取相关记忆
- **记忆检索 (search)** - 按类型或关键词搜索记忆
- **记忆衰减** - 自动降低长期未访问记忆的置信度

## 使用方式

### 任务开始时
```
读取：user_preference, success_pattern, failure_lesson
```

### 任务进行中
```
记录：关键决策点、使用的策略
```

### 任务完成时
```
写入：success_pattern（成功后）, failure_lesson（失败后）
```

## 记忆类型

| 类型 | 说明 | 调用时机 |
|------|------|----------|
| user_preference | 用户偏好 | 任务开始时 |
| success_pattern | 成功模式 | 任务完成后 |
| failure_lesson | 失败教训 | 任务失败后 |
| context | 上下文 | 任务开始时 |

## 核心原则

1. 高置信度（>0.8）优先使用
2. 30天以上记忆置信度衰减
3. 保留来源便于核实

## 文件结构

```
memory-manager/
├── FRAMEWORK.md          # 框架定义
├── SKILL.md              # 本文件
├── memory.js             # 核心实现
└── initial-memories.json # 初始记忆数据
```
