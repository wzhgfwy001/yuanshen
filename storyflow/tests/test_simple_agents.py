#!/usr/bin/env python3
"""Simple sequential agent test"""
import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
from engine import MiniMaxProvider

async def main():
    provider = MiniMaxProvider(os.environ['STORYFLOW_API_KEY'])
    print("Testing 4 sequential agent tasks...")
    
    # Agent 1: Frontend
    print("\n[1] Frontend Expert...")
    result = await provider.call(
        "为一个登录页面设计React组件，包含用户名、密码输入框和登录按钮。输出JSON格式包含组件代码和样式。",
        "你是一位资深前端架构师，擅长React技术栈。"
    )
    print(f"  Result: {result[:100]}...")
    
    # Agent 2: Backend
    print("\n[2] Backend Expert...")
    result = await provider.call(
        "为一个登录API设计Django REST Framework接口，包含参数验证和JWT认证。输出JSON格式。",
        "你是一位资深后端架构师，擅长Python/Django。"
    )
    print(f"  Result: {result[:100]}...")
    
    # Agent 3: Architect
    print("\n[3] Architect...")
    result = await provider.call(
        "为一个高考志愿系统设计系统架构，包含前端、后端、数据库层。输出文字描述架构。",
        "你是一位系统架构师，擅长微服务架构。"
    )
    print(f"  Result: {result[:100]}...")
    
    # Agent 4: Code Review
    print("\n[4] Code Reviewer...")
    result = await provider.call(
        "审查这段代码：def login(u,p): return u=='admin' and p=='123'",
        "你是一位代码审查专家。"
    )
    print(f"  Result: {result[:100]}...")
    
    print("\n✅ All 4 agents completed!")

asyncio.run(main())