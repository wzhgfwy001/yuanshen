# 清理策略 - brain/ 文件维护规则

**创建时间：** 2026-04-16T00:28:00+08:00
**最后更新：** 2026-04-16T00:28:00+08:00

---

## 清理规则

### 每周清理

| 类型 | 规则 | 保留 |
|------|------|------|
| `memory/YYYY-MM-DD.md` | 保留最近30天 | 归档 > 30天到 `memory/archive/` |
| `completed_steps` | 归档 > 7天的旧步骤 | 保留最近7天 |

### 每季度清理

| 类型 | 规则 |
|------|------|
| `brain/plan.md` | 版本化存档到 `brain/archive/` |
| `known_issues` | 清理已解决的条目 |
| `reasoning_chain` | 归档 > 90天的推理节点 |

---

## 永不删除清单

- ✅ 所有 `DECISION` 类型记录
- ✅ 所有 `goal` 变更记录
- ✅ 所有 `ISSUE` 发现记录
- ✅ 所有 blocker 记录
- ✅ 所有 reasoning_chain 节点

---

## 归档格式

```
brain/archive/
├── memory/
│   └── 2026-01.md    # 月度合并日志
├── plan/
│   └── plan-2026-Q1.md
└── reasoning/
    └── reasoning-2026-Q1.md
```

---

## 执行时间

- **每周清理：** 每周一 09:00
- **每季度清理：** 1/4/7/10 月 1日 09:00
