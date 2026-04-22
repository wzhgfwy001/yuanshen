#!/usr/bin/env python3
"""Test the fixed MiniMaxProvider with retry and longer timeout"""
import sys
import io
import os

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
from engine import MiniMaxProvider

print("=" * 60)
print("Testing Fixed MiniMaxProvider")
print("=" * 60)

provider = MiniMaxProvider(os.environ['STORYFLOW_API_KEY'])
print(f"Timeout: {provider.timeout}s")
print(f"Max retries: {provider.max_retries}")

# Test 1: Simple prompt
print("\n[Test 1] Simple prompt")
try:
    result = asyncio.run(provider.call("Say OK"))
    print(f"  Success! Response: {result[:50]}")
except Exception as e:
    print(f"  Failed: {e}")

# Test 2: Outline prompt (the one that failed before)
print("\n[Test 2] Outline prompt (longer processing)")
system_prompt = "你是一位专业的小说大纲规划师，擅长创建精彩的故事情节结构。你的大纲应该包含明确的起承转合，每章标题和关键节点。"

prompt = """为下面世界观创建一个详细的小说大纲：

世界观背景：一个修仙世界，有五大宗门，灵气修炼体系
章节数量：10章
故事结构：起承转合

要求
1. 明确的故事线索（起承转合）
2. 每章一个标题，不少于50字简介
3. 标注关键节点
4. 确保情节连贯合理

请开始规划："""

try:
    result = asyncio.run(provider.call(prompt, system_prompt))
    print(f"  Success! Response length: {len(result)}")
    print(f"  First 200 chars: {result[:200]}")
except Exception as e:
    print(f"  Failed: {e}")

# Test 3: WorldBuildingNode style prompt
print("\n[Test 3] WorldBuildingNode style")
world_prompt = """请为以下题材和主题构建一个详细的世界观：

题材：奇幻
主题：魔法与冒险

请提供：
1. 世界名称和基本描述（200字左右）
2. 魔法/力量体系（150字左右）
3. 主要国家或势力（100字左右）
4. 核心冲突（100字左右）

请用清晰的段落组织内容。"""

try:
    result = asyncio.run(provider.call(world_prompt))
    print(f"  Success! Response length: {len(result)}")
    print(f"  First 200 chars: {result[:200]}")
except Exception as e:
    print(f"  Failed: {e}")

print("\n" + "=" * 60)
print("Fixed MiniMaxProvider Test Complete!")
print("=" * 60)