#!/usr/bin/env python3
"""
阴神系统完整修复与补全脚本 v3
- 补全 common_knowledge 空目录
- 补全 user_preferences 空目录  
- 更新 learned.md 真实内容
- 补全 patterns 触发机制
- 补全 lessons 与 errors 关联
- 创建 pattern matching 逻辑
- 创建 lesson lookup 逻辑
"""
import json
import os
import uuid
from datetime import datetime

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
BRAIN_CK = os.path.join(WORKSPACE, "brain/common_knowledge")
BRAIN_UP = os.path.join(WORKSPACE, "brain/user_preferences")
BRAIN_PATTERNS = os.path.join(WORKSPACE, "brain/patterns")
BRAIN_LESSONS = os.path.join(WORKSPACE, "brain/lessons")
BRAIN_KG = os.path.join(WORKSPACE, "brain/knowledge_graph")
LEARNINGS = os.path.join(WORKSPACE, "learnings")
BRAIN = os.path.join(WORKSPACE, "brain")

def now_iso():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00")

def now_iso_short():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

# ============ 1. 补全 common_knowledge ============
def create_common_knowledge():
    """创建通用知识条目"""
    entries = [
        {
            "id": "ck-coding-standards",
            "title": "代码编写规范",
            "type": "knowledge",
            "content": """# 代码编写规范

## 核心理念
- **简单优先**：最小代码解决问题，不做 speculative 开发
- **精准修改**：只改必要的，不"改进"相邻代码
- **可验证**：每一行改动都能追溯到用户需求

## Python 规范
- 使用 `r"raw string"` 处理正则表达式
- 文件保存为 UTF-8 编码
- 函数添加 docstring 说明参数和返回值
- 异常处理要具体，不 bare except

## JavaScript 规范
- 使用 camelCase 命名变量
- 使用 PascalCase 命名类和组件
- 函数参数提供默认值
- 异步操作添加错误处理

## PowerShell 规范
- 使用 `$true`/`$false` 而非 `True`/`False`
- 使用 `Get-Content -Encoding UTF8`
- 管道操作注意性能

## 触发条件
- 任何代码编写任务
- 任何代码审查任务
""",
            "tags": ["coding", "standards", "best-practices"],
            "created_at": now_iso(),
            "references": [],
            "related_to": ["ck-error-handling", "ck-code-review"],
            "confidence": 1.0
        },
        {
            "id": "ck-error-handling",
            "title": "错误处理规范",
            "type": "knowledge",
            "content": """# 错误处理规范

## 原则
1. **具体捕获**：except 只捕获已知异常类型
2. **记录日志**：记录错误时包含上下文
3. **优雅降级**：出错时提供备用方案
4. **用户友好**：错误信息对用户可理解

## Python 错误处理
```python
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"操作失败: {e}")
    return fallback_result()
except Exception as e:
    logger.exception("未知错误")
    raise
```

## 外部 API 调用
- 必须设置 timeout（10-30秒）
- 实现重试机制（最多3次）
- 提供降级方案

## 触发条件
- 任何涉及外部调用的任务
- 任何需要错误恢复的任务
""",
            "tags": ["error-handling", "resilience", "api"],
            "created_at": now_iso(),
            "references": [],
            "related_to": ["ck-coding-standards"],
            "confidence": 1.0
        },
        {
            "id": "ck-code-review",
            "title": "代码审查清单",
            "type": "knowledge",
            "content": """# 代码审查清单

## 安全性检查
- [ ] 无注入/溢出风险
- [ ] 敏感信息不硬编码
- [ ] 输入验证完整

## 性能检查
- [ ] 无 N+1 查询
- [ ] 无无限循环
- [ ] 资源正确释放

## 可读性检查
- [ ] 命名清晰
- [ ] 注释充分
- [ ] 函数短小（<50行）

## 错误处理检查
- [ ] 异常捕获完善
- [ ] 边界条件处理
- [ ] 有降级方案

## 触发条件
- 代码审查任务
- 代码质量检查任务
""",
            "tags": ["code-review", "quality", "checklist"],
            "created_at": now_iso(),
            "references": [],
            "related_to": ["ck-coding-standards"],
            "confidence": 1.0
        },
        {
            "id": "ck-writing-style",
            "title": "写作风格规范",
            "type": "knowledge",
            "content": """# 写作风格规范

## 去 AI 味要点
1. 避免过度完美的表述
2. 使用自然过渡，不强行关联
3. 适当使用口语化表达
4. 句式多样化，避免重复
5. 细节具体化，不要泛泛而谈

## 技术文档写作
- 先说结论，再说原因
- 使用代码示例说明
- 表格优于冗长文字
- 标题清晰，层次分明

## 创意写作
- 场景描写具体（时间、地点、感官）
- 人物动作代替陈述
- 对话自然，不书面化
- 情感通过行为表达

## 触发条件
- 任何写作任务
- 任何内容创作任务
""",
            "tags": ["writing", "style", "content-creation"],
            "created_at": now_iso(),
            "references": [],
            "related_to": [],
            "confidence": 1.0
        },
        {
            "id": "ck-task-routing",
            "title": "任务路由决策",
            "type": "knowledge",
            "content": """# 任务路由决策

## 任务类型判断流程

### 1. 分析任务类型
```
简单任务（<5分钟）→ 直接执行
标准任务（有固定流程）→ 查 Skill 后执行
创新任务（需要创作）→ 多 Agent 协作
复杂任务（多阶段）→ 任务分解 + 多 Agent
混合任务 → 主 Agent 协调
```

### 2. Agent 选择逻辑
| 任务类型 | 推荐 Agent | 说明 |
|---------|-----------|------|
| 代码实现 | 白哉 | 注重质量和规范 |
| 数据分析 | 艾斯 | 注重数据和逻辑 |
| 内容创作 | 山寺三郎 | 注重创意和表达 |
| 任务分解 | 鹿丸 | 注重结构和规划 |
| 学术分析 | 静音 | 注重深度和研究 |

### 3. 触发时机
- 任何新任务开始时
- 任务类型不明确时
- 需要多 Agent 协作时
""",
            "tags": ["task-routing", "agent-selection", "decision"],
            "created_at": now_iso(),
            "references": [],
            "related_to": [],
            "confidence": 1.0
        }
    ]
    
    for entry in entries:
        # Save as individual markdown file in common_knowledge/
        filepath = os.path.join(BRAIN_CK, f"{entry['id']}.md")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(entry['content'])
        print(f"  Created: {entry['id']}.md")
    
    return entries

