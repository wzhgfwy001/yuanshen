#!/usr/bin/env python3
"""Quick test script for StoryFlow"""
import sys
import os

# Fix encoding for Windows
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')

print("=" * 60)
print("StoryFlow Quick Test")
print("=" * 60)

# Test engine
print("\n[1] Testing engine.py...")
try:
    from engine import Node, NodeResult, Workflow
    print("    [OK] engine.py imported")
except Exception as e:
    print(f"    [FAIL] {e}")

# Test nodes
print("\n[2] Testing nodes.py...")
try:
    from nodes import WorldBuildingNode, CharacterNode
    print("    [OK] nodes.py imported")
except Exception as e:
    print(f"    [FAIL] {e}")

# Test storyflow_nodes
print("\n[3] Testing storyflow_nodes.py...")
try:
    from storyflow_nodes import AITraceDetector, AITraceRemover
    print("    [OK] storyflow_nodes.py imported")
    
    # Quick detector test
    detector = AITraceDetector()
    test_text = "值得注意的是，总的来说，我们需要认真对待这个问题。"
    result = detector.detect(test_text)
    print(f"    [OK] AITraceDetector works - score: {result['ai_trace_score']:.2f}")
except Exception as e:
    print(f"    [FAIL] {e}")

# Test workflow config
print("\n[4] Testing workflow_config.json...")
try:
    import json
    with open("workflow_config.json", "r", encoding="utf-8") as f:
        config = json.load(f)
    print(f"    [OK] Config loaded: {config['name']}")
    print(f"    [OK] Nodes: {len(config['nodes'])}, Connections: {len(config['connections'])}")
except Exception as e:
    print(f"    [FAIL] {e}")

print("\n" + "=" * 60)
print("Quick test complete!")
print("=" * 60)