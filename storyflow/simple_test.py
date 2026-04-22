import os
import sys
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
from engine import ProviderFactory, Workflow, Engine
from nodes import WorldBuildingNode, CharacterNode

async def test():
    print("Testing StoryFlow...")
    
    # 创建提供商
    api_key = os.environ['STORYFLOW_API_KEY']
    provider = ProviderFactory.create('minimax', api_key, 'MiniMax-M2.7')
    
    # 创建节点
    wb = WorldBuildingNode('world', provider=provider)
    wb.set_input('genre', '奇幻')
    wb.set_input('theme', '魔法冒险')
    
    char = CharacterNode('character', provider=provider)
    
    # 创建工作流
    workflow = Workflow('test', 'Test Workflow')
    workflow.add_node(wb)
    workflow.add_node(char)
    workflow.add_connection('world', 'world_description', 'character', 'world_description')
    
    # 执行
    engine = Engine(workflow, use_cache=False, enable_checkpoint=False)
    result = await engine.execute()
    
    print(f"\nResult: {result['success']}")
    print(f"World description: {result['results']['world']['world_description'][:100]}...")
    print(f"Character profile: {result['results']['character']['character_profile'][:100]}...")

asyncio.run(test())
