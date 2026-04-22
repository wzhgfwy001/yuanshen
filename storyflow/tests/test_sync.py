#!/usr/bin/env python3
"""Simple sync test"""
import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import requests

api_key = os.environ['STORYFLOW_API_KEY']
headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

# Simple test
payload = {
    "model": "MiniMax-M2.7",
    "messages": [{"role": "user", "content": "Say OK"}]
}

print("Testing MiniMax API (sync)...")
try:
    response = requests.post(
        "https://api.minimax.chat/v1/text/chatcompletion_v2",
        headers=headers,
        json=payload,
        timeout=30
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")

print("\nTesting with Chinese prompt...")
payload = {
    "model": "MiniMax-M2.7",
    "messages": [{"role": "user", "content": "写一个10章的大纲，主题是修仙"}]
}

try:
    response = requests.post(
        "https://api.minimax.chat/v1/text/chatcompletion_v2",
        headers=headers,
        json=payload,
        timeout=60
    )
    print(f"Status: {response.status_code}")
    result = response.json()
    content = result["choices"][0]["message"]["content"]
    print(f"Response length: {len(content)}")
    print(f"Content: {content[:200]}")
except Exception as e:
    print(f"Error: {e}")