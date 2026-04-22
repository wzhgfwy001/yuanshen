#!/usr/bin/env python3
"""阳神系统健康检查"""
import json
import os

workspace = "C:/Users/DELL/.openclaw/workspace"
dmas = os.path.join(workspace, "skills/dynamic-multi-agent-system")

print("=" * 60)
print("阳神系统健康检查")
print("=" * 60)

# 1. Check state files
state_dir = os.path.join(dmas, "state")
print("\n[1] State 文件检查")

state_files = {
    "skill-counters.json": None,
    "skill-patterns.json": None,
    "experience-db.json": None,
    "verification-log.json": None,
    "category-validation-tracker.json": None,
    "feedback-stats.json": None,
    "multi-task-queue.json": None,
    "alerts.json": None
}

for fname in state_files:
    path = os.path.join(state_dir, fname)
    if os.path.exists(path) and not os.path.isdir(path):
        size = os.path.getsize(path)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            state_files[fname] = {"size": size, "data": data, "valid": True}
            print(f"  {fname}: OK ({size} bytes)")
        except Exception as e:
            state_files[fname] = {"size": size, "valid": False, "error": str(e)}
            print(f"  {fname}: ERROR - {e}")
    else:
        print(f"  {fname}: MISSING")

# 2. Check skill-counters.json content
print("\n[2] skill-counters.json 内容")
sc = state_files.get("skill-counters.json", {})
if sc.get("valid"):
    data = sc["data"]
    total = data.get("totalTasks", 0)
    skills_used = len(data.get("skillsUsed", {}))
    print(f"  Total tasks: {total}")
    print(f"  Skills used: {skills_used}")
    if total == 0:
        print("  ⚠️ 警告: totalTasks 为 0，追踪可能未生效")

# 3. Check category-validation-tracker.json
print("\n[3] category-validation-tracker.json 内容")
tracker_path = os.path.join(dmas, "core/subagent-manager/category-validation-tracker.json")
with open(tracker_path, 'r', encoding='utf-8') as f:
    tracker = json.load(f)
stats = tracker.get("stats", {})
total = stats.get("totalTasks", 0)
last_updated = stats.get("lastUpdated", "N/A")
print(f"  Total tasks: {total}")
print(f"  Last updated: {last_updated}")
if total == 0:
    print("  ⚠️ 警告: totalTasks 为 0，需要验证 tracker.increment() 是否被调用")

# 4. Check agency-registry
print("\n[4] agency-registry 检查")
registry_path = os.path.join(dmas, "core/agency-registry/registry.json")
with open(registry_path, 'r', encoding='utf-8') as f:
    registry = json.load(f)
print(f"  Agent 数量: {len(registry)}")

# 5. Check multi-task-queue
print("\n[5] multi-task-queue 检查")
mtq_path = os.path.join(dmas, "core/multi-task-queue")
mtq_files = os.listdir(mtq_path)
py_files = [f for f in mtq_files if f.endswith('.js')]
print(f"  JS 文件: {len(py_files)}")

# 6. Check SKILL.md files
print("\n[6] SKILL.md 文件检查")
skill_md_count = 0
for root, dirs, files in os.walk(dmas):
    for f in files:
        if f == "SKILL.md":
            skill_md_count += 1
print(f"  SKILL.md 数量: {skill_md_count}")

# 7. Check verification-log
print("\n[7] verification-log.json 分析")
vlog = state_files.get("verification-log.json", {})
if vlog.get("valid"):
    data = vlog["data"]
    print(f"  总验证次数: {len(data)}")
    if data:
        recent = data[-1]
        print(f"  最近验证: {recent.get('timestamp', 'N/A')}")
        print(f"  结果: {recent.get('result', 'N/A')}")
        # Count by result
        results = {}
        for v in data:
            r = v.get("result", "unknown")
            results[r] = results.get(r, 0) + 1
        print(f"  结果分布: {results}")

# 8. Check alerts.json
print("\n[8] alerts.json 检查")
alerts_path = os.path.join(state_dir, "alerts.json")
with open(alerts_path, 'r', encoding='utf-8') as f:
    alerts = json.load(f)
active = alerts.get("activeAlerts", [])
if active:
    print(f"  ⚠️ 有 {len(active)} 个活跃告警:")
    for a in active:
        print(f"    - {a.get('type')}: {a.get('message', 'N/A')}")
else:
    print(f"  无活跃告警")

# 9. Check brain module
print("\n[9] brain 模块检查")
brain_path = os.path.join(dmas, "core/brain")
if os.path.exists(brain_path):
    brain_files = os.listdir(brain_path)
    print(f"  文件数: {len(brain_files)}")
    for f in brain_files:
        print(f"    {f}")
else:
    print("  目录不存在")

# 10. Check docs
print("\n[10] 文档完整性检查")
docs_path = os.path.join(dmas, "docs")
if os.path.exists(docs_path):
    doc_files = os.listdir(docs_path)
    print(f"  文档数: {len(doc_files)}")
    for f in sorted(doc_files):
        print(f"    {f}")
else:
    print("  目录不存在")

print("\n" + "=" * 60)
print("健康检查完成")
print("=" * 60)
