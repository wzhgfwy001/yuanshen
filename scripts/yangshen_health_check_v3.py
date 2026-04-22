#!/usr/bin/env python3
"""阳神系统完整健康检查 v3"""
import json
import os

workspace = "C:/Users/DELL/.openclaw/workspace"
dmas = os.path.join(workspace, "skills/dynamic-multi-agent-system")

print("=" * 60)
print("YangShen System Health Check v3")
print("=" * 60)

issues = []
warnings = []

# 1. Check state files
print("\n[1] State Files Check")
state_dir = os.path.join(dmas, "state")
critical_files = [
    "skill-counters.json",
    "skill-patterns.json", 
    "experience-db.json",
    "verification-log.json",
    "feedback-stats.json",
    "multi-task-queue.json",
    "alerts.json"
]

for fname in critical_files:
    path = os.path.join(state_dir, fname)
    if not os.path.exists(path):
        print("  %s: MISSING" % fname)
        issues.append("Missing file: %s" % fname)
    elif os.path.isdir(path):
        print("  %s: IS DIRECTORY" % fname)
        issues.append("Is directory: %s" % fname)
    else:
        size = os.path.getsize(path)
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                json.load(f)
            print("  %s: OK" % fname)
        except Exception as e:
            print("  %s: ERROR - %s" % (fname, e))
            issues.append("File format error: %s" % fname)

# 2. skill-counters.json
print("\n[2] skill-counters.json Analysis")
counters_path = os.path.join(state_dir, "skill-counters.json")
with open(counters_path, "r", encoding="utf-8-sig") as f:
    counters = json.load(f)
total = counters.get("totalTasks", 0)
skills_used = len(counters.get("skillsUsed", {}))
print("  totalTasks: %d" % total)
print("  skillsUsed: %d" % skills_used)
if total == 0:
    warnings.append("tracker.totalTasks is 0 - tracking may not be working")
if skills_used == 0:
    warnings.append("No skills tracked in skillsUsed")

# 3. category-validation-tracker.json
print("\n[3] category-validation-tracker.json")
tracker_path = os.path.join(dmas, "core/subagent-manager/category-validation-tracker.json")
with open(tracker_path, "r", encoding="utf-8-sig") as f:
    tracker = json.load(f)
stats = tracker.get("stats", {})
total_vt = stats.get("totalTasks", 0)
print("  stats.totalTasks: %d" % total_vt)
if total_vt == 0:
    warnings.append("category-validation-tracker.totalTasks is 0")

# 4. agency-registry
print("\n[4] agency-registry")
registry_path = os.path.join(dmas, "core/agency-registry")
if os.path.exists(registry_path):
    reg_files = os.listdir(registry_path)
    print("  Files: %s" % len(reg_files))
    ts_files = [f for f in reg_files if f.endswith('.ts')]
    print("  TypeScript files: %d" % len(ts_files))
    # Check loader.ts for agent count
    loader_path = os.path.join(registry_path, "loader.ts")
    if os.path.exists(loader_path):
        with open(loader_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Estimate agent count from file
        print("  loader.ts size: %d bytes" % len(content))
else:
    print("  agency-registry directory not found")
    issues.append("agency-registry directory missing")

# 5. Core SKILL.md coverage
print("\n[5] Core SKILL.md Coverage")
core_skills = [
    "task-classifier", "task-decomposer", "subagent-manager",
    "quality-checker", "skill-evolution", "resource-cleaner"
]
found_skills = []
missing_skills = []
for skill in core_skills:
    skill_path = os.path.join(dmas, "core", skill, "SKILL.md")
    if os.path.exists(skill_path):
        found_skills.append(skill)
    else:
        missing_skills.append(skill)

print("  Found: %d/%d" % (len(found_skills), len(core_skills)))
if missing_skills:
    print("  Missing: %s" % missing_skills)
    warnings.append("Missing SKILL.md: %s" % missing_skills)

# 6. verification-log
print("\n[6] verification-log.json")
vlog_path = os.path.join(state_dir, "verification-log.json")
with open(vlog_path, "r", encoding="utf-8-sig") as f:
    vlog = json.load(f)
print("  Total verifications: %d" % len(vlog))
if vlog:
    recent = vlog[-1]
    print("  Last: %s" % recent.get("timestamp", "N/A"))
    results = {}
    for v in vlog:
        r = v.get("result", "unknown")
        results[r] = results.get(r, 0) + 1
    print("  Results: %s" % results)

# 7. alerts.json
print("\n[7] alerts.json")
alerts_path = os.path.join(state_dir, "alerts.json")
with open(alerts_path, "r", encoding="utf-8-sig") as f:
    alerts = json.load(f)
active = alerts.get("activeAlerts", [])
print("  Active alerts: %d" % len(active))
if active:
    for a in active:
        print("    Alert: %s" % a.get("type", "N/A"))
        issues.append("Active alert: %s" % a.get("type", "N/A"))

# 8. feedback-stats
print("\n[8] feedback-stats.json")
fb_path = os.path.join(state_dir, "feedback-stats.json")
with open(fb_path, "r", encoding="utf-8-sig") as f:
    fb = json.load(f)
print("  totalFeedback: %d" % fb.get("totalFeedback", 0))
print("  avgSatisfaction: %.2f" % fb.get("avgSatisfaction", 0))

# 9. brain module
print("\n[9] brain Module")
brain_path = os.path.join(dmas, "core/brain")
if os.path.exists(brain_path):
    brain_files = os.listdir(brain_path)
    print("  Files: %d" % len(brain_files))
else:
    print("  brain module directory missing")
    warnings.append("brain module directory missing")

# 10. docs
print("\n[10] docs")
docs_path = os.path.join(dmas, "docs")
if os.path.exists(docs_path):
    doc_files = os.listdir(docs_path)
    print("  Docs count: %d" % len(doc_files))
else:
    print("  docs directory missing")
    warnings.append("docs directory missing")

# 11. experience-db
print("\n[11] experience-db.json")
exp_path = os.path.join(state_dir, "experience-db.json")
with open(exp_path, "r", encoding="utf-8-sig") as f:
    exp = json.load(f)
print("  Experience count: %d" % len(exp))
if exp:
    first_key = list(exp.keys())[0]
    print("  Sample type: %s" % exp[first_key].get("type", "N/A"))

# 12. multi-task-queue
print("\n[12] multi-task-queue.json")
mtq_path = os.path.join(state_dir, "multi-task-queue.json")
with open(mtq_path, "r", encoding="utf-8-sig") as f:
    mtq = json.load(f)
queue = mtq.get("queue", [])
print("  Queue length: %d" % len(queue))

# Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("\n[ISSUES] %d issues:" % len(issues))
for issue in issues:
    print("  - %s" % issue)

print("\n[WARNINGS] %d warnings:" % len(warnings))
for w in warnings:
    print("  - %s" % w)

if not issues and not warnings:
    print("\nAll checks passed!")
elif len(issues) == 0:
    print("\nNo issues, but %d warnings" % len(warnings))
else:
    print("\n%d issues, %d warnings" % (len(issues), len(warnings)))
