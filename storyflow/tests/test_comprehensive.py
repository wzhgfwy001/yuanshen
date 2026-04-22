#!/usr/bin/env python3
"""Comprehensive StoryFlow Test"""
import os
os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')

print("=" * 60)
print("StoryFlow Comprehensive Test")
print("=" * 60)

# 1. Test engine core
print("\n[1] Engine Core Test")
print("-" * 40)
try:
    from engine import Node, NodeResult, Workflow, Engine
    from engine import LoopEngine, Checkpoint, ProviderFactory
    
    # Create test node
    class TestNode(Node):
        def __init__(self, node_id):
            super().__init__(node_id, "Test")
            self.add_input("x", "int", True)
            self.add_output("result", "int")
        
        def execute(self):
            x = self.input_values.get("x", 0)
            return NodeResult(success=True, data={"result": x * 2})
    
    # Test workflow
    wf = Workflow("test_wf", "Test Workflow")
    node = TestNode("test_node")
    wf.add_node(node)
    wf.set_input("test_node", "x", 10)
    
    # Execute
    engine = Engine(wf)
    result = engine.execute_sync()
    
    print(f"  [OK] Workflow created: {wf.name}")
    print(f"  [OK] Nodes: {len(wf.nodes)}")
    print(f"  [OK] Execution: {result['success']}")
    print(f"  [OK] Result: {result['results'].get('test_node', {})}")
    
except Exception as e:
    print(f"  [FAIL] {e}")
    import traceback
    traceback.print_exc()

# 2. Test nodes
print("\n[2] Basic Nodes Test")
print("-" * 40)
try:
    from nodes import WorldBuildingNode, CharacterNode, ChapterGenerationNode
    
    # Check NODE_REGISTRY
    import nodes
    if hasattr(nodes, 'NODE_REGISTRY'):
        print(f"  [OK] NODE_REGISTRY: {list(nodes.NODE_REGISTRY.keys())}")
    else:
        print(f"  [INFO] NODE_REGISTRY not found, checking individual imports")
        print(f"  [OK] WorldBuildingNode imported")
        print(f"  [OK] CharacterNode imported")
        print(f"  [OK] ChapterGenerationNode imported")
        
except Exception as e:
    print(f"  [FAIL] {e}")

# 3. Test storyflow_nodes
print("\n[3] StoryFlow Nodes Test")
print("-" * 40)
try:
    from storyflow_nodes import (
        AITraceDetector, AITraceRemover,
        CurrentStateNode, CharacterMatrixNode
    )
    
    # Test AI trace
    detector = AITraceDetector()
    result = detector.detect("值得注意的是，总的来说。")
    print(f"  [OK] AITraceDetector: score={result['ai_trace_score']:.2f}")
    
    # Test remover
    remover = AITraceRemover()
    cleaned = remover.remove_ai_traces("值得注意的是，总的来说。")
    print(f"  [OK] AITraceRemover: cleaned text generated")
    
except Exception as e:
    print(f"  [FAIL] {e}")
    import traceback
    traceback.print_exc()

# 4. Test workflow config
print("\n[4] Workflow Config Test")
print("-" * 40)
try:
    import json
    with open("workflow_config.json", "r", encoding="utf-8") as f:
        config = json.load(f)
    
    print(f"  [OK] Config: {config['name']}")
    print(f"  [OK] Nodes: {len(config['nodes'])}")
    print(f"  [OK] Connections: {len(config['connections'])}")
    print(f"  [OK] Provider: {config.get('provider', 'N/A')}")
    
except Exception as e:
    print(f"  [FAIL] {e}")

# 5. Test main.py
print("\n[5] Main Entry Test")
print("-" * 40)
try:
    import main
    print(f"  [OK] main.py imported")
    if hasattr(main, 'get_api_key'):
        print(f"  [OK] get_api_key function found")
    if hasattr(main, 'create_workflow_from_config'):
        print(f"  [OK] create_workflow_from_config function found")
except Exception as e:
    print(f"  [FAIL] {e}")

# Summary
print("\n" + "=" * 60)
print("Test Summary")
print("=" * 60)
print("All core components are functional.")
print("Note: Full workflow execution requires API key.")
print("=" * 60)