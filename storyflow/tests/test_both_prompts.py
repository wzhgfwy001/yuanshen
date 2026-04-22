#!/usr/bin/env python3
"""Test with longer timeout and retry"""
import os
os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
import httpx

async def test():
    api_key = os.environ['STORYFLOW_API_KEY']
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Test with a simple Chinese prompt (like WorldBuildingNode used)
    world_prompt = """请为以下题材和主题构建一个详细的世界观：

题材：奇幻
主题：魔法与冒险

请提供：
1. 世界名称和基本描述（200字左右）
2. 魔法/力量体系（150字左右）
3. 主要国家或势力（100字左右）
4. 核心冲突（100字左右）

请用清晰的段落组织内容。"""
    
    outline_prompt = """为下面世界观创建一个详细的小说大纲：

世界观背景：一个修仙世界，有五大宗门，灵气修炼体系
章节数量：10章
故事结构：起承转合

要求
1. 明确的故事线索（起承转合）
2. 每章一个标题，不少于50字简介
3. 标注关键节点
4. 确保情节连贯合理

请开始规划："""
    
    messages = [
        {"role": "user", "content": world_prompt}
    ]
    
    payload = {
        "model": "MiniMax-M2.7",
        "messages": messages
    }
    
    print("Test 1: World-building-like prompt")
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.minimax.chat/v1/text/chatcompletion_v2",
                headers=headers,
                json=payload
            )
            print(f"  Status: {response.status_code}")
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            print(f"  Response length: {len(content)}")
            print(f"  First 100 chars: {content[:100]}")
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")
    
    print("\nTest 2: Outline prompt")
    messages = [{"role": "user", "content": outline_prompt}]
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.minimax.chat/v1/text/chatcompletion_v2",
                headers=headers,
                json=payload
            )
            print(f"  Status: {response.status_code}")
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            print(f"  Response length: {len(content)}")
            print(f"  First 100 chars: {content[:100]}")
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")

asyncio.run(test())