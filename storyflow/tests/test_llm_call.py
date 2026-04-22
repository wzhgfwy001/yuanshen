#!/usr/bin/env python3
"""Debug LLM call more thoroughly"""
import os
os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
import httpx
from nodes import get_provider

async def test_llm_call():
    provider = get_provider("minimax")
    print(f"Provider: {provider.__class__.__name__}")
    print(f"Model: {getattr(provider, 'model', 'N/A')}")
    
    # Test with the exact same prompts as OutlineNode
    system_prompt = "你是一位专业的小说大纲规划师，擅长创建精彩的故事情节结构。你的大纲应该包含明确的起承转合，每章标题和关键节点。"
    
    world_desc = "一个修仙世界，有五大宗门，灵气修炼体系"
    chapter_count = 10
    story_arc = "起承转合"
    
    prompt = f"""为下面世界观创建一个详细的小说大纲：

世界观背景：{world_desc}
章节数量：{chapter_count}章
故事结构：{story_arc}

要求
1. 明确的故事线索（起承转合）
2. 每章一个标题，不少于50字简介
3. 标注关键节点
4. 确保情节连贯合理

请开始规划："""
    
    print(f"\nPrompt length: {len(prompt)}")
    print(f"System prompt length: {len(system_prompt)}")
    
    try:
        print("\nCalling LLM...")
        response = await provider.call(prompt, system_prompt)
        print(f"\nSuccess! Response length: {len(response)}")
        print(f"First 200 chars: {response[:200]}")
    except Exception as e:
        print(f"\nError: {e}")
        # Check what the actual error response is
        import traceback
        traceback.print_exc()

asyncio.run(test_llm_call())