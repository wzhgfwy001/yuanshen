# GitHub仓库创建 - wzhgfwy001/yuanshen

**日期：** 2026-04-17 00:20

## 决策

| 项目 | 决定 |
|------|------|
| 仓库名 | yuanshen（元神） |
| License | MIT |
| 上传内容 | 完整代码（不只是文档） |

## 仓库结构

```
yuanshen/
├── README.md
├── SKILL.md
├── LICENSE (MIT)
├── .gitignore
├── docs/
│   ├── QUICKSTART.md
│   ├── architecture-article.md
│   └── images/logo.png
├── core/                    # 阳神核心模块
│   ├── task-classifier/
│   ├── task-decomposer/
│   ├── subagent-manager/
│   ├── quality-checker/
│   ├── resource-cleaner/
│   └── ... (29个模块)
├── agency-registry/         # Agent定义
│   └── registry.json (226个Agent)
├── skills-evolution/        # Skills进化
├── brain/                   # 阴神记忆
├── state/                   # 状态文件
└── examples/                # 使用示例
```

## 统计

| 指标 | 数值 |
|------|------|
| 文件数 | 138个 |
| 代码行数 | 24805行 |
| 提交次数 | 2次 |

## 链接

- 仓库：https://github.com/wzhgfwy001/yuanshen
- 掘金文章：https://juejin.cn/post/7629027522160427018
