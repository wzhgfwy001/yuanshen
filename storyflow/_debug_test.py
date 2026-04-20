import os, sys
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'

import asyncio
import traceback
import inspect
from engine import ProviderFactory, Workflow, Engine
from nodes import WorldBuildingNode, CharacterNode

async def test():
    p = ProviderFactory.create('minimax', os.environ['STORYFLOW_API_KEY'], 'MiniMax-M2.7')
    
    wb = WorldBuildingNode('world', provider=p)
    wb.set_input('genre', '奇幻')
    wb.set_input('theme', '魔法')
    
    ch = CharacterNode('char', provider=p)
    
    wf = Workflow('t', 't')
    wf.add_node(wb)
    wf.add_node(ch)
    wf.add_connection('world', 'world_description', 'char', 'world_description')
    
    print('Topological sort:', wf.topological_sort())
    
    # 手动执行看哪一步出错
    print('Propagating to char...')
    wf.propagate_to_node('char')
    print('char inputs:', ch.input_values)
    
    print('Validating inputs...')
    print('char validate:', ch.validate_inputs())
    
    print('Checking if execute is coroutine:')
    print('  wb.execute is coroutine:', inspect.iscoroutinefunction(wb.execute))
    print('  ch.execute is coroutine:', inspect.iscoroutinefunction(ch.execute))
    
    print('Executing wb...')
    try:
        r = await wb.execute()
        print('wb result success:', r.success)
        if not r.success:
            print('wb error:', r.error)
    except Exception as e:
        print('wb exception:', str(e))
        traceback.print_exc()
    
    print('Executing ch...')
    try:
        r = await ch.execute()
        print('ch result success:', r.success)
        if not r.success:
            print('ch error:', r.error)
    except Exception as e:
        print('ch exception:', str(e))
        traceback.print_exc()

asyncio.run(test())
