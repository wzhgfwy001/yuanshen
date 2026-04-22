#!/usr/bin/env python3
"""阳神系统 BOM 修复"""
import json
import os

workspace = "C:/Users/DELL/.openclaw/workspace"
dmas = os.path.join(workspace, "skills/dynamic-multi-agent-system")

print("=" * 60)
print("阳神系统 BOM 修复")
print("=" * 60)

# Fix multi-task-queue.json
mtq_path = os.path.join(dmas, "state/multi-task-queue.json")
with open(mtq_path, "r", encoding="utf-8-sig") as f:
    data = json.load(f)
with open(mtq_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("multi-task-queue.json: BOM fixed")

# Fix alerts.json
alerts_path = os.path.join(dmas, "state/alerts.json")
with open(alerts_path, "r", encoding="utf-8-sig") as f:
    data = json.load(f)
print("alerts.json: type=%s, len=%s" % (type(data).__name__, len(data) if isinstance(data, list) else "N/A"))

if isinstance(data, list):
    new_data = {
        "activeAlerts": data,
        "history": [],
        "lastChecked": "2026-04-22T06:15:00+08:00"
    }
    with open(alerts_path, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    print("alerts.json: Converted to proper format (activeAlerts + history + lastChecked)")
else:
    print("alerts.json: Already in correct format")

print("\nBOM 修复完成!")