# ============ 2. 补全 user_preferences ============
def create_user_preferences():
    """从 USER.md 和 user_profile 中提取用户偏好"""
    entries = [
        {
            "id": "up-communication",
            "title": "用户沟通偏好",
            "type": "preference",
            "content": """# 用户沟通偏好

## 沟通风格
- **详细展开**：喜欢详细解释和分析
- **中文优先**：主要使用中文交流
- **主动汇报**：任务进行中主动汇报进度

## 决策方式
- **深思熟虑 + 多方案对比**：不冲动决定，需要多个选项
- **喜欢询问意见**：先问用户意见，评估后才执行
- **反馈式**：会根据建议调整方向

## 交互习惯
- 简洁指令："处理"、"继续"等
- 不喜欢过多确认
- 习惯用"都处理"表示全选

## 触发条件
- 任何需要与用户确认的任务
- 方案选择类任务
""",
            "tags": ["communication", "decision-style", "feedback"],
            "created_at": now_iso(),
            "references": ["USER.md", "brain/progress.json"],
            "related_to": ["up-output-format"],
            "confidence": 1.0
        },
        {
            "id": "up-output-format",
            "title": "输出格式偏好",
            "type": "preference",
            "content": """# 输出格式偏好

## 任务输出
- **根据任务类型决定**：不需要每次都格式化
- **代码任务**：代码块 + 简洁说明
- **分析任务**：表格 + 关键发现
- **写作任务**：直接输出内容

## 报告格式
- 使用 Markdown 格式
- 代码示例要可运行
- 表格优于列表（对于数据）

## 工作流程偏好
- 不喜欢过度设计
- 先完成再优化
- 小步迭代，快速验证

## 触发条件
- 需要输出格式化结果时
- 方案展示类任务
""",
            "tags": ["output", "format", "presentation"],
            "created_at": now_iso(),
            "references": ["brain/progress.json"],
            "related_to": ["up-communication"],
            "confidence": 1.0
        },
        {
            "id": "up-tech-preferences",
            "title": "技术实现偏好",
            "type": "preference",
            "content": """# 技术实现偏好

## 编程语言
- **Python**：主要使用，文件操作和数据处理
- **PowerShell**：Windows 系统管理
- **JavaScript**：前端和 OpenClaw 插件

## 系统偏好
- 高端 UI 设计
- 简洁高效
- 持续优化迭代
- 避免内存占用过大

## 已掌握技术
- 高考志愿系统开发（桌面应用）
- 混合多 Agent 系统开发
- OpenClaw Skills 开发
- GitHub 协作

## 触发条件
- 技术选型任务
- 架构设计任务
""",
            "tags": ["technology", "stack", "preferences"],
            "created_at": now_iso(),
            "references": ["USER.md"],
            "related_to": [],
            "confidence": 1.0
        }
    ]
    
    for entry in entries:
        filepath = os.path.join(BRAIN_UP, f"{entry['id']}.md")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(entry['content'])
        print(f"  Created: {entry['id']}.md")
    
    return entries

