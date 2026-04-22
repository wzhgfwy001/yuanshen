#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""StoryFlow Full Test Suite"""
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')

import asyncio
import json
from engine import Workflow, Engine, Node, NodeResult

print("=" * 60)
print("StoryFlow Full Test Suite")
print("=" * 60)

# Test 1: Clear checkpoint and test
print("\n[TEST] Clear checkpoint then test")
print("-" * 40)

# Remove checkpoint for clean test
checkpoint_file = '.checkpoint_test.json'
if os.path.exists(checkpoint_file):
    os.remove(checkpoint_file)

from engine import Checkpoint, CheckpointManager
cm = CheckpointManager()

# Save a checkpoint
cp = Checkpoint(
    workflow_id='test',
    step=1,
    completed_nodes={'t1': {'result': 20}},
    timestamp='2026-04-20'
)
cm.save(cp)

# Load it back
loaded = cm.load('test')
print(f"Checkpoint save/load: {loaded is not None}")
print(f"Loaded step: {loaded.step if loaded else 'None'}")

# Test 2: AI Trace Detection
print("\n[TEST] AI Trace Detection")
print("-" * 40)

from storyflow_nodes import AITraceDetector, AITraceRemover

detector = AITraceDetector()

test_cases = [
    ("值得注意的是，总的来说，我们需要认真对待这个问题。", "template phrases"),
    ("首先，其次，最后，总而言之。", "sequential markers"),
    ("毫无疑问，无可否认，必须承认。", "overused emphasis"),
    ("这个故事讲述了一个人在陌生城市中寻找自我的旅程。", "normal text"),
]

for text, desc in test_cases:
    result = detector.detect(text)
    score = result["ai_trace_score"]
    issues = result["total_issues"]
    print(f"{desc}: score={score:.2f}, issues={issues}")

print("\n[TEST] AI Trace Removal")
remover = AITraceRemover(intensity="medium")
ai_text = "值得注意的是，总的来说，我们需要认真对待这个问题。"
cleaned = remover.remove_ai_traces(ai_text)
print(f"Original: {ai_text}")
print(f"Cleaned:  {cleaned}")

# Test 3: Truth File Nodes
print("\n[TEST] Truth File Nodes")
print("-" * 40)

from storyflow_nodes import CurrentStateNode, CharacterMatrixNode

# Test CurrentStateNode
import tempfile
with tempfile.TemporaryDirectory() as tmpdir:
    cs_node = CurrentStateNode("current_state", base_dir=tmpdir)
    cs_node.input_values = {
        "update_mode": "overwrite",
        "chapter_ref": "Chapter 1",
        "character_states": {"Alice": {"location": "Forest", "hp": 100}},
        "location": "Forest",
        "time": "Day 1",
        "plot_progress": "Adventure begins"
    }
    result = cs_node.execute()
    print(f"CurrentStateNode: success={result.success}")
    print(f"  Output keys: {list(result.data.keys())}")

# Test 4: Workflow Config
print("\n[TEST] Workflow Config")
print("-" * 40)

with open("workflow_config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

print(f"Workflow: {config['workflow_id']}")
print(f"Name: {config['name']}")
print(f"Nodes: {len(config['nodes'])}")
print(f"Connections: {len(config['connections'])}")
print(f"Provider: {config.get('provider', 'N/A')}")

# List node types
node_types = [n['type'] for n in config['nodes']]
print(f"Node types: {node_types}")

# Test 5: NODE_REGISTRY
print("\n[TEST] NODE_REGISTRY")
print("-" * 40)

from nodes import NODE_REGISTRY
print(f"Available node types: {list(NODE_REGISTRY.keys())}")
print(f"Count: {len(NODE_REGISTRY)}")

print("\n" + "=" * 60)
print("Test Suite Complete!")
print("=" * 60)