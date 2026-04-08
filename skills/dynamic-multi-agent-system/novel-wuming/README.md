# 📖 《吾名午夜》创作管理系统

**版本：** v1.0  
**创建时间：** 2026-04-08  
**目标：** 每天输出≥1章，循序更新

---

## 🎯 系统设计原则

```
1. Agent是临时的，文件是永久的
2. 新team来了读文件 → 了解一切 → 创作 → 更新文件 → 销毁Agent
3. 每个Agent专注自己的职责，持续学习提升
```

---

## 📁 目录结构

```
novel-wuming/
├── README.md                    ← 本文件（说明）
├── anchor/                      ← 锚定文件（必须先读）
│   ├── NOVEL-REFERENCE.md       ← 世界观锚定
│   ├── WORLD-RULES.md           ← 具体规则
│   └── FORBIDDEN.md             ← 禁止事项
├── changelog/                   ← 章节日志
│   └── chapters/                ← 各章节记录
├── characters/                  ← 人物系统
│   ├── roster.md                ← 人物总表
│   ├── relationships.md         ← 人物关系
│   └── status/                  ← 各人物状态
├── plot/                        ← 剧情系统
│   ├── outline.md               ← 整体大纲
│   ├── foreshadowing.md         ← 伏笔追踪
│   └── timeline.md              ← 时间线
└── roles/                       ← 各角色学习资料
    ├── plot-architect/         ← 剧情架构师
    ├── world-builder/           ← 世界观构建
    ├── character-editor/        ← 人物编辑
    ├── content-writer/          ← 内容创作
    ├── consistency-checker/     ← 逻辑审查
    └── tone-editor/            ← 文风编辑
```

---

## 🔄 每日创作流程

```
┌─────────────────────────────────────────────────────────────┐
│  每日创作流程（每个Agent必须遵守）                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【创作前 - 读取文件】                                      │
│  1. 读 anchor/NOVEL-REFERENCE.md                           │
│  2. 读 changelog/chapters/（最近3章）                       │
│  3. 读 characters/status/（当前人物状态）                    │
│  4. 读 plot/foreshadowing.md（待回收伏笔）                  │
│                                                             │
│  【创作中 - 执行职责】                                      │
│  5. world-builder 审核世界观                               │
│  6. character-editor 审核称呼                              │
│  7. content-writer 创作初稿                               │
│  8. consistency-checker 逻辑审查                           │
│  9. tone-editor 文风调校                                   │
│                                                             │
│  【创作后 - 更新文件】                                      │
│  10. 更新 changelog/chapters/第X章.md                      │
│  11. 更新 characters/status/（人物状态变化）                 │
│  12. 更新 plot/foreshadowing.md（伏笔回收/新增）            │
│  13. 更新 plot/timeline.md（时间线）                        │
│                                                             │
│  【结束 - 销毁Agent】                                       │
│  14. 输出章节                                               │
│  15. Agent团队销毁                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 各角色职责与学习方向

| 角色 | 核心职责 | 当前薄弱点 | 学习重点 |
|------|---------|-----------|---------|
| plot-architect | 剧情架构 | 章节衔接 | 三幕结构、节奏把控 |
| world-builder | 世界观构建 | 设定一致性 | 设定库积累、逻辑自洽 |
| character-editor | 人物塑造 | 称呼/性格一致 | 性格样本、对话风格 |
| content-writer | 写作技巧 | AI味去除 | 真实语料、口语化 |
| consistency-checker | 逻辑审查 | 漏检 | 检查清单、漏洞库 |
| tone-editor | 文风编辑 | 改稿彻底性 | 改稿案例、去AI技巧 |

---

## 📝 章节输出格式

```markdown
# 第X章：章节标题

**创作日期：** YYYY-MM-DD
**字数：** XXXX字
**时间线：** 入学后第X天 / 事件发生后X小时

## 主要事件
- ...

## 人物状态变化
- 凌午夜：...
- 东方凌薇：...
- ...

## 伏笔状态
- [埋] XXX（待回收：第X章）
- [收] XXX（本章回收）

## 下章衔接
- 指向下一章的钩子
```

---

## 🔗 关联文件

- 锚定文档：`anchor/NOVEL-REFERENCE.md`
- 人物状态：`characters/status/`
- 章节日志：`changelog/chapters/`
- 伏笔追踪：`plot/foreshadowing.md`

---

**最后更新：** 2026-04-08  
**维护：** 元神