# ============ 3. 更新 learned.md ============
def update_learned():
    """更新 learned.md 真实内容"""
    content = """# Learned - 经验教训总结

> 记录从实际任务中学习的核心经验，避免重复犯错

---

## 2026-04-22 重要教训

### 教训1：向量数据库不是必须的
**问题**：为了实现 memory_search，向量数据库（ChromaDB）消耗了 7GB+ 内存
**后果**：系统内存从 15.9GB 的 2.7GB 可用 → 导致各种 OOM 和 SIGKILL
**决策**：卸载 LM Studio + ChromaDB，memory_search 降级为纯文本搜索
**教训**：不是所有功能都需要重型组件，简单方案优先

### 教训2：创建文件后必须验证是否生效
**问题**：创建了大量 schema 文件，但没有验证是否被系统加载
**后果**：err-006（假执行问题）
**教训**：创建文件后必须验证：
1. 文件路径正确
2. 主流程确实读取了文件
3. 实际效果可观测

### 教训3：系统分析前先读文件验证
**问题**：只看目录名就下结论，说缺少向量检索、自我反思等
**后果**：err-004（分析错误），5个判断全错
**教训**：分析前先读 SKILL.md 和核心文件，不确定时直接承认

---

## 2026-04-21 重要教训

### 教训4：openclaw status 命令在高内存压力下会被 SIGKILL
**问题**：系统内存不足时，长时间运行的 Python 命令会被系统杀死
**教训**：在高内存压力下，避免运行需要大量内存的命令

### 教训5：PowerShell 中文字符编码问题
**问题**：`Get-Content` 在 PowerShell 中输出中文会乱码
**解决**：使用 Python 读写文件，或使用 `-Encoding UTF8` 参数

---

## 2026-04-17 重要教训

### 教训6：Agent 命名规范
火影忍者和死神的角色更适合命名专业型 Agent（如鹿丸=任务分解）

### 教训7：SKILL.md 描述不等于实际执行
SKILL.md 是提示词，不会自动执行。需要实际代码来完成任务。

---

## 2026-04-12 重要教训

### 教训8：文件编码必须统一
- Python 文件：UTF-8
- PowerShell：`-Encoding UTF8`
- JavaScript：UTF-8 without BOM

---

*最后更新: 2026-04-22T06:05:00+08:00*
"""
    filepath = os.path.join(WORKSPACE, "brain/learned.md")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("  Updated: learned.md")

