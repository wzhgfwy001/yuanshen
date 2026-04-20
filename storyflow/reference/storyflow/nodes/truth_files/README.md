# INKOS 真相文件系统 - 示例数据

本目录包含所有 7 个真相文件的示例数据格式。

## 文件列表

1. **current_state.md** - 世界状态
2. **particle_ledger.md** - 资源账本
3. **pending_hooks.md** - 未闭合伏笔
4. **chapter_summaries.md** - 各章摘要
5. **subplot_board.md** - 支线进度板
6. **emotional_arcs.md** - 情感弧线
7. **character_matrix.md** - 角色交互矩阵

## 使用方法

### 1. 基本使用

```python
from nodes.truth_files import CurrentStateNode

# 创建节点
node = CurrentStateNode("my_story_state")

# 设置输入
node.set_input("character_name", "艾利克斯")
node.set_input("character_location", "魔法塔")
node.set_input("character_status", "alive")
node.set_input("current_chapter", 1)
node.set_input("chapter_ref", "第1章")

# 执行节点
result = node.execute()

# 检查结果
if result.success:
    print(f"✅ 文件已保存到: {result.file_path}")
    print(f"📝 YAML 输出:\n{result.yaml_output}")
else:
    print(f"❌ 错误: {result.error}")
    for error in result.validation_errors:
        print(f"   - {error}")
```

### 2. 增量更新（追加模式）

```python
from nodes.truth_files import ParticleLedgerNode

# 第一次添加
node1 = ParticleLedgerNode("items_1")
node1.set_input("item_name", "魔法剑")
node1.set_input("item_owner", "艾利克斯")
result1 = node1.execute()

# 第二次追加
node2 = ParticleLedgerNode("items_2")
node2.set_input("update_mode", "append")
node2.set_input("item_name", "治愈药水")
node2.set_input("item_owner", "艾利克斯")
result2 = node2.execute()

# result2.is_incremental == True
```

### 3. 合并模式

```python
from nodes.truth_files import CurrentStateNode

# 第一次添加
node1 = CurrentStateNode("state_1")
node1.set_input("character_name", "艾利克斯")
node1.set_input("current_chapter", 1)
result1 = node1.execute()

# 合并更新（更新字段 + 保留原有数据）
node2 = CurrentStateNode("state_2")
node2.set_input("update_mode", "merge")
node2.set_input("current_chapter", 2)
node2.set_input("time_of_day", "黄昏")
result2 = node2.execute()

# 原有数据保留，新字段被添加，现有字段被更新
```

## 数据结构示例

### current_state.md

```yaml
current_chapter: 1
current_scene: "魔法塔大厅"
time_of_day: "黄昏"

characters:
  - name: "艾利克斯"
    location: "魔法塔"
    status: "alive"
    last_seen_chapter: 1
    last_seen_scene: "魔法塔大厅"

relationships:
  - from: "艾利克斯"
    to: "玛丽亚"
    type: "friend"
    status: "positive"
    intensity: 7
    notes: "在酒馆相遇后成为朋友"
    last_updated_chapter: 1

known_info:
  - info: "护身符是开启古老封印的钥匙"
    knower: "艾利克斯"
    source: "神秘老人"
    chapter_revealed: 1
    is_secret: true

world_state:
  - location: "魔法塔"
    condition: "normal"
    notes: "古老的魔法塔，蕴含着未知的秘密"
    last_updated_chapter: 1

metadata:
  updated_at: "2026-04-19T19:00:00"
  node_id: "current_state"
  chapter_ref: "第1章"
```

### particle_ledger.md

```yaml
items:
  - name: "魔法剑"
    owner: "艾利克斯"
    type: "weapon"
    quantity: 1
    location: "背包"
    status: "active"
    description: "一把散发着微弱蓝光的魔法剑"
    acquired_chapter: 1
    last_updated_chapter: 1

currency:
  - name: "金币"
    owner: "艾利克斯"
    amount: 100
    last_updated_chapter: 1

supplies:
  - name: "治愈药水"
    quantity: 5
    max_quantity: 10
    unit: "瓶"
    decay_rate: 0.0
    last_replenished_chapter: 1
    last_updated_chapter: 1

decay_tracking:
  - item: "神秘护身符"
    decay_rate: 5.0
    start_chapter: 1
    duration_chapters: 10
    current_quality: 100.0
    last_updated_chapter: 1

metadata:
  updated_at: "2026-04-19T19:00:00"
  node_id: "particle_ledger"
  chapter_ref: "第1章"
```

### pending_hooks.md

