# 目录结构

```
dynamic-multi-agent-system/
│
├── README.md                          # 项目说明（上架平台展示页）
├── SKILL.md                           # 核心Skill定义
├── manifest.json                      # Skill元数据
├── STRUCTURE.md                       # 本文件
│
├── core/                              # 核心组件
│   ├── task-classifier/
│   │   └── SKILL.md                   # 任务分类器
│   ├── task-decomposer/
│   │   └── SKILL.md                   # 任务分解器
│   ├── subagent-manager/
│   │   └── SKILL.md                   # 子Agent管理器
│   ├── quality-checker/
│   │   ├── SKILL.md                   # 质量检查器
│   │   └── checklists/
│   │       ├── writing-checklist.md   # 写作检查清单
│   │       └── code-checklist.md      # 代码检查清单
│   ├── skill-evolution/
│   │   └── SKILL.md                   # Skill进化分析器
│   └── resource-cleaner/
│       └── SKILL.md                   # 资源清理器
│
├── docs/                              # 详细文档
│   ├── architecture.md                # 架构说明
│   ├── deployment.md                  # 部署指南（待创建）
│   ├── api-reference.md               # API参考（待创建）
│   └── troubleshooting.md             # 故障排除（待创建）
│
├── examples/                          # 使用示例
│   ├── example-sci-fi.md              # 科幻小说示例
│   ├── example-mystery.md             # 悬疑小说示例（待创建）
│   ├── example-analysis.md            # 数据分析示例（待创建）
│   └── outputs/                       # 示例输出（待创建）
│
├── state/                             # 状态管理（运行时生成）
│   ├── skill-counters.json            # Skill计数器
│   ├── experience-db.json             # 经验数据库
│   └── execution-logs/                # 执行日志（待创建）
│
└── templates/                         # 预置模板（待创建）
    ├── sci-fi-creation/
    ├── mystery-creation/
    ├── data-analysis/
    └── code-development/
```

## 文件说明

### 核心文件

| 文件 | 说明 | 状态 |
|------|------|------|
| README.md | 项目说明，上架平台展示页 | ✅ 已完成 |
| SKILL.md | 核心Skill定义，使用指南 | ✅ 已完成 |
| manifest.json | Skill元数据，版本、依赖等 | ✅ 已完成 |

### 核心组件

| 组件 | 说明 | 状态 |
|------|------|------|
| task-classifier | 任务分类器，判断任务类型 | ✅ 已完成 |
| task-decomposer | 任务分解器，分解为子任务 | ✅ 已完成 |
| subagent-manager | 子Agent管理器，创建和管理 | ✅ 已完成 |
| quality-checker | 质量检查器，三层检查 | ✅ 已完成 |
| skill-evolution | Skill进化分析器，固化流程 | ✅ 已完成 |
| resource-cleaner | 资源清理器，清理临时资源 | ✅ 已完成 |

### 配套资源

| 资源 | 说明 | 状态 |
|------|------|------|
| checklists/ | 质量检查清单 | ✅ 已完成（写作、代码） |
| docs/ | 详细文档 | 🟡 部分完成 |
| examples/ | 使用示例 | 🟡 部分完成 |
| state/ | 状态管理 | ✅ 初始文件已创建 |
| templates/ | 预置模板 | ❌ 待创建 |

## 待创建文件

### 高优先级（P0）

- [ ] docs/deployment.md - 部署指南
- [ ] docs/api-reference.md - API参考
- [ ] docs/troubleshooting.md - 故障排除

### 中优先级（P1）

- [ ] examples/example-mystery.md - 悬疑小说示例
- [ ] examples/example-analysis.md - 数据分析示例
- [ ] templates/ - 预置模板

### 低优先级（P2）

- [ ] examples/outputs/ - 示例输出
- [ ] state/execution-logs/ - 执行日志目录

## 部署后生成

以下文件在部署后运行时生成：

- state/skill-counters.json - 动态更新
- state/experience-db.json - 动态更新
- state/execution-logs/*.json - 每次任务生成
