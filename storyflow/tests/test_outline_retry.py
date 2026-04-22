#!/usr/bin/env python3
"""Test with retry logic for MiniMax"""
import os
os.chdir(r'C:\Users\DELL\.openclaw\workspace\storyflow')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
import httpx

async def call_with_retry(prompt, system_prompt="", max_retries=3, timeout=120.0):
    api_key = os.environ['STORYFLOW_API_KEY']
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    payload = {
        "model": "MiniMax-M2.7",
        "messages": messages
    }
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    "https://api.minimax.chat/v1/text/chatcompletion_v2",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"  Attempt {attempt + 1} failed: {type(e).__name__}")
            if attempt < max_retries - 1:
                print(f"  Retrying in 2 seconds...")
                await asyncio.sleep(2)
            else:
                raise e

async def test_outline_node():
    print("=" * 60)
    print("Testing OutlineNode with Retry")
    print("=" * 60)
    
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
    
    print("\nCalling OutlineNode with 3 retries...")
    try:
        response = await call_with_retry(prompt, system_prompt, max_retries=3, timeout=120.0)
        print(f"\nSuccess! Response length: {len(response)}")
        print("\nFirst 500 chars:")
        print(response[:500])
    except Exception as e:
        print(f"\nAll retries failed: {e}")

asyncio.run(test_outline_node())