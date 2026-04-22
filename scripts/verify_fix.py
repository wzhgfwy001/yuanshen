#!/usr/bin/env python3
"""验证修复结果"""
import json
import os

workspace = "C:/Users/DELL/.openclaw/workspace"

# Check errors.json
errors_path = os.path.join(workspace, "learnings/errors.json")
with open(errors_path, 'r', encoding='utf-8') as f:
    errors = json.load(f)
print(f"errors.json: {len(errors)} entries")
ongoing = [e for e in errors if e.get('status') == 'ongoing']
resolved = [e for e in errors if e.get('status') == 'resolved']
print(f"  resolved: {len(resolved)}")
print(f"  ongoing: {len(ongoing)}")
for e in errors:
    eid = e.get('id')
    status = e.get('status')
    etype = e.get('error_type', 'N/A')
    print(f"  {eid} | {status} | {etype}")

# Check lesson_lookup.json
lu_path = os.path.join(workspace, "scripts/lesson_lookup.json")
with open(lu_path, 'r', encoding='utf-8') as f:
    lessons = json.load(f)
print(f"\nlesson_lookup.json: {len(lessons)} lessons")
for lid, l in lessons.items():
    print(f"  {lid}: {l.get('error_type')} ({l.get('status')})")

# Check KG nodes
kg_path = os.path.join(workspace, "brain/knowledge_graph/nodes.json")
with open(kg_path, 'r', encoding='utf-8') as f:
    nodes = json.load(f)
print(f"\nknowledge_graph nodes: {len(nodes)}")
type_counts = {}
for n in nodes:
    t = n.get('type', 'unknown')
    type_counts[t] = type_counts.get(t, 0) + 1
for t, c in type_counts.items():
    print(f"  {t}: {c}")

# Check patterns trigger_count
patterns_dir = os.path.join(workspace, "brain/patterns")
pattern_files = [f for f in os.listdir(patterns_dir) if f.endswith('.md') and f != 'README.md']
print(f"\npattern files (excluding README): {len(pattern_files)}")

# Check graph.dot
dot_path = os.path.join(workspace, "brain/knowledge_graph/graph.dot")
with open(dot_path, 'r', encoding='utf-8') as f:
    content = f.read()
node_count = content.count('fillcolor=')
print(f"\ngraph.dot nodes: {node_count}")

print("\n=== 验证完成 ===")
