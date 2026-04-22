#!/usr/bin/env python3
"""
Dreaming Mode - 增强版记忆整理
更全面地整理记忆、清理inbox、更新brain状态
"""
import json
import os
import re
from datetime import datetime

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
MEMORY_DIR = os.path.join(WORKSPACE, "memory")
BRAIN_DIR = os.path.join(WORKSPACE, "brain")
LEARNINGS_DIR = os.path.join(WORKSPACE, "learnings")

def now():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00")

def now_short():
    return datetime.now().strftime("%Y-%m-%d %H:%M")

def log(msg):
    print("[%s] %s" % (datetime.now().strftime("%H:%M:%S"), msg))

print("=" * 70)
print("* MOON * DREAMING MODE - Memory Organization")
print("=" * 70)

# ================================================================================
# 1. 读取今日记忆
# ================================================================================
log("Reading today's memory...")
today = datetime.now().strftime("%Y-%m-%d")
memory_path = os.path.join(MEMORY_DIR, "%s.md" % today)

if os.path.exists(memory_path):
    with open(memory_path, "r", encoding="utf-8") as f:
        memory_content = f.read()
    log("  Today's memory: %d lines" % len(memory_content.split("\n")))
else:
    memory_content = ""
    log("  Today's memory file does not exist")

# ================================================================================
# 2. 清理 inbox.md
# ================================================================================
log("Cleaning inbox...")
inbox_path = os.path.join(BRAIN_DIR, "inbox.md")
inbox_lines = []
archived_items = []

if os.path.exists(inbox_path):
    with open(inbox_path, "r", encoding="utf-8") as f:
        inbox_content = f.read()
    
    inbox_lines = inbox_content.split("\n")
    
    # 统计各优先级条目
    high_priority = sum(1 for l in inbox_lines if "\U0001f534" in l)  # red circle
    med_priority = sum(1 for l in inbox_lines if "\U0001f7e1" in l)  # yellow circle
    low_priority = sum(1 for l in inbox_lines if "\U0001f7e2" in l)  # green circle
    
    log("  Inbox status: HIGH=%d MED=%d LOW=%d" % (high_priority, med_priority, low_priority))
    
    # 统计已完成项目
    completed = [l for l in inbox_lines if re.match(r'-\s*\[x\]\s*~~', l)]
    if completed:
        log("  Completed items: %d" % len(completed))
        archived_items.extend(completed)

# ================================================================================
# 3. 更新 inbox.md 时间戳
# ================================================================================
log("Updating inbox timestamp...")
if inbox_lines:
    new_inbox = []
    for line in inbox_lines:
        if "\u6700\u540e\u66f4\u65b0" in line or "Last updated" in line:
            new_inbox.append("*Last updated: %s*" % now_short())
        else:
            new_inbox.append(line)
    
    with open(inbox_path, "w", encoding="utf-8") as f:
        f.write("\n".join(new_inbox))
    log("  inbox.md updated")

# ================================================================================
# 4. 检查 learnings/errors.json 状态变化
# ================================================================================
log("Checking learnings status...")
errors_path = os.path.join(LEARNINGS_DIR, "errors.json")
with open(errors_path, "r", encoding="utf-8-sig") as f:
    errors = json.load(f)

resolved = [e for e in errors if e.get("status") == "resolved"]
ongoing = [e for e in errors if e.get("status") == "ongoing"]
new_resolved = [e for e in resolved if "2026-04-22" in e.get("timestamp", "")]

log("  errors.json: %d resolved, %d ongoing" % (len(resolved), len(ongoing)))
if new_resolved:
    log("  Newly resolved today: %d" % len(new_resolved))
    for e in new_resolved:
        log("    - %s: %s" % (e.get("id"), e.get("error_type")))

# ================================================================================
# 5. 检查 brain/progress.json 状态
# ================================================================================
log("Checking progress.json...")
progress_path = os.path.join(BRAIN_DIR, "progress.json")
with open(progress_path, "r", encoding="utf-8-sig") as f:
    progress = json.load(f)

