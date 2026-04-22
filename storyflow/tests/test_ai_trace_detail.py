#!/usr/bin/env python3
"""Detailed test for AI Trace Detection"""
import os
os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')

from storyflow_nodes import AITraceDetector

print("AI Trace Detection Tests")
print("=" * 50)

detector = AITraceDetector()

# Test cases with known AI patterns
test_cases = [
    ('模板短语测试：值得注意的是，总的来说，我们需要认真对待这个问题。', 'template phrases'),
    ('顺序词测试：首先，其次，最后，总而言之。', 'sequential markers'),
    ('强调词测试：毫无疑问，无可否认，必须承认。', 'overused emphasis'),
    ('正常文本：这个故事讲述了一个人在陌生城市中寻找自我的旅程。', 'normal text'),
]

for text, desc in test_cases:
    result = detector.detect(text)
    score = result["ai_trace_score"]
    issues = result["total_issues"]
    print(f"{desc}")
    print(f"  score: {score:.2f}, issues: {issues}")
    if issues > 0:
        for issue in result["issues"][:2]:
            print(f"    - [{issue['type']}] {issue['description'][:50]}")
    print()

print("=" * 50)
print("Test complete!")