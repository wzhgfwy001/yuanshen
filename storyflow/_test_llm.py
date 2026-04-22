import os, sys
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
import traceback
from engine import ProviderFactory
from nodes import WorldBuildingNode

async def test():
    print('Creating provider...')
    p = ProviderFactory.create('minimax', os.environ['STORYFLOW_API_KEY'], 'MiniMax-M2.7')
    print(f'Provider: {p.base_url}')
    
    print('Creating node...')
    wb = WorldBuildingNode('world', provider=p)
    wb.set_input('genre', '奇幻')
    wb.set_input('theme', '魔法')
    
    print('Calling LLM...')
    try:
        result = await wb.execute()
        print('SUCCESS' if result.success else 'FAILED')
        if result.success:
            print('Output:', result.data.get('world_description', '')[:100])
        else:
            print('Error:', result.error)
    except Exception as e:
        print('Exception:', str(e))
        traceback.print_exc()

asyncio.run(test())