```yaml
hooks:
  - id: "mysterious_amulet"
    description: "艾利克斯发现了一个神秘的护身符"
    type: "mystery"
    priority: "high"
    status: "open"
    introduced_chapter: 1
    introduced_scene: "第1章"
    estimated_resolution: "第5章"
    actual_resolution: ""
    resolution_chapter: 0
    notes: "需要揭示护身符的真正用途"
    related_hooks: []

promises:
  - id: "protect_kingdom"
    description: "艾利克斯承诺保护王国免受黑暗威胁"
    to_who: "reader"
    type: "thematic"
    status: "pending"
    introduced_chapter: 1
    estimated_fulfillment: "第10章"
    actual_fulfillment: ""
    fulfillment_chapter: 0
    impact: ""

conflicts:
  - id: "kingdom_threat"
    parties: "艾利克斯 vs 黑暗领主"
    type: "interpersonal"
    nature: "man_vs_man"
    status: "active"
    introduced_chapter: 1
    resolution_chapter: 0
    resolution_type: ""
    notes: "核心冲突线"

mysteries:
  - id: "amulet_origin"
    question: "神秘护身符的起源是什么？"
    clues: "古老符文, 微弱蓝光"
    suspects: []
    status: "unsolved"
    introduced_chapter: 1
    solution_chapter: 0
    solution: ""
    red_herrings: []

metadata:
  updated_at: "2026-04-19T19:00:00"
  node_id: "pending_hooks"
  chapter_ref: "第1章"
```

### chapter_summaries.md

```yaml
chapters:
  - chapter_number: 1
    title: "命运的开始"
    word_count: 1200
    characters_present:
      - "艾利克斯"
      - "神秘老人"
    locations_visited:
      - "酒馆"
      - "魔法塔"

    key_events:
      - event: "艾利克斯获得神秘护身符"
        timestamp: ""
        impact: "long"
        importance: "critical"

    plot_advancements:
      - aspect: "main_plot"
        description: "英雄获得关键道具"
        progress_percentage: 10

    character_developments:
      - character: "艾利克斯"
        type: "growth"
        description: "意识到自己拥有魔法天赋"
        impact_on_future: "将影响后续所有情节"

    hook_updates:
      - hook_id: "mysterious_amulet"
        action: "introduced"
        description: "神秘护身符首次出现"

    world_changes:
      - aspect: "magic"
        before: "艾利克斯不知道自己有魔法"
        after: "艾利克斯开始觉醒魔法力量"
        impact: "开启整个冒险"

    emotional_beats:
      - character: "艾利克斯"
        emotion: "惊讶"
        trigger: "获得护身符"
        intensity: 8

    conflicts:
      - conflict_id: "kingdom_threat"
        status_change: "introduced"
        description: "黑暗威胁的暗示"

    notes: "开篇章节，奠定基础"
    created_at: "2026-04-19T19:00:00"

metadata:
  updated_at: "2026-04-19T19:00:00"
  node_id: "chapter_summaries"
  chapter_ref: "第1章"
```

### subplot_board.md

```yaml
subplots:
  - id: "romance_arc"
    name: "艾利克斯与玛丽亚的恋情"
    type: "supporting"
    status: "active"
    progress_percentage: 25
    priority: "medium"
    characters_involved:
      - "艾利克斯"
      - "玛丽亚"
    key_moments: []
    goals: []
    obstacles: []
    introduced_chapter: 1
    target_resolution_chapter: 8
    actual_resolution_chapter: 0
    last_updated_chapter: 1
    chapters_since_update: 0
    is_stagnant: false
    notes: ""

plot_connections:
  - from_subplot: "romance_arc"
    to_subplot: "main_plot"
    connection_type: "intersecting"
    strength: 7
    description: "玛丽亚知道护身符的秘密"
    established_chapter: 3

convergence_points: []

divergence_points: []

stagnation_warnings: []

metadata:
  updated_at: "2026-04-19T19:00:00"
  node_id: "subplot_board"
  chapter_ref: "第1章"
```

### emotional_arcs.md

```yaml
characters:
  - name: "艾利克斯"
    personality_traits:
      - "勇敢"
      - "好奇"
    core_motivations:
      - "寻找真相"
      - "保护他人"
    emotional_state:
      current_emotion: "兴奋"
      intensity: 6
      duration: "短期"
      stability: "fluctuating"

    emotional_history:
      - emotion: "惊讶"
        cause: "获得神秘护身符"
        chapter: 1
        intensity: 8
        duration: "短期"
        type: "reaction"
        impact: "开启冒险之旅"

      - emotion: "兴奋"
        cause: "发现自己拥有魔法天赋"
        chapter: 1
        intensity: 7
        duration: "中期"
        type: "internal_change"
        impact: "增强自信"

    fears:
      - "无法保护他人"
      - "黑暗吞噬一切"

    desires:
      - "成为强大的魔法师"
      - "拯救王国"

    emotional_blockers:
      - "自我怀疑"
    last_updated_chapter: 1

emotional_milestones:
  - character: "艾利克斯"
    type: "realization"
    description: "意识到自己拥有魔法天赋"
    chapter: 1
    scene: "第1章"
    emotional_before: "迷茫"
    emotional_after: "兴奋"
    impact_on_arc: "high"
    connection_to_plot: "开启整个冒险"

relationship_emotions:
  - character: "艾利克斯"
    target_character: "玛丽亚"
    emotional_state:
      current_emotion: "好感"
      intensity: 6
      change_direction: "improving"
      stability: "stable"
    emotional_history:
      - emotion: "好奇"
        cause: "初次相遇"
        chapter: 1
        change: "strengthened"
    last_updated_chapter: 1

growth_trajectories:
  - character: "艾利克斯"
    aspect: "confidence"
    starting_point: 3
    current_point: 5
    target_point: 8
    key_transitions:
      - chapter: 1
        before: 3
        after: 5
        trigger: "获得护身符"
        significance: "medium"
    is_on_track: true
    deviations: []

metadata:
  updated_at: "2026-04-19T19:00:00"
  node_id: "emotional_arcs"
  chapter_ref: "第1章"
```

