#!/usr/bin/env python3
"""阴神系统诊断与修复脚本"""
import json
import os

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
MEMORY_DREAMS = os.path.join(WORKSPACE, "memory/.dreams")
BRAIN_KG = os.path.join(WORKSPACE, "brain/knowledge_graph")
BRAIN_PATTERNS = os.path.join(WORKSPACE, "brain/patterns")
LEARNINGS = os.path.join(WORKSPACE, "learnings")

def check_nodes():
    """检查并修复 nodes.json"""
    path = os.path.join(BRAIN_KG, "nodes.json")
    with open(path, 'r', encoding='utf-8') as f:
        nodes = json.load(f)
    print(f"nodes.json: {len(nodes)} 个节点")
    
    # 标记无效节点
    invalid = []
    for n in nodes:
        title = n.get('title', '')
        content = n.get('content', '')
        if '未命名' in title or len(content) < 50:
            invalid.append(n)
    
    print(f"  无效节点: {len(invalid)}")
    for n in invalid:
        print(f"    - {n.get('id')} | {n.get('title')} | {n.get('type')}")
    
    return nodes

def fix_relations(nodes):
    """从 nodes 构建 relations.json"""
    relations_path = os.path.join(BRAIN_KG, "relations.json")
    
    new_relations = []
    for node in nodes:
        node_id = node.get('id', '')
        related_to = node.get('related_to', [])
        for rel_id in related_to:
            new_relations.append({
                'source': node_id,
                'target': rel_id,
                'type': 'related'
            })
    
    with open(relations_path, 'w', encoding='utf-8') as f:
        json.dump(new_relations, f, ensure_ascii=False, indent=2)
    print(f"relations.json: {len(new_relations)} 条关系")

def build_lessons_relations():
    """从 errors.json 提取教训并关联到 lessons"""
    errors_path = os.path.join(LEARNINGS, "errors.json")
    with open(errors_path, 'r', encoding='utf-8') as f:
        errors = json.load(f)
    
    print(f"\nlearnings/errors.json: {len(errors)} 条错误记录")
    for e in errors:
        print(f"  {e.get('id')} | {e.get('status')} | {e.get('error_type', 'N/A')}")

def check_short_term_recall():
    """检查 short-term-recall.json"""
    path = os.path.join(MEMORY_DREAMS, "short-term-recall.json")
    with open(path, 'r', encoding='utf-8') as f:
        recall = json.load(f)
    
    entries = recall.get('entries', {})
    print(f"\nshort-term-recall.json: {len(entries)} 条记忆")
    print(f"  updatedAt: {recall.get('updatedAt')}")

def rebuild_graph_dot(nodes):
    """重建 graph.dot"""
    path = os.path.join(BRAIN_KG, "graph.dot")
    lines = ['digraph KnowledgeGraph {', '  rankdir=LR;', '  node [shape=box];']
    
    for n in nodes:
        title = n.get('title', 'Unknown')
        ntype = n.get('type', 'unknown')
        color = 'lightblue' if ntype == 'pattern' else 'lightcoral' if ntype == 'lesson' else 'lightyellow'
        # Escape quotes in title
        title_escaped = title.replace('"', '\\"')
        lines.append(f'  "{n.get("id")}" [label="{title_escaped}", fillcolor="{color}", style="filled"];')
    
    lines.append('}')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"\ngraph.dot: 已重建 {len(nodes)} 个节点")

def main():
    print("=" * 50)
    print("阴神系统诊断与修复")
    print("=" * 50)
    
    # 1. 检查 nodes.json
    nodes = check_nodes()
    
    # 2. 重建 relations.json
    fix_relations(nodes)
    
    # 3. 检查 errors 关联
    build_lessons_relations()
    
    # 4. 检查 short-term-recall
    check_short_term_recall()
    
    # 5. 重建 graph.dot
    rebuild_graph_dot(nodes)
    
    print("\n" + "=" * 50)
    print("修复完成!")
    print("=" * 50)

if __name__ == "__main__":
    main()
