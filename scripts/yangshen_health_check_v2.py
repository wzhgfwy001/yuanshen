#!/usr/bin/env python3
"""阳神系统完整健康检查 v2"""
import json
import os

workspace = "C:/Users/DELL/.openclaw/workspace"
dmas = os.path.join(workspace, "skills/dynamic-multi-agent-system")

print("=" * 60)
print("阳神系统完整健康检查 v2")
print("=" * 60)

issues = []
warnings = []

# 1. Check state files
print("\n[1] State 文件检查")
state_dir = os.path.join(dmas, "state")
critical_files = [
    "skill-counters.json",
    "skill-patterns.json", 
    "experience-db.json",
    "verification-log.json",
    "category-validation-tracker.json",
    "feedback-stats.json",
    "multi-task-queue.json",
    "alerts.json"
]

for fname in critical_files:
    path = os.path.join(state_dir, fname)
    if not os.path.exists(path):
        print("  %s: MISSING" % fname)
        issues.append("缺少文件: %s" % fname)
    elif os.path.isdir(path):
        print("  %s: IS DIRECTORY" % fname)
        issues.append("是目录而非文件: %s" % fname)
    else:
        size = os.path.getsize(path)
        try:
            # Try utf-8-sig first (for BOM files)
            with open(path, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
            print("  %s: OK (%d bytes)" % (fname, size))
        except Exception as e:
            print("  %s: ERROR - %s" % (fname, e))
            issues.append("文件格式错误: %s - %s" % (fname, e))

# 2. skill-counters.json content
print("\n[2] skill-counters.json 内容分析")
counters_path = os.path.join(state_dir, "skill-counters.json")
with open(counters_path, "r", encoding="utf-8-sig") as f:
    counters = json.load(f)
total = counters.get("totalTasks", 0)
skills_used = len(counters.get("skillsUsed", {}))
print("  Total tasks: %d" % total)
print("  Skills used: %d" % skills_used)
if total == 0:
    print("  [WARNING] totalTasks is 0 - tracker may not be working")
    warnings.append("tracker.totalTasks 为 0")
if skills_used == 0:
    print("  [WARNING] No skills have been tracked")
    warnings.append("没有追踪到任何 skill 使用")

# 3. category-validation-tracker.json
print("\n[3] category-validation-tracker.json 内容")
tracker_path = os.path.join(dmas, "core/subagent-manager/category-validation-tracker.json")
with open(tracker_path, "r", encoding="utf-8-sig") as f:
    tracker = json.load(f)
stats = tracker.get("stats", {})
total_vt = stats.get("totalTasks", 0)
last_updated = stats.get("lastUpdated", "N/A")
print("  Total tasks: %d" % total_vt)
print("  Last updated: %s" % last_updated)
if total_vt == 0:
    print("  [WARNING] totalTasks is 0 - validation tracking not working")
    warnings.append("category-validation-tracker.totalTasks 为 0")

# 4. Check agency-registry
print("\n[4] agency-registry 检查")
registry_path = os.path.join(dmas, "core/agency-registry/registry.json")
with open(registry_path, "r", encoding="utf-8-sig") as f:
    registry = json.load(f)
print("  Agent 数量: %d" % len(registry))

# 5. Check SKILL.md coverage
print("\n[5] SKILL.md 覆盖检查")
skill_md_count = 0
core_skills = [
    "task-classifier", "task-decomposer", "subagent-manager",
    "quality-checker", "skill-evolution", "resource-cleaner"
]
missing_skills = []
for skill in core_skills:
    skill_path = os.path.join(dmas, "core", skill, "SKILL.md")
    if os.path.exists(skill_path):
        skill_md_count += 1
    else:
        missing_skills.append(skill)
        print("  Missing SKILL.md: %s" % skill)

# Count all SKILL.md files
total_skills = 0
for root, dirs, files in os.walk(dmas):
    for f in files:
        if f == "SKILL.md":
            total_skills += 1
print("  Core SKILL.md found: %d/%d" % (skill_md_count, len(core_skills)))
print("  Total SKILL.md in DMAS: %d" % total_skills)

# 6. verification-log analysis
print("\n[6] verification-log.json 分析")
vlog_path = os.path.join(state_dir, "verification-log.json")
with open(vlog_path, "r", encoding="utf-8-sig") as f:
    vlog = json.load(f)
print("  Total verifications: %d" % len(vlog))
if vlog:
    recent = vlog[-1]
    print("  Last verification: %s" % recent.get("timestamp", "N/A"))
    print("  Result: %s" % recent.get("result", "N/A"))
    # Count by result
    results = {}
    for v in vlog:
        r = v.get("result", "unknown")
        results[r] = results.get(r, 0) + 1
    print("  Result distribution: %s" % results)

# 7. alerts.json analysis
print("\n[7] alerts.json 检查")
alerts_path = os.path.join(state_dir, "alerts.json")
with open(alerts_path, "r", encoding="utf-8-sig") as f:
    alerts = json.load(f)
active = alerts.get("activeAlerts", [])
history = alerts.get("history", [])
print("  Active alerts: %d" % len(active))
print("  History count: %d" % len(history))
if active:
    print("  [WARNING] Active alerts exist:")
    for a in active:
        print("    - %s: %s" % (a.get("type", "N/A"), a.get("message", "N/A")))
        issues.append("活跃告警: %s" % a.get("type", "N/A"))

# 8. feedback-stats.json analysis
print("\n[8] feedback-stats.json 检查")
fb_path = os.path.join(state_dir, "feedback-stats.json")
with open(fb_path, "r", encoding="utf-8-sig") as f:
    fb = json.load(f)
total_feedback = fb.get("totalFeedback", 0)
avg_satisfaction = fb.get("avgSatisfaction", 0)
print("  Total feedback: %d" % total_feedback)
print("  Avg satisfaction: %.2f" % avg_satisfaction)

# 9. Check brain module
print("\n[9] brain 模块检查")
brain_path = os.path.join(dmas, "core/brain")
if os.path.exists(brain_path):
    brain_files = os.listdir(brain_path)
    print("  Files: %d" % len(brain_files))
    for f in brain_files:
        print("    %s" % f)
else:
    print("  [WARNING] brain module directory missing")
    warnings.append("brain 模块目录不存在")

# 10. Check docs completeness
print("\n[10] docs 检查")
docs_path = os.path.join(dmas, "docs")
if os.path.exists(docs_path):
    doc_files = os.listdir(docs_path)
    print("  文档数: %d" % len(doc_files))
else:
    print("  [WARNING] docs directory missing")
    warnings.append("docs 目录不存在")

# 11. Check experience-db
print("\n[11] experience-db.json 检查")
exp_path = os.path.join(state_dir, "experience-db.json")
with open(exp_path, "r", encoding="utf-8-sig") as f:
    exp = json.load(f)
print("  经验数: %d" % len(exp))
if exp:
    first_key = list(exp.keys())[0]
    first_exp = exp[first_key]
    print("  Sample type: %s" % first_exp.get("type", "N/A"))

# 12. Check multi-task-queue state
print("\n[12] multi-task-queue.json 队列状态")
mtq_path = os.path.join(state_dir, "multi-task-queue.json")
with open(mtq_path, "r", encoding="utf-8-sig") as f:
    mtq = json.load(f)
queue = mtq.get("queue", [])
scheduled = mtq.get("scheduler", {})
print("  Queue length: %d" % len(queue))
print("  Scheduled tasks: %d" % len(scheduled))

# Summary
print("\n" + "=" * 60)
print("阳神系统健康检查结果")
print("=" * 60)
print("\n[ISSUES] 需要修复的问题 (%d):" % len(issues))
for issue in issues:
    print("  - %s" % issue)

print("\n[WARNINGS] 需要关注的事项 (%d):" % len(warnings))
for w in warnings:
    print("  - %s" % w)

print("\n[STATUS]")
if len(issues) == 0 and len(warnings) == 0:
    print("  所有检查通过!")
elif len(issues) == 0:
    print("  有 %d 个警告，但无致命问题" % len(warnings))
else:
    print("  有 %d 个问题需要修复，%d 个警告" % (len(issues), len(warnings)))