### character_matrix.md

```yaml
interactions:
  - character_a: "艾利克斯"
    character_b: "玛丽亚"
    interaction_type: "dialogue"
    context: "在酒馆相遇并交谈"
    chapter: 1
    scene: "第1章"
    significance: "medium"
    emotional_tone: "positive"
    outcome: "resolved"
    impact_on_relationship: "建立了初步友谊"
    quotes: []
    notes: ""

information_boundaries:
  - information: "护身符是开启古老封印的钥匙"
    known_by:
      - "艾利克斯"
      - "神秘老人"
    unknown_by:
      - "玛丽亚"
      - "国王"
    source: "神秘老人的告知"
    is_secret: true
    chapter_revealed: 1
    full_reveal_chapter: 5
    partial_reveals:
      - chapter: 3
        revealed_to: "玛丽亚"
        partial_info: "护身符有特殊的魔法力量"

encounter_history:
  - chapter: 1
    location: "酒馆"
    context: "艾利克斯冒险前在酒馆休息"
    characters_involved:
      - "艾利克斯"
      - "神秘老人"
    interaction_type: "planned"
    significance: "critical"
    outcomes:
      - "获得护身符"
      - "得知真相"

character_groups:
  - group_name: "冒险小队"
    type: "party"
    members:
      - "艾利克斯"
      - "玛丽亚"
    leader: "艾利克斯"
    formation_chapter: 2
    disband_chapter: 0
    common_goal: "拯救王国"
    internal_dynamics: "forming"
    notes: ""

interaction_matrix: {}

metadata:
  updated_at: "2026-04-19T19:00:00"
  node_id: "character_matrix"
  chapter_ref: "第1章"
```

## 运行测试

```bash
cd /workspace/projects/workspace/storyflow/nodes/truth_files
python tests.py
```

## 集成到工作流

```python
from engine import Workflow, Engine
from nodes.truth_files import (
    CurrentStateNode,
    ParticleLedgerNode,
    PendingHooksNode
)

# 创建工作流
workflow = Workflow("story_tracker", "故事跟踪工作流")

# 添加节点
state_node = CurrentStateNode("update_state")
ledger_node = ParticleLedgerNode("update_items")
hooks_node = PendingHooksNode("update_hooks")

workflow.add_node(state_node)
workflow.add_node(ledger_node)
workflow.add_node(hooks_node)

# 设置输入
state_node.set_input("character_name", "艾利克斯")
state_node.set_input("character_location", "城堡")

ledger_node.set_input("item_name", "魔法剑")
ledger_node.set_input("item_owner", "艾利克斯")

hooks_node.set_input("hook_id", "mystery_sword")
hooks_node.set_input("hook_description", "魔法剑隐藏的秘密")
hooks_node.set_input("hook_priority", "high")

# 执行工作流
engine = Engine(workflow)
result = await engine.execute()

print(f"✅ 工作流执行完成: {result['success']}")
```

## 注意事项

1. **文件路径**: 默认保存在 `/workspace/projects/workspace/storyflow/truth_files/`
2. **更新模式**:
   - `overwrite`: 覆盖整个文件
   - `append`: 追加新数据到列表
   - `merge`: 深度合并（保留原有，添加新字段，更新现有字段）
3. **数据验证**: 每个节点都有内置的数据验证逻辑
4. **YAML 格式**: 所有文件使用 YAML 格式，便于版本控制和手动编辑
5. **章节引用**: 建议使用 `chapter_ref` 参数关联章节

## 扩展指南

如果需要添加新的真相文件节点：

1. 继承 `TruthFileNode` 基类
2. 实现 `_get_schema()` 方法定义数据结构
3. 实现 `_transform_data()` 方法转换输入数据
4. 实现 `_validate_data()` 方法验证数据
5. 添加相应的输入端口
6. 编写单元测试

参考现有节点实现作为模板。
