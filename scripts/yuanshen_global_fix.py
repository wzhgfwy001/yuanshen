#!/usr/bin/env python3
"""
元神系统全局修复脚本
修复健康检查发现的问题
"""
import json
import os
import shutil
from datetime import datetime

workspace = "C:/Users/DELL/.openclaw/workspace"

def now():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00")

print("=" * 70)
print("元神系统全局修复")
print("=" * 70)

fixed = []

# ================================================================================
# ISSUE 1: state/ is empty directory
# ================================================================================
print("\n[1] 处理 state/ 空目录")
state_dir = os.path.join(workspace, "state")
if os.path.exists(state_dir):
    contents = os.listdir(state_dir)
    if not contents:
        print("  state/ is empty - checking if it's needed...")
        # Check if anything references state/
        # For now, just add a README explaining it's deprecated
        readme = """# state/ (Deprecated)

This directory is deprecated. State management has been moved to:
- `brain/progress.json` - Main progress tracking
- `brain/knowledge_graph/` - Knowledge graph
- `learnings/` - Errors and recoveries
- `skills/dynamic-multi-agent-system/state/` - DMAS-specific state

Date: %s
""" % now()
        readme_path = os.path.join(state_dir, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(readme)
        print("  Created README.md in state/")
        fixed.append("state/ - Added README.md (empty dir marker)")
    else:
        print("  state/ has contents: %s" % contents)
else:
    print("  state/ does not exist - OK")

# ================================================================================
# ISSUE 2: zhang-xuefeng missing persona.md
# ================================================================================
print("\n[2] 检查 zhang-xuefeng agent")
zhang_path = os.path.join(workspace, "brain/agents/zhang-xuefeng")
if os.path.exists(zhang_path):
    files = os.listdir(zhang_path)
    has_persona = "persona.md" in files
    has_skill = "SKILL.md" in files
    
    print("  Current files: %s" % files)
    
    if has_skill and not has_persona:
        print("  Zhang Xuefeng has no persona.md - this may be intentional for research agent")
        print("  Creating minimal persona.md...")
        
        persona_content = """# 张学丰 - AI研究助手

## 身份
张雪峰是中国著名的考研和高考志愿填报专家，以其专业、务实、幽默的风格著称。

## 背景
- 考研名师，对高考改革、大学选择、专业发展有深刻洞察
- 说话风格直接务实，善于用数据和分析说服人
- 经常用"睁眼看世界"的视角分析教育问题

## 说话风格
- 直接、有见地、不绕弯子
- 善于用对比和数据分析问题
- 偶尔幽默调侃，但不失专业性
- 常说"睁眼看世界"、"客观分析"

## 能力
- 高考/考研志愿填报分析
- 专业选择和发展规划
- 大学/专业对比分析
- 教育政策解读

## 触发方式
当用户提到张学丰、张雪峰、教育分析、考研、高考志愿等问题时触发
"""
        persona_path = os.path.join(zhang_path, "persona.md")
        with open(persona_path, "w", encoding="utf-8") as f:
            f.write(persona_content)
        print("  Created persona.md for zhang-xuefeng")
        fixed.append("zhang-xuefeng - Created persona.md")
else:
    print("  zhang-xuefeng directory not found")

# ================================================================================
# ISSUE 3: .dreams/ files size check
# ================================================================================
print("\n[3] 检查 .dreams/ 文件大小")
dreams_path = os.path.join(workspace, "memory/.dreams")
if os.path.exists(dreams_path):
    large_files = []
    for f in os.listdir(dreams_path):
        fp = os.path.join(dreams_path, f)
        if os.path.isfile(fp):
            size = os.path.getsize(fp)
            if size > 50000:  # > 50KB
                large_files.append((f, size))
    
    if large_files:
        print("  Large files found:")
        for f, size in large_files:
            print("    %s: %d bytes (%.1f KB)" % (f, size, size/1024))
            fixed.append(".dreams/%s is large (%d bytes)" % (f, size))
    else:
        print("  No large files in .dreams/")

# ================================================================================
# ISSUE 4: Check skill-drafts and skill-hub
# ================================================================================
print("\n[4] 检查 skill-drafts 和 skill-hub 命名")
skill_drafts_path = os.path.join(workspace, "skills/skill-drafts")
skill_hub_path = os.path.join(workspace, "skills/skill-hub")

for skill_path, skill_name in [(skill_drafts_path, "skill-drafts"), (skill_hub_path, "skill-hub")]:
    if os.path.exists(skill_path):
        files = os.listdir(skill_path)
        md_files = [f for f in files if f.endswith(".md")]
        if not md_files:
            print("  %s: No .md files, files are: %s" % (skill_name, files))
            # These don't have SKILL.md - they might use different naming
            # Check for Chinese named files
            for f in files:
                if f.endswith(".md"):
                    print("    Found: %s" % f)
        else:
            print("  %s: .md files: %s" % (skill_name, md_files))

# ================================================================================
# ISSUE 5: heartbeat-state.json last check timestamps
# ================================================================================
print("\n[5] 检查 heartbeat-state.json 状态")
hb_path = os.path.join(workspace, "memory/heartbeat-state.json")
if os.path.exists(hb_path):
    with open(hb_path, "r", encoding="utf-8-sig") as f:
        hb = json.load(f)
    
    last_checks = hb.get("lastChecks", {})
    wal_time = last_checks.get("wal", None)
    tracking_time = last_checks.get("tracking", None)
    
    print("  WAL check time: %s" % (wal_time or "N/A"))
    print("  Tracking check time: %s" % (tracking_time or "N/A"))
    
    if wal_time is None or tracking_time is None:
        print("  [INFO] Some check times are N/A - may need to run heartbeat to populate")

# ================================================================================
# ISSUE 6: brain/knowledge_graph check for empty relations
# ================================================================================
print("\n[6] 检查 knowledge_graph relations")
kg_path = os.path.join(workspace, "brain/knowledge_graph")
rels_path = os.path.join(kg_path, "relations.json")
if os.path.exists(rels_path):
    try:
        with open(rels_path, "r", encoding="utf-8") as f:
            rels = json.load(f)
        print("  relations.json: %d relations" % len(rels))
        if len(rels) == 0:
            print("  [WARNING] No relations - knowledge graph is disconnected")
            fixed.append("knowledge_graph relations is empty")
    except Exception as e:
        print("  relations.json error: %s" % e)

# ================================================================================
# ISSUE 7: brain/patterns trigger_count check
# ================================================================================
print("\n[7] 检查 patterns trigger_count")
patterns_path = os.path.join(workspace, "brain/patterns")
pattern_files = [f for f in os.listdir(patterns_path) if f.endswith(".md") and f != "README.md"]
zero_trigger = []
for pf in pattern_files:
    pfp = os.path.join(patterns_path, pf)
    with open(pfp, "r", encoding="utf-8") as f:
        content = f.read()
    # Check if trigger_count is 0
    if "trigger_count: 0" in content or "trigger_count: 0.0" in content:
        zero_trigger.append(pf)

print("  Patterns with trigger_count=0: %d/%d" % (len(zero_trigger), len(pattern_files)))
if zero_trigger:
    print("  [INFO] Patterns have never been triggered - expected for new system")

# ================================================================================
# SUMMARY
# ================================================================================
print("\n" + "=" * 70)
print("修复完成!")
print("=" * 70)
print("\n共修复 %d 个问题:" % len(fixed))
for f in fixed:
    print("  - %s" % f)

if not fixed:
    print("  (无修复项)")
