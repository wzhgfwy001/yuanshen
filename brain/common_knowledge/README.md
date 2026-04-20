# Common Knowledge（通用知识）数据格式

## 目录说明
`brain/common_knowledge/` 存储跨任务、跨Agent可复用的通用知识和最佳实践。

## 数据格式

### 子目录结构
```
brain/common_knowledge/
├── programming/        # 编程最佳实践
├── tools/             # 工具使用指南
├── workflows/         # 通用工作流
├── best-practices/    # 行业最佳实践
└── troubleshooting/   # 故障排查
```

## 知识领域分类

### programming（编程最佳实践）
- 错误处理模式
- 代码组织原则
- 性能优化技巧

### tools（工具使用指南）
- Git 工作流
- Docker 使用
- CI/CD 最佳实践

### workflows（通用工作流）
- 任务管理流程
- 代码审查流程
- 发布流程

### best-practices（行业最佳实践）
- 设计模式
- 架构原则
- 团队协作

### troubleshooting（故障排查）
- 常见问题解决
- 日志分析
- 性能调优

## 查询API

### 按领域查询
```python
knowledge = query_knowledge(domain="programming")
```

### 搜索关键词
```python
knowledge = search_knowledge("error handling")
```

## 学习路径

### 新手入门
1. `programming/error-handling-patterns.md`
2. `tools/git-workflow.md`
3. `workflows/code-review.md`

### 进阶提升
1. `programming/design-patterns.md`
2. `best-practices/architecture.md`
3. `troubleshooting/performance.md`
