#!/usr/bin/env python3
"""
Lesson Lookup System
根据错误类型查找相关教训
Usage: python lesson_lookup.py <error_type>
Usage: python lesson_lookup.py --all
"""
import json
import sys
import os

WORKSPACE = "C:/Users/DELL/.openclaw/workspace"
LESSONS_INDEX = os.path.join(WORKSPACE, "scripts/lesson_lookup.json")
ERRORS_PATH = os.path.join(WORKSPACE, "learnings/errors.json")
LESSONS_DIR = os.path.join(WORKSPACE, "brain/lessons")

def load_lessons_index():
    with open(LESSONS_INDEX, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_errors():
    with open(ERRORS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def lookup_by_error_type(error_type):
    """根据错误类型查找教训"""
    lessons = load_lessons_index()
    errors = load_errors()
    
    matches = []
    for eid, lesson in lessons.items():
        if error_type.lower() in lesson["error_type"].lower():
            matches.append((eid, lesson))
    
    return matches

def lookup_by_keyword(keyword):
    """根据关键词查找教训"""
    lessons = load_lessons_index()
    errors = load_errors()
    
    matches = []
    for eid, lesson in lessons.items():
        if (keyword.lower() in lesson["error_type"].lower() or
            keyword.lower() in lesson["root_cause"].lower() or
            keyword.lower() in lesson["resolution"].lower()):
            matches.append((eid, lesson))
    
    return matches

def get_preventive_tips(error_type):
    """获取预防建议"""
    tips = {
        "假执行": "创建文件后必须验证：1)文件路径正确 2)主流程确实读取 3)实际效果可观测",
        "分析错误": "分析前先读 SKILL.md 和核心文件，不确定时直接承认",
        "SyntaxWarning": "正则表达式使用 r'raw string' 格式",
        "UnicodeDecodeError": "文件保存为 UTF-8 编码",
        "ReferenceError": "函数参数检查默认值和顺序",
        "API超时": "外部 API 调用必须设置 timeout（10-30秒）"
    }
    return tips.get(error_type, "未知错误类型")

def main():
    if len(sys.argv) < 2:
        print("Usage: python lesson_lookup.py <error_type_or_keyword>")
        print("       python lesson_lookup.py --all")
        sys.exit(1)
    
    arg = sys.argv[1]
    
    if arg == "--all":
        lessons = load_lessons_index()
        print(f"所有教训 ({len(lessons)} 个):")
        for eid, lesson in lessons.items():
            print(f"\n  [{eid}] {lesson['error_type']}")
            print(f"    原因: {lesson['root_cause'][:50]}...")
            print(f"    解决: {lesson['resolution'][:50]}...")
            print(f"    状态: {lesson['status']}")
    else:
        matches = lookup_by_error_type(arg)
        if not matches:
            matches = lookup_by_keyword(arg)
        
        print(f"查找 '{arg}': {len(matches)} 个结果")
        for eid, lesson in matches:
            print(f"\n  [{eid}] {lesson['error_type']}")
            print(f"    原因: {lesson['root_cause']}")
            print(f"    解决: {lesson['resolution']}")
            print(f"    预防: {get_preventive_tips(lesson['error_type'])}")

if __name__ == "__main__":
    main()
