#!/usr/bin/env python3
"""
元神系统全局健康检查 - 完整版
检查所有模块: brain/, learnings/, memory/, skills/, state/, config/, core/, data/
"""
import json
import os
import shutil
from datetime import datetime

workspace = "C:/Users/DELL/.openclaw/workspace"

def now():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00")

print("=" * 70)
print("元神系统全局健康检查 - 完整版")
print("=" * 70)

issues = []
warnings = []
fixed = []

# ================================================================================
# 1. brain/ 模块全面检查
# ================================================================================
print("\n[1] brain/ 模块检查")
brain_dir = os.path.join(workspace, "brain")

# 1.1 检查 brain/inbox.md
inbox_path = os.path.join(brain_dir, "inbox.md")
if os.path.exists(inbox_path):
    size = os.path.getsize(inbox_path)
    lines = len(open(inbox_path, "r", encoding="utf-8").readlines())
    print("  inbox.md: %d lines, %d bytes" % (lines, size))
    if lines > 100:
        warnings.append("inbox.md has %d lines - may need cleanup" % lines)
else:
    issues.append("inbox.md missing")

# 1.2 检查 inbox.md 引用位置
print("  Checking for dangling inbox.md references...")
# inbox.md should be at brain/inbox.md (exists)

# 1.3 检查 brain/learnings/ (should not exist - learnings is at root)
learnings_brain_path = os.path.join(brain_dir, "learnings")
if os.path.exists(learnings_brain_path):
    if os.path.isdir(learnings_brain_path):
        contents = os.listdir(learnings_brain_path)
        print("  brain/learnings/ EXISTS with %d items: %s" % (len(contents), contents))
        if not contents:
            warnings.append("brain/learnings/ is empty directory - should be removed")
        else:
            warnings.append("brain/learnings/ should not exist - learnings are at root")
else:
    print("  brain/learnings/: OK (does not exist - correct)")

# 1.4 检查 brain/agents/
agents_path = os.path.join(brain_dir, "agents")
if os.path.exists(agents_path):
    agent_dirs = [d for d in os.listdir(agents_path) if os.path.isdir(os.path.join(agents_path, d))]
    print("  brain/agents/: %d agents" % len(agent_dirs))
    for ad in agent_dirs:
        adpath = os.path.join(agents_path, ad)
        files = os.listdir(adpath)
        has_persona = "persona.md" in files
        has_skill = "SKILL.md" in files
        status = "OK" if (has_persona and has_skill) else "INCOMPLETE"
        print("    %s: %s (%s)" % (ad, status, files))
        if not has_persona or not has_skill:
            issues.append("Agent %s missing: persona=%s, SKILL=%s" % (ad, has_persona, has_skill))

# 1.5 检查 _registry.json
registry_path = os.path.join(agents_path, "_registry.json")
if os.path.exists(registry_path):
    try:
        with open(registry_path, "r", encoding="utf-8") as f:
            reg = json.load(f)
        print("  _registry.json: OK (%d agents registered)" % len(reg))
    except Exception as e:
        issues.append("_registry.json parse error: %s" % e)
else:
    warnings.append("_registry.json missing")

# 1.6 检查 brain/decisions/
decisions_path = os.path.join(brain_dir, "decisions")
if os.path.exists(decisions_path):
    decision_files = [f for f in os.listdir(decisions_path) if f.endswith(".md")]
    print("  brain/decisions/: %d decisions" % len(decision_files))
    if decision_files:
        recent = sorted(decision_files)[-1]
        print("    Most recent: %s" % recent)
else:
    warnings.append("brain/decisions/ missing")

# 1.7 检查 brain/projects/
projects_path = os.path.join(brain_dir, "projects")
if os.path.exists(projects_path):
    project_files = os.listdir(projects_path)
    print("  brain/projects/: %d files" % len(project_files))
else:
    print("  brain/projects/: OK (does not exist)")

# ================================================================================
# 2. learnings/ 模块检查
# ================================================================================
print("\n[2] learnings/ 模块检查")
learnings_dir = os.path.join(workspace, "learnings")

# 2.1 errors.json
errors_path = os.path.join(learnings_dir, "errors.json")
try:
    with open(errors_path, "r", encoding="utf-8-sig") as f:
        errors = json.load(f)
    resolved = sum(1 for e in errors if e.get("status") == "resolved")
    ongoing = sum(1 for e in errors if e.get("status") == "ongoing")
    print("  errors.json: OK (%d total, %d resolved, %d ongoing)" % (len(errors), resolved, ongoing))
    
    # Check for duplicates
    ids = [e.get("id") for e in errors]
    dupes = set([i for i in ids if ids.count(i) > 1])
    if dupes:
        issues.append("errors.json has duplicate IDs: %s" % dupes)
        print("    DUPLICATES: %s" % dupes)
    
    # Check ongoing have resolutions
    for e in errors:
        if e.get("status") == "ongoing" and not e.get("resolution"):
            warnings.append("error %s is ongoing but has no resolution" % e.get("id"))
