#!/usr/bin/env python3
"""Test outline prompt with fixed provider"""
import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
from engine import MiniMaxProvider

print("Testing Outline prompt with fixed provider...")
print("=" * 50)

async def test():
    provider = MiniMaxProvider(os.environ['STORYFLOW_API_KEY'])
    
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

    print("Calling API with outline prompt...")
    result = await provider.call(prompt, system_prompt)
    print(f"\nSuccess! Response length: {len(result)}")
    print("\nFirst 500 chars:")
    print(result[:500])

asyncio.run(test())
print("\n" + "=" * 50)
print("Test complete!")