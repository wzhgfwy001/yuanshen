import os, sys
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'
import asyncio
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
    e = Engine(wf, False, False)
    r = await e.execute()
    print('OK' if r['success'] else 'FAIL')
asyncio.run(test())
