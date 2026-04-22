#!/usr/bin/env python3
"""
Pattern Matching System
根据任务描述匹配合适的 Pattern 并返回推荐 Agent
Usage: python pattern_match.py "任务描述"
"""
import json
import sys
import os

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
PATTERNS_DIR = os.path.join(WORKSPACE, "brain/patterns")

def load_triggers():
    triggers_path = os.path.join(PATTERNS_DIR, "pattern-triggers.json")
    with open(triggers_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def match_pattern(task_description, threshold=0.1):
    """根据任务描述匹配合适的 Pattern"""
    triggers = load_triggers()
    task_lower = task_description.lower()
    
    matches = []
    for pattern_type, config in triggers.items():
        score = 0
        matched_keywords = []
        for kw in config["keywords"]:
            if kw.lower() in task_lower:
                score += config["confidence_boost"]
                matched_keywords.append(kw)
        
        if score >= threshold:
            matches.append({
                "type": pattern_type,
                "agent": config["agent"],
                "score": score,
                "matched_keywords": matched_keywords
            })
    
    # 按分数排序
    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches

def get_pattern_details(pattern_type):
    """获取指定 Pattern 的详细信息"""
    patterns_dir = os.path.join(PATTERNS_DIR, f"{pattern_type}.md")
    if os.path.exists(patterns_dir):
        with open(patterns_dir, 'r', encoding='utf-8') as f:
            return f.read()
    
    # Find by scanning files
    for f in os.listdir(PATTERNS_DIR):
        if f.endswith('.md') and pattern_type in f:
            with open(os.path.join(PATTERNS_DIR, f), 'r', encoding='utf-8') as file:
                return file.read()
    return None

def increment_trigger_count(pattern_type):
    """增加 Pattern 的 trigger_count"""
    # This would update the pattern file's frontmatter
    # Implementation depends on how patterns are stored
    pass

def main():
    if len(sys.argv) < 2:
        print("Usage: python pattern_match.py <task_description>")
        print("Example: python pattern_match.py '帮我分析一下销售数据'")
        sys.exit(1)
    
    task = " ".join(sys.argv[1:])
    matches = match_pattern(task)
    
    print(f"任务: {task}")
    print(f"匹配到 {len(matches)} 个 Pattern:")
    for m in matches:
        print(f"  - {m['type']}: {m['agent']} (score={m['score']:.2f})")
        print(f"    匹配关键词: {', '.join(m['matched_keywords'])}")
    
    if matches:
        best = matches[0]
        print(f"\n推荐 Agent: {best['agent']} (类型: {best['type']})")

if __name__ == "__main__":
    main()
