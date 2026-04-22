#!/usr/bin/env python3
"""阴神系统修复脚本 v2"""
import json
import os

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
BRAIN_KG = os.path.join(WORKSPACE, "brain/knowledge_graph")
LEARNINGS = os.path.join(WORKSPACE, "learnings")

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def fix_nodes():
    """移除无效节点，清理节点内容"""
    nodes_path = os.path.join(BRAIN_KG, "nodes.json")
    nodes = load_json(nodes_path)
    
    # 移除无效节点（内容太短或标题为"未命名"）
    valid_nodes = []
    removed = []
    for n in nodes:
        title = n.get('title', '')
        content = n.get('content', '')
        if '未命名' in title or len(content) < 50:
            removed.append(n)
        else:
            valid_nodes.append(n)
    
    print(f"nodes.json: {len(nodes)} -> {len(valid_nodes)} 个有效节点")
    print(f"  移除无效节点: {len(removed)}")
    for r in removed:
        print(f"    - {r.get('id')} | {r.get('title')} | {r.get('type')}")
    
    save_json(nodes_path, valid_nodes)
    return valid_nodes

def add_lessons_from_errors():
    """从 errors.json 提取 ongoing/高价值错误，转化为教训节点"""
    nodes_path = os.path.join(BRAIN_KG, "nodes.json")
    errors_path = os.path.join(LEARNINGS, "errors.json")
    
    nodes = load_json(nodes_path)
    errors = load_json(errors_path)
    
    # 找到现有的教训节点ID（用于避免重复）
    existing_lesson_ids = {n.get('id') for n in nodes if n.get('type') == 'lesson'}
    
    # 从错误中提取教训
    new_lessons = []
    for e in errors:
        if e.get('status') != 'resolved':
            # 只处理未解决的错误
            error_type = e.get('error_type', 'unknown')
            error_msg = e.get('error_message', '')
            root_cause = e.get('root_cause', '未知')
            resolution = e.get('resolution', '待确定')
            
            lesson = {
                "id": f"lesson-{e.get('id')}",
                "title": f"教训-{e.get('id')}-{error_type[:15]}",
                "type": "lesson",
                "content": f"---\nid: lesson-{e.get('id')}\ncreated_at: {e.get('timestamp')}\nagent: system\ntype: {error_type}\nseverity: high\ntags: [{error_type}]\noccurence_count: 1\nresolved: false\n---\n\n# {error_type}\n\n## 问题描述\n{error_msg}\n\n## 根本原因\n{root_cause}\n\n## 解决方案\n{resolution}\n\n## 关键警示\n⚠️ **避免重蹈覆辙**\n",
                "tags": [error_type],
                "created_at": e.get('timestamp', ''),
                "references": [e.get('id')],
                "related_to": [],
                "confidence": 1.0
            }
            new_lessons.append(lesson)
            print(f"  从错误生成教训: {e.get('id')} -> {error_type}")
    
    # 去重：如果同名教训已存在，不再添加
    final_lessons = [l for l in new_lessons if l['id'] not in existing_lesson_ids]
    nodes.extend(final_lessons)
    
    save_json(nodes_path, nodes)
    print(f"新增教训: {len(final_lessons)} 个")
    return nodes

def rebuild_graph_dot(nodes):
    """重建 graph.dot"""
    path = os.path.join(BRAIN_KG, "graph.dot")
    lines = ['digraph KnowledgeGraph {', '  rankdir=LR;', '  node [shape=box];']
    
    type_colors = {
        'pattern': 'lightblue',
        'lesson': 'lightcoral',
        'knowledge': 'lightyellow',
        'unknown': 'lightgray'
    }
    
    for n in nodes:
        title = n.get('title', 'Unknown')[:30]
        ntype = n.get('type', 'unknown')
        color = type_colors.get(ntype, 'lightgray')
        title_escaped = title.replace('"', '\\"').replace('\n', ' ')
        lines.append(f'  "{n.get("id")}" [label="{title_escaped}", fillcolor="{color}", style="filled"];')
    
    lines.append('}')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"graph.dot: 已重建 {len(nodes)} 个节点")

def deduplicate_errors():
    """去除 errors.json 中的重复记录"""
    errors_path = os.path.join(LEARNINGS, "errors.json")
    errors = load_json(errors_path)
    
    # 按 id 去重，保留最后出现的
    seen = {}
    for e in errors:
        eid = e.get('id', '')
        seen[eid] = e  # 后面的覆盖前面的
    
    deduped = list(seen.values())
    print(f"\nerrors.json: {len(errors)} -> {len(deduped)} 条（去重后）")
    
    save_json(errors_path, deduped)

def main():
    print("=" * 50)
    print("阴神系统修复 v2")
    print("=" * 50)
    
    # 1. 清理无效节点
    nodes = fix_nodes()
    
    # 2. 从错误中添加教训
    nodes = add_lessons_from_errors()
    
    # 3. 重建 graph.dot
    rebuild_graph_dot(nodes)
    
    # 4. 去重 errors.json
    deduplicate_errors()
    
    print("\n" + "=" * 50)
    print("修复完成!")
    print("=" * 50)

if __name__ == "__main__":
    main()