# ============ 4. 补全 patterns 触发机制 ============
def create_pattern_matching_system():
    """创建 pattern matching 逻辑"""
    
    # Pattern triggers definition
    triggers = {
        "data_analysis": {
            "keywords": ["分析", "数据", "统计", "报表", "数据清洗", "data analysis", "analyze"],
            "agent": "艾斯",
            "confidence_boost": 0.2
        },
        "implementation": {
            "keywords": ["实现", "代码", "写代码", "开发", "implementation", "code", "develop"],
            "agent": "白哉",
            "confidence_boost": 0.2
        },
        "writing": {
            "keywords": ["写作", "创作", "写文章", "写小说", "writing", "create content", "write"],
            "agent": "山寺三郎",
            "confidence_boost": 0.2
        },
        "task_decomposition": {
            "keywords": ["分解", "规划", "拆解", "多步骤", "复杂任务", "decompose", "plan", "break down"],
            "agent": "鹿丸",
            "confidence_boost": 0.2
        },
        "academic_research": {
            "keywords": ["研究", "论文", "学术", "调研", "research", "paper", "study"],
            "agent": "静音",
            "confidence_boost": 0.2
        },
        "error_handling": {
            "keywords": ["错误", "异常", "调试", "debug", "error", "fix bug"],
            "agent": "白哉",
            "confidence_boost": 0.2
        },
        "decision_making": {
            "keywords": ["决策", "选择方案", "权衡", "decision", "choose", "evaluate"],
            "agent": "鹿丸",
            "confidence_boost": 0.2
        }
    }
    
    # Save triggers config
    triggers_path = os.path.join(BRAIN_PATTERNS, "pattern-triggers.json")
    with open(triggers_path, 'w', encoding='utf-8') as f:
        json.dump(triggers, f, ensure_ascii=False, indent=2)
    print(f"  Created: pattern-triggers.json ({len(triggers)} triggers)")
    
    # Create pattern matching script
    matching_script = '''#!/usr/bin/env python3
"""
Pattern Matching System
根据任务描述匹配合适的 Pattern 并返回推荐 Agent
Usage: python pattern_match.py "任务描述"
"""
import json
import sys
import os

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
PATTERNS_DIR = os.path.join(WORKSPACE, "brain/patterns")

def load_triggers():
    triggers_path = os.path.join(PATTERNS_DIR, "pattern-triggers.json")
    with open(triggers_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def match_pattern(task_description, threshold=0.1):
    """根据任务描述匹配合适的 Pattern"""
    triggers = load_triggers()
    task_lower = task_description.lower()
    
    matches = []
    for pattern_type, config in triggers.items():
        score = 0
        matched_keywords = []
        for kw in config["keywords"]:
            if kw.lower() in task_lower:
                score += config["confidence_boost"]
                matched_keywords.append(kw)
        
        if score >= threshold:
            matches.append({
                "type": pattern_type,
                "agent": config["agent"],
                "score": score,
                "matched_keywords": matched_keywords
            })
    
    # 按分数排序
    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches

def get_pattern_details(pattern_type):
    """获取指定 Pattern 的详细信息"""
    patterns_dir = os.path.join(PATTERNS_DIR, f"{pattern_type}.md")
    if os.path.exists(patterns_dir):
        with open(patterns_dir, 'r', encoding='utf-8') as f:
            return f.read()
    
    # Find by scanning files
    for f in os.listdir(PATTERNS_DIR):
        if f.endswith('.md') and pattern_type in f:
            with open(os.path.join(PATTERNS_DIR, f), 'r', encoding='utf-8') as file:
                return file.read()
    return None

def increment_trigger_count(pattern_type):
    """增加 Pattern 的 trigger_count"""
    # This would update the pattern file's frontmatter
    # Implementation depends on how patterns are stored
    pass

def main():
    if len(sys.argv) < 2:
        print("Usage: python pattern_match.py <task_description>")
        print("Example: python pattern_match.py '帮我分析一下销售数据'")
        sys.exit(1)
    
    task = " ".join(sys.argv[1:])
    matches = match_pattern(task)
    
    print(f"任务: {task}")
    print(f"匹配到 {len(matches)} 个 Pattern:")
    for m in matches:
        print(f"  - {m['type']}: {m['agent']} (score={m['score']:.2f})")
        print(f"    匹配关键词: {', '.join(m['matched_keywords'])}")
    
    if matches:
        best = matches[0]
        print(f"\\n推荐 Agent: {best['agent']} (类型: {best['type']})")

if __name__ == "__main__":
    main()
'''
    
    script_path = os.path.join(WORKSPACE, "scripts/pattern_match.py")
    os.makedirs(os.path.dirname(script_path), exist_ok=True)
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(matching_script)
    print(f"  Created: scripts/pattern_match.py")
    
    return triggers