last_updated = progress.get("meta", {}).get("last_updated", "N/A")
current_task = progress.get("user_context", {}).get("current_task", "N/A")
log("  Last updated: %s" % last_updated)
log("  Current task: %s" % current_task)

# ================================================================================
# 6. 统计 memory/ 日记文件
# ================================================================================
log("Analyzing memory files...")
memory_files = [f for f in os.listdir(MEMORY_DIR) if f.startswith("2026-") and f.endswith(".md")]
memory_files.sort()
log("  Total memory files: %d" % len(memory_files))
log("  Latest: %s" % memory_files[-1] if memory_files else "N/A")
log("  Oldest: %s" % memory_files[0] if memory_files else "N/A")

recent_dates = memory_files[-7:] if len(memory_files) > 7 else memory_files
recent_sizes = []
for mf in recent_dates:
    mfp = os.path.join(MEMORY_DIR, mf)
    recent_sizes.append(os.path.getsize(mfp))

avg_size = sum(recent_sizes) / len(recent_sizes) / 1024 if recent_sizes else 0
log("  Recent 7-day avg size: %.1f KB" % avg_size)

# ================================================================================
# 7. 生成 Dreaming 摘要
# ================================================================================
log("Generating Dreaming summary...")

summary = """
## * MOON * Dreaming Summary - %s

### Memory Organization Results

| Item | Status | Value |
|------|--------|-------|
| Inbox Cleaned | OK | Updated timestamp |
| Inbox Status | HIGH=%d MED=%d LOW=%d | %d items total |
| errors.json | %d resolved / %d ongoing | New today: %d |
| Memory Files | %d total | Recent 7-day avg: %.1f KB |
| progress.json | OK | Current: %s |

### Inbox Summary

%s

### Completed Tasks

%s

### Next Dreaming TODO

- Archive completed inbox items when > 7 items
- Check if new lessons should be added to knowledge_graph
- Update pattern trigger_count if patterns were used

---
*Dreaming execution time: %s*
""" % (
    today,
    high_priority, med_priority, low_priority, len(inbox_lines),
    len(resolved), len(ongoing), len(new_resolved),
    len(memory_files), avg_size,
    current_task[:30] + "..." if len(current_task) > 30 else current_task,
    "inbox has %d pending items" % (high_priority + med_priority) if inbox_lines else "inbox is light",
    "none" if not archived_items else ", ".join(archived_items[:3]),
    now()
)

# ================================================================================
# 8. 追加到今日记忆
# ================================================================================
log("Appending to today's memory...")
if memory_content:
    memory_content += "\n" + summary
else:
    memory_content = "# %s Memory\n\n%s\n" % (today, summary)

with open(memory_path, "w", encoding="utf-8") as f:
    f.write(memory_content)
log("  Saved to memory/%s.md" % today)

# ================================================================================
# 9. 更新 dreaming.log
# ================================================================================
log("Updating dreaming.log...")
dreaming_log = os.path.join(MEMORY_DIR, "dreaming.log")
log_entry = "[%s] Dreaming completed - inbox:%d items, errors:%d resolved\n" % (
    datetime.now().isoformat(), len(inbox_lines), len(resolved))

if os.path.exists(dreaming_log):
    with open(dreaming_log, "a", encoding="utf-8") as f:
        f.write(log_entry)
else:
    with open(dreaming_log, "w", encoding="utf-8") as f:
        f.write(log_entry)

log("  Dreaming log updated")

# ================================================================================
# 完成
# ================================================================================
print("\n" + "=" * 70)
print("* MOON * DREAMING COMPLETE")
print("=" * 70)
print("""
OK Completed:
   - inbox.md timestamp updated
   - Today's memory saved
   - dreaming.log updated
   
STATUS:
   - inbox: %d items
   - errors: %d resolved / %d ongoing
   - Memory files: %d
   
* MOON * Next Dreaming will run automatically at 3 AM
""" % (len(inbox_lines), len(resolved), len(ongoing), len(memory_files)))
