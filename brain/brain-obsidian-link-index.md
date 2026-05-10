# brain ↔ Obsidian 双向链接核心索引

> OpenClaw brain/ 与 Obsidian Wiki 之间的双向链接枢纽
> *最后更新: 2026-05-11*

---

## 🎯 链接目标

1. **OpenClaw 管理 Obsidian** — 通过 Wiki 结构索引知识库
2. **Obsidian 增强 OpenClaw** — 通过 brain/ 访问系统记忆
3. **双向同步** — 变更一方，另一方自动感知

---

## 📊 系统映射总览

| OpenClaw brain/ | Obsidian Wiki | 文件数 |
|-----------------|---------------|--------|
| `brain/decisions/` | `wiki/sources/decisions/` | 12 |
| `brain/lessons/` | `wiki/sources/lessons/` | 31 |
| `brain/patterns/` | `wiki/synthesis/patterns/` | 6 |
| `brain/knowledge_graph/nodes.json` | `wiki/concepts/` + `wiki/entities/` | 17+9 |
| `brain/knowledge_reserve/` | `wiki/sources/` (长期知识) | 2 |
| `brain/me/` | `wiki/entities/元神系统.md` | 3 |

---

## 🔗 核心链接（OpenClaw → Obsidian）

### 决策与教训
- `brain/decisions/` ↔ `[[Archive/decisions/]]`
- `brain/lessons/` ↔ `[[Archive/lessons/]]`

### 知识节点
- `brain/knowledge_graph/nodes.json` → [[wiki/concepts/]] (模式、概念)
- `brain/knowledge_graph/nodes.json` → [[wiki/entities/]] (实体)

### 个人身份
- `brain/me/identity.md` → [[wiki/entities/元神系统.md]]
- `brain/me/learned.md` → [[wiki/concepts/]]

---

## 🔄 Obsidian → OpenClaw 引用格式

```markdown
# 在 Obsidian 中引用 OpenClaw 记忆
→ [[brain:decisions/2026-04-26-agent-dispatch-rule]]
→ [[brain:lessons/2026-04-26-music-model-selection-failure]]
→ [[brain:knowledge_graph/代码编写规范]]
```

> 注：`brain:` 前缀表示引用 OpenClaw brain/ 目录

---

## 📋 知识图谱节点映射（17个 → 9个）

| brain/ nodes.json | → | Obsidian Wiki |
|-------------------|---|---------------|
| 数据分析模式 | → | [[AI编程原则精华]] |
| 代码实现最佳实践模式 | → | [[AI编程原则精华]] |
| 内容创作模式 | → | [[写作创作]] |
| 复杂任务分解模式 | → | [[AI编程原则精华]] |
| 数据源不可靠教训 | → | [[Archive/lessons/2026-04-20T19_27_57-艾斯-data_source]] |
| 数据验证缺失教训 | → | [[Archive/lessons/2026-04-20T19_27_57-白哉-data_validation]] |
| API调用超时教训 | → | [[Archive/lessons/2026-04-20T19_27_57-白哉-api_timeout]] |
| 需求不明确教训 | → | [[Archive/lessons/2026-04-20T19_27_57-鹿丸-task_clarity]] |
| 代码编写规范 | → | [[AI编程原则精华]] |
| 错误处理规范 | → | [[AI编程原则精华]] |
| 代码审查清单 | → | [[AI编程原则精华]] |
| 写作风格规范 | → | [[写作创作]] |
| 任务路由决策 | → | [[OpenClaw架构深度解析]] |
| 用户沟通偏好 | → | [[USER.md]] (C:\Users\DELL\.openclaw\workspace\) |
| 输出格式偏好 | → | [[USER.md]] |
| 技术实现偏好 | → | [[USER.md]] |

---

## 🔮 集成规划

### Phase 1: 链接建立（已完成 ✅）
- [x] brain-migration-index.md 建立
- [x] 双向映射文档创建

### Phase 2: 自动化同步（进行中 🔄）
- [ ] HEARTBEAT 中加入 Obsidian 检查
- [ ] brain/ 变更时自动更新 Obsidian
- [ ] Obsidian 变更时自动同步 brain/

### Phase 3: 查询集成（待完成 📋）
- [ ] Query 时自动搜索 Obsidian Wiki
- [ ] Ingest 时自动写入 brain/
- [ ] Lint 检查时覆盖双方

### Phase 4: 双向工作流（待完成 📋）
- [ ] OpenClaw 执行任务 → 同步结果到 Obsidian
- [ ] Obsidian 笔记 → 提取为 brain/ 知识节点
- [ ] 统一的知识检索入口

---

## 🧠 核心整合文件

| 文件 | 作用 |
|------|------|
| [[brain-migration-index]] | 双向映射主索引 |
| [[wiki/synthesis/brain-migration-index]] | Obsidian 侧镜像 |
| [[brain/knowledge_graph/nodes.json]] | OpenClaw 知识图谱源 |
| [[wiki/concepts/]] | Obsidian 概念库 |
| [[wiki/entities/]] | Obsidian 实体库 |

---

## 📝 维护规则

1. **新增 brain/ 节点** → 同步到 Obsidian concepts/ 或 entities/
2. **新增 Obsidian 笔记** → 评估是否需要写入 brain/
3. **冲突处理** → 以 brain/ 为准（系统源），Obsidian 为备份
4. **定期同步** → HEARTBEAT 每30分钟检查一次

---

_最后更新: 2026-05-11_
_维护周期: 每30分钟（HEARTBEAT）_