# ============ 5. 补全 lessons 与 errors 关联 ============
def create_lesson_lookup_system():
    """创建 lesson lookup 逻辑，从 errors 中提取教训"""
    
    errors_path = os.path.join(LEARNINGS, "errors.json")
    with open(errors_path, 'r', encoding='utf-8') as f:
        errors = json.load(f)
    
    # Build lesson lookup index
    lesson_index = {}
    
    for error in errors:
        if error.get('status') != 'resolved':
            error_type = error.get('error_type', 'unknown')
            root_cause = error.get('root_cause', '未知')
            resolution = error.get('resolution', '待确定')
            
            lesson_index[error.get('id')] = {
                "error_type": error_type,
                "root_cause": root_cause,
                "resolution": resolution,
                "status": error.get('status')
            }
    
    # Save lesson lookup index
    lookup_path = os.path.join(WORKSPACE, "scripts/lesson_lookup.json")
    with open(lookup_path, 'w', encoding='utf-8') as f:
        json.dump(lesson_index, f, ensure_ascii=False, indent=2)
    print(f"  Created: scripts/lesson_lookup.json ({len(lesson_index)} lessons)")
    
    # Create lesson lookup script
    lookup_script = '''#!/usr/bin/env python3
"""
Lesson Lookup System
根据错误类型查找相关教训
Usage: python lesson_lookup.py <error_type>
Usage: python lesson_lookup.py --all
"""
import json
import sys
import os

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
LESSONS_INDEX = os.path.join(WORKSPACE, "scripts/lesson_lookup.json")
ERRORS_PATH = os.path.join(WORKSPACE, "learnings/errors.json")
LESSONS_DIR = os.path.join(WORKSPACE, "brain/lessons")

def load_lessons_index():
    with open(LESSONS_INDEX, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_errors():
    with open(ERRORS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def lookup_by_error_type(error_type):
    """根据错误类型查找教训"""
    lessons = load_lessons_index()
    errors = load_errors()
    
    matches = []
    for eid, lesson in lessons.items():
        if error_type.lower() in lesson["error_type"].lower():
            matches.append((eid, lesson))
    
    return matches

def lookup_by_keyword(keyword):
    """根据关键词查找教训"""
    lessons = load_lessons_index()
    errors = load_errors()
    
    matches = []
    for eid, lesson in lessons.items():
        if (keyword.lower() in lesson["error_type"].lower() or
            keyword.lower() in lesson["root_cause"].lower() or
            keyword.lower() in lesson["resolution"].lower()):
            matches.append((eid, lesson))
    
    return matches

def get_preventive_tips(error_type):
    """获取预防建议"""
    tips = {
        "假执行": "创建文件后必须验证：1)文件路径正确 2)主流程确实读取 3)实际效果可观测",
        "分析错误": "分析前先读 SKILL.md 和核心文件，不确定时直接承认",
        "SyntaxWarning": "正则表达式使用 r'raw string' 格式",
        "UnicodeDecodeError": "文件保存为 UTF-8 编码",
        "ReferenceError": "函数参数检查默认值和顺序",
        "API超时": "外部 API 调用必须设置 timeout（10-30秒）"
    }
    return tips.get(error_type, "未知错误类型")

def main():
    if len(sys.argv) < 2:
        print("Usage: python lesson_lookup.py <error_type_or_keyword>")
        print("       python lesson_lookup.py --all")
        sys.exit(1)
    
    arg = sys.argv[1]
    
    if arg == "--all":
        lessons = load_lessons_index()
        print(f"所有教训 ({len(lessons)} 个):")
        for eid, lesson in lessons.items():
            print(f"\\n  [{eid}] {lesson['error_type']}")
            print(f"    原因: {lesson['root_cause'][:50]}...")
            print(f"    解决: {lesson['resolution'][:50]}...")
            print(f"    状态: {lesson['status']}")
    else:
        matches = lookup_by_error_type(arg)
        if not matches:
            matches = lookup_by_keyword(arg)
        
        print(f"查找 '{arg}': {len(matches)} 个结果")
        for eid, lesson in matches:
            print(f"\\n  [{eid}] {lesson['error_type']}")
            print(f"    原因: {lesson['root_cause']}")
            print(f"    解决: {lesson['resolution']}")
            print(f"    预防: {get_preventive_tips(lesson['error_type'])}")

if __name__ == "__main__":
    main()
'''
    
    script_path = os.path.join(WORKSPACE, "scripts/lesson_lookup.py")
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(lookup_script)
    print(f"  Created: scripts/lesson_lookup.py")
    
    return lesson_index