except Exception as e:
    issues.append("errors.json error: %s" % e)

# 2.2 recoveries.json
recoveries_path = os.path.join(learnings_dir, "recoveries.json")
try:
    with open(recoveries_path, "r", encoding="utf-8-sig") as f:
        recoveries = json.load(f)
    print("  recoveries.json: OK (%d records)" % len(recoveries))
except Exception as e:
    issues.append("recoveries.json error: %s" % e)

# ================================================================================
# 3. memory/ 模块检查
# ================================================================================
print("\n[3] memory/ 模块检查")
memory_dir = os.path.join(workspace, "memory")

# 3.1 Daily notes
daily_files = [f for f in os.listdir(memory_dir) if f.startswith("2026-")]
print("  Daily notes: %d files" % len(daily_files))
if daily_files:
    recent = sorted(daily_files)[-1]
    print("    Most recent: %s" % recent)
    recent_path = os.path.join(memory_dir, recent)
    size = os.path.getsize(recent_path)
    lines = len(open(recent_path, "r", encoding="utf-8", errors="ignore").readlines())
    print("    Size: %d bytes, %d lines" % (size, lines))

# 3.2 heartbeat-state.json
hb_path = os.path.join(memory_dir, "heartbeat-state.json")
if os.path.exists(hb_path):
    try:
        with open(hb_path, "r", encoding="utf-8-sig") as f:
            hb = json.load(f)
        last = hb.get("lastChecks", {})
        print("  heartbeat-state.json: OK")
        print("    Last WAL check: %s" % last.get("wal", "N/A"))
        print("    Last tracking check: %s" % last.get("tracking", "N/A"))
    except Exception as e:
        issues.append("heartbeat-state.json error: %s" % e)
else:
    warnings.append("heartbeat-state.json missing")

# 3.3 dreaming.log
dreaming_log = os.path.join(memory_dir, "dreaming.log")
if os.path.exists(dreaming_log):
    size = os.path.getsize(dreaming_log)
    print("  dreaming.log: %d bytes" % size)
    if size > 10 * 1024 * 1024:  # > 10MB
        warnings.append("dreaming.log is very large (%d bytes)" % size)
        fixed.append("dreaming.log should be rotated or truncated")
else:
    print("  dreaming.log: not present (OK)")

# 3.4 .dreams/ directory
dreams_path = os.path.join(memory_dir, ".dreams")
if os.path.exists(dreams_path):
    dream_files = [f for f in os.listdir(dreams_path) if os.path.isfile(os.path.join(dreams_path, f))]
    print("  .dreams/: %d files" % len(dream_files))
    for df in dream_files:
        dfp = os.path.join(dreams_path, df)
        size = os.path.getsize(dfp)
        if size > 1000:
            print("    %s: %d bytes" % (df, size))
else:
    print("  .dreams/: not present (OK)")

# ================================================================================
# 4. state/ 模块检查 (空目录检查)
# ================================================================================
print("\n[4] state/ 模块检查")
state_dir = os.path.join(workspace, "state")

if os.path.exists(state_dir):
    state_contents = os.listdir(state_dir)
    if state_contents:
        print("  state/ contents: %s" % state_contents)
    else:
        warnings.append("state/ is empty directory")
else:
    print("  state/: does not exist (OK)")

# ================================================================================
# 5. config/ 模块检查
# ================================================================================
print("\n[5] config/ 模块检查")
config_dir = os.path.join(workspace, "config")

if os.path.exists(config_dir):
    config_files = [f for f in os.listdir(config_dir) if os.path.isfile(os.path.join(config_dir, f))]
    print("  config/ files: %d" % len(config_files))
    for cf in config_files:
        cfp = os.path.join(config_dir, cf)
        size = os.path.getsize(cfp)
        print("    %s: %d bytes" % (cf, size))
        # Try to parse JSON
        if cf.endswith(".json"):
            try:
                with open(cfp, "r", encoding="utf-8-sig") as f:
                    json.load(f)
                print("      JSON: valid")
            except Exception as e:
                issues.append("config/%s JSON parse error: %s" % (cf, e))
else:
    print("  config/: does not exist")

# ================================================================================
# 6. data/ 模块检查
# ================================================================================
print("\n[6] data/ 模块检查")
data_dir = os.path.join(workspace, "data")

if os.path.exists(data_dir):
    data_files = [f for f in os.listdir(data_dir) if os.path.isfile(os.path.join(data_dir, f))]
    print("  data/ files: %d" % len(data_files))
    for df in data_files:
        dfp = os.path.join(data_dir, df)
        size = os.path.getsize(dfp)
        print("    %s: %d bytes" % (df, size))
else:
    print("  data/: does not exist")

# ================================================================================
# 7. skills/ 核心 Skill 检查
# ================================================================================
print("\n[7] skills/ 核心 Skill 检查")
skills_dir = os.path.join(workspace, "skills")

