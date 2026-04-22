#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""StoryFlow End-to-End Test with MiniMax API"""
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')

# Set API Key
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

print("=" * 60)
print("StoryFlow End-to-End Test with MiniMax API")
print("=" * 60)
print(f"API Key: {os.environ['STORYFLOW_API_KEY'][:12]}...")

import asyncio
from engine import Workflow, Engine, Node, NodeResult

# Test 1: WorldBuildingNode with Real API
print("\n[TEST 1] WorldBuildingNode (LLM)")
print("-" * 40)

from nodes import WorldBuildingNode, get_provider

try:
    provider = get_provider("minimax")
    print(f"Provider: {provider.__class__.__name__}")
    print(f"Model: {getattr(provider, 'model', 'N/A')}")
    
    wb_node = WorldBuildingNode("world_build", provider=provider)
    wb_node.set_input("genre", "玄幻")
    wb_node.set_input("theme", "修仙与成长")
    
    print("Executing WorldBuildingNode...")
    result = asyncio.run(wb_node.execute())
    
    print(f"Success: {result.success}")
    if result.success:
        world_desc = result.data.get('world_description', '')
        magic = result.data.get('magic_system', '')
        print(f"World description: {world_desc[:200]}...")
        print(f"Magic system: {magic[:100]}...")
    else:
        print(f"Error: {result.error}")
        
except Exception as e:
    print(f"FAIL: {e}")
    import traceback
    traceback.print_exc()

# Test 2: CharacterNode
print("\n[TEST 2] CharacterNode (LLM)")
print("-" * 40)

from nodes import CharacterNode

try:
    char_node = CharacterNode("character", provider=provider)
    char_node.set_input("world_description", "一个修仙世界，有五大宗门")
    char_node.set_input("character_type", "主角")
    char_node.set_input("magic_system", "灵气修炼体系")
    
    print("Executing CharacterNode...")
    result = asyncio.run(char_node.execute())
    
    print(f"Success: {result.success}")
    if result.success:
        profile = result.data.get('character_profile', '')
        motivation = result.data.get('character_motivation', '')
        print(f"Character profile: {profile[:200]}...")
        print(f"Motivation: {motivation[:100]}...")
    else:
        print(f"Error: {result.error}")
        
except Exception as e:
    print(f"FAIL: {e}")

# Test 3: Complete Workflow
print("\n[TEST 3] Complete Workflow")
print("-" * 40)

from main import create_workflow_from_config

try:
    print("Creating workflow from config...")
    wf = create_workflow_from_config("workflow_config.json", provider=provider)
    print(f"Workflow: {wf.name}")
    print(f"Nodes: {len(wf.nodes)}")
    print(f"Connections: {len(wf.connections)}")
    
    # Show node details
    for node_id, node in wf.nodes.items():
        print(f"  - {node.name} ({node_id})")
        print(f"    inputs: {list(node.inputs.keys())}")
        print(f"    outputs: {list(node.outputs.keys())}")
    
    print("\nExecuting workflow (this may take a while)...")
    engine = Engine(wf)
    result = asyncio.run(engine.execute())
    
    print(f"\nWorkflow Success: {result['success']}")
    print(f"Execution time: {result.get('execution_time', 'N/A')}")
    
    # Show results
    print("\nResults:")
    for node_id, node_result in result.get('results', {}).items():
        node = wf.nodes[node_id]
        print(f"\n[{node.name}]")
        for key, value in node_result.items():
            if isinstance(value, str) and len(value) > 100:
                print(f"  {key}: {value[:100]}...")
            else:
                print(f"  {key}: {value}")
                
except Exception as e:
    print(f"FAIL: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("End-to-End Test Complete!")
print("=" * 60)