# ============ 6. 更新 knowledge_graph ============
def update_knowledge_graph(new_entries):
    """更新 knowledge_graph 的 nodes.json"""
    kg_nodes_path = os.path.join(WORKSPACE, "brain/knowledge_graph/nodes.json")
    kg_rels_path = os.path.join(WORKSPACE, "brain/knowledge_graph/relations.json")
    kg_dot_path = os.path.join(WORKSPACE, "brain/knowledge_graph/graph.dot")
    
    # Load existing nodes
    with open(kg_nodes_path, 'r', encoding='utf-8') as f:
        nodes = json.load(f)
    
    # Add new entries
    for entry in new_entries:
        nodes.append(entry)
    
    # Save updated nodes
    with open(kg_nodes_path, 'w', encoding='utf-8') as f:
        json.dump(nodes, f, ensure_ascii=False, indent=2)
    print(f"  Updated: nodes.json (+{len(new_entries)} entries, total={len(nodes)})")
    
    # Rebuild relations
    relations = []
    for node in nodes:
        node_id = node.get('id', '')
        for rel_id in node.get('related_to', []):
            relations.append({'source': node_id, 'target': rel_id, 'type': 'related'})
    
    with open(kg_rels_path, 'w', encoding='utf-8') as f:
        json.dump(relations, f, ensure_ascii=False, indent=2)
    print(f"  Updated: relations.json ({len(relations)} relations)")
    
    # Rebuild graph.dot
    lines = ['digraph KnowledgeGraph {', '  rankdir=LR;', '  node [shape=box];']
    type_colors = {
        'pattern': 'lightblue', 'lesson': 'lightcoral',
        'knowledge': 'lightyellow', 'preference': 'lightgreen',
        'unknown': 'lightgray'
    }
    for n in nodes:
        title = n.get('title', 'Unknown')[:30]
        ntype = n.get('type', 'unknown')
        color = type_colors.get(ntype, 'lightgray')
        title_esc = title.replace('"', '\\"').replace('\n', ' ')
        lines.append(f'  "{n.get("id")}" [label="{title_esc}", fillcolor="{color}", style="filled"];')
    lines.append('}')
    
    with open(kg_dot_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"  Updated: graph.dot ({len(nodes)} nodes)")

# ============ MAIN ============
def main():
    print("=" * 60)
    print("阴神系统完整修复 v3 - 补全空文件 + 触发机制")
    print("=" * 60)
    
    new_entries = []
    
    print("\\n[1/6] 补全 common_knowledge...")
    new_entries.extend(create_common_knowledge())
    
    print("\\n[2/6] 补全 user_preferences...")
    new_entries.extend(create_user_preferences())
    
    print("\\n[3/6] 更新 learned.md...")
    update_learned()
    
    print("\\n[4/6] 创建 Pattern 触发机制...")
    create_pattern_matching_system()
    
    print("\\n[5/6] 创建 Lesson 查找系统...")
    create_lesson_lookup_system()
    
    print("\\n[6/6] 更新 Knowledge Graph...")
    update_knowledge_graph(new_entries)
    
    print("\\n" + "=" * 60)
    print("修复完成!")
    print("=" * 60)
    print(f"\\n新增条目: {len(new_entries)} 个")
    print("\\n新增脚本:")
    print("  - scripts/pattern_match.py    (Pattern 匹配)")
    print("  - scripts/lesson_lookup.py    (教训查找)")
    print("  - brain/patterns/pattern-triggers.json")
    print("  - scripts/lesson_lookup.json")

if __name__ == "__main__":
    main()