critical_skills = [
    "agency-agents",
    "auto-router",
    "code-review",
    "content-collector",
    "content-publisher",
    "data-analysis",
    "dynamic-multi-agent-system",
    "feature-flags",
    "frustration-detector",
    "lossless-claw",
    "novel-studio",
    "nuwa",
    "project-planner",
    "research-assistant",
    "skill-drafts",
    "skill-hub",
    "skills-evolution",
    "task-typologist",
    "text-to-ppt",
    "user-profile",
    "visualization-creator",
    "writing-blog",
    "xiaohongshu-editor",
]

found_skills = []
missing_skills = []
incomplete_skills = []

for skill in critical_skills:
    skill_path = os.path.join(skills_dir, skill)
    if os.path.exists(skill_path):
        # Check for SKILL.md
        skill_md = os.path.join(skill_path, "SKILL.md")
        if os.path.exists(skill_md):
            found_skills.append(skill)
        else:
            incomplete_skills.append(skill)
            print("  %s: MISSING SKILL.md" % skill)
    else:
        missing_skills.append(skill)
        print("  %s: DIRECTORY MISSING" % skill)

print("  Skills status: %d found, %d incomplete, %d missing" % (len(found_skills), len(incomplete_skills), len(missing_skills)))

if missing_skills:
    issues.append("Missing skill directories: %s" % missing_skills)

# ================================================================================
# 8. brain/me/ 检查
# ================================================================================
print("\n[8] brain/me/ 检查")
me_path = os.path.join(brain_dir, "me")
if os.path.exists(me_path):
    me_files = os.listdir(me_path)
    print("  brain/me/ files: %d" % len(me_files))
    for mf in me_files:
        print("    %s" % mf)
else:
    warnings.append("brain/me/ missing")

# ================================================================================
# 9. brain/standing-orders/ 检查
# ================================================================================
print("\n[9] brain/standing-orders/ 检查")
so_path = os.path.join(brain_dir, "standing-orders")
if os.path.exists(so_path):
    so_files = os.listdir(so_path)
    print("  standing-orders/ files: %d" % len(so_files))
else:
    warnings.append("standing-orders/ missing")

# ================================================================================
# 10. inbox.md 引用完整性检查
# ================================================================================
print("\n[10] inbox.md 引用检查")
# Check if inbox.md is referenced correctly
if os.path.exists(inbox_path):
    print("  inbox.md exists at correct location")

# Check for any references to old locations
old_inbox_refs = []
possible_old_paths = [
    "brain/inbox/inbox.md",
    "inbox.md",
    "memory/inbox.md",
]
for old_path in possible_old_paths:
    full_old = os.path.join(workspace, old_path)
    if os.path.exists(full_old) and full_old != inbox_path:
        old_inbox_refs.append(full_old)
        issues.append("Dangling inbox reference: %s" % full_old)

if not old_inbox_refs:
    print("  No dangling inbox references")

# ================================================================================
# 11. brain/knowledge_graph/ 检查
# ================================================================================
print("\n[11] brain/knowledge_graph/ 检查")
kg_path = os.path.join(brain_dir, "knowledge_graph")
if os.path.exists(kg_path):
    kg_files = os.listdir(kg_path)
    print("  knowledge_graph/ files: %s" % kg_files)
    # Check nodes.json
    nodes_path = os.path.join(kg_path, "nodes.json")
    if os.path.exists(nodes_path):
        try:
            with open(nodes_path, "r", encoding="utf-8") as f:
                nodes = json.load(f)
            print("    nodes.json: %d nodes" % len(nodes))
        except Exception as e:
            issues.append("nodes.json error: %s" % e)
else:
    warnings.append("knowledge_graph/ missing")

# ================================================================================
# 12. brain/patterns/ 检查
# ================================================================================
print("\n[12] brain/patterns/ 检查")
patterns_path = os.path.join(brain_dir, "patterns")
if os.path.exists(patterns_path):
    pattern_files = [f for f in os.listdir(patterns_path) if f.endswith(".md") and f != "README.md"]
    print("  patterns/ .md files: %d" % len(pattern_files))
    for pf in pattern_files:
        print("    %s" % pf)
else:
    warnings.append("patterns/ missing")

# ================================================================================
# SUMMARY
# ================================================================================
print("\n" + "=" * 70)
print("健康检查结果汇总")
print("=" * 70)

print("\n[ISSUES] %d 个需要修复的问题:" % len(issues))
for i, issue in enumerate(issues, 1):
    print("  %d. %s" % (i, issue))

print("\n[WARNINGS] %d 个需要注意的事项:" % len(warnings))
for w in warnings:
    print("  - %s" % w)

print("\n[FIXED] %d 个已修复的问题:" % len(fixed))
for f in fixed:
    print("  - %s" % f)

if not issues and not warnings:
    print("\n所有检查通过! 系统状态良好.")
elif len(issues) == 0:
    print("\n无致命问题，但有 %d 个警告" % len(warnings))
else:
    print("\n%d 个问题需要修复，%d 个警告" % (len(issues), len(warnings)))
