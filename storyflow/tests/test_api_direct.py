#!/usr/bin/env python3
"""Direct API test for MiniMax"""
import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
import httpx

async def test_api():
    api_key = os.environ['STORYFLOW_API_KEY']
    model = "MiniMax-M2.7"
    base_url = "https://api.minimax.chat/v1"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say 'API OK' if you can hear me"}
    ]
    
    payload = {
        "model": model,
        "messages": messages
    }
    
    print("Testing MiniMax API...")
    print(f"URL: {base_url}/text/chatcompletion_v2")
    print(f"Model: {model}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.post(
                f"{base_url}/text/chatcompletion_v2",
                headers=headers,
                json=payload
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test_api())