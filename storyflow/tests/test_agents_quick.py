import os
import sys
sys.path.insert(0, r'C:\Users\DELL\.openclaw\workspace\storyflow')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
from engine import MiniMaxProvider

async def main():
    print("Testing MiniMaxProvider...")
    provider = MiniMaxProvider(os.environ['STORYFLOW_API_KEY'])
    print(f"Timeout: {provider.timeout}, Retries: {provider.max_retries}")
    
    print("\n[1] Simple test...")
    r = await provider.call('Say OK')
    print(f"  Result: {r}")
    
    print("\n[2] Frontend Expert...")
    r = await provider.call(
        "设计一个登录表单组件，包含用户名、密码、登录按钮。使用React。",
        "你是一位资深前端架构师。"
    )
    print(f"  Result: {r[:100]}...")
    
    print("\n[3] Backend Expert...")
    r = await provider.call(
        "设计一个登录API，使用Django REST Framework。",
        "你是一位资深后端架构师。"
    )
    print(f"  Result: {r[:100]}...")
    
    print("\n[4] Architect...")
    r = await provider.call(
        "为高考志愿系统设计架构。",
        "你是一位系统架构师。"
    )
    print(f"  Result: {r[:100]}...")
    
    print("\n[5] Code Reviewer...")
    r = await provider.call(
        "审查: def check(p): return p=='secret'",
        "你是一位代码审查专家。"
    )
    print(f"  Result: {r[:100]}...")
    
    print("\n✅ All tests completed!")

asyncio.run(main())