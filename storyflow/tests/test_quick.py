#!/usr/bin/env python3
"""Quick test for fixed provider"""
import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
from engine import MiniMaxProvider

print("Testing fixed provider...")

async def test():
    provider = MiniMaxProvider(os.environ['STORYFLOW_API_KEY'])
    print(f"Timeout: {provider.timeout}, Retries: {provider.max_retries}")
    
    print("Calling API...")
    result = await provider.call("Hello, say OK")
    print(f"Result: {result}")

asyncio.run(test())
print("Done")