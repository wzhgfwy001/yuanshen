#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Debug OutlineNode test"""
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
from nodes import OutlineNode, get_provider

print("=" * 60)
print("Debugging OutlineNode")
print("=" * 60)

provider = get_provider("minimax")
print(f"Provider: {provider.__class__.__name__}")

# Create OutlineNode
outline_node = OutlineNode("outline_test", provider=provider)

# Set inputs
outline_node.set_input("world_description", "一个修仙世界，有五大宗门，灵气修炼体系")
outline_node.set_input("chapter_count", 10)
outline_node.set_input("story_arc", "起承转合")

print("\nInputs set:")
print(f"  world_description: {outline_node.input_values.get('world_description', '')[:50]}...")
print(f"  chapter_count: {outline_node.input_values.get('chapter_count')}")
print(f"  story_arc: {outline_node.input_values.get('story_arc')}")

# Execute
print("\nExecuting OutlineNode...")
try:
    result = asyncio.run(outline_node.execute())
    print(f"\nSuccess: {result.success}")
    if result.success:
        print(f"Outline length: {len(result.data.get('outline', ''))}")
        print(f"Chapters: {result.data.get('chapters', [])}")
        print(f"Chapter count: {result.data.get('chapter_count', 0)}")
        print(f"\nFirst 300 chars of outline:")
        print(result.data.get('outline', '')[:300])
    else:
        print(f"Error: {result.error}")
except Exception as e:
    print(f"Exception: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)