import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'
import requests
import json

print('='*60)
print('StoryFlow 完整功能测试')
print('='*60)

# Test 1: State endpoint
print('\n[1] 测试 /api/workflow/state')
r = requests.get('http://localhost:5001/api/workflow/state')
print(f'    Status: {r.status_code}')
print(f'    Response: {r.json()}')

# Test 2: Basic workflow execution
print('\n[2] 测试 Basic Workflow (world_building)')
r = requests.post('http://localhost:5001/api/workflow/execute', json={
    'config': {
        'name': 'Test',
        'provider': 'minimax',
        'model': 'MiniMax-M2.7',
        'use_cache': False,
        'use_checkpoint': False,
        'workflow_type': 'basic',
        'nodes': [{'id': 'wb1', 'type': 'world_building', 'x': 100, 'y': 100, 'inputs': {}}],
        'connections': []
    }
}, timeout=60)
print(f'    Status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'    Success: {data.get("success")}')
    print(f'    Node wb1 output keys: {list(data.get("results", {}).get("wb1", {}).keys())}')

# Test 3: StoryFlow 5-Agent workflow
print('\n[3] 测试 StoryFlow 5-Agent Workflow')
r = requests.post('http://localhost:5001/api/workflow/execute', json={
    'config': {
        'name': 'StoryFlow 5-Agent',
        'provider': 'minimax',
        'model': 'MiniMax-M2.7',
        'use_cache': False,
        'use_checkpoint': False,
        'workflow_type': 'storyflow',
        'nodes': [
            {'id': 'outline', 'type': 'outline_generation', 'x': 100, 'y': 100, 'inputs': {'theme': '星际探险'}},
            {'id': 'char', 'type': 'character_generation', 'x': 300, 'y': 100, 'inputs': {'character_count': '3'}},
        ],
        'connections': [
            {'source_node': 'outline', 'source': 'outline', 'target_node': 'char', 'target': 'theme'}
        ]
    }
}, timeout=120)
print(f'    Status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'    Success: {data.get("success")}')
    results = data.get('results', {})
    print(f'    Results keys: {list(results.keys())}')
    if 'outline' in results:
        print(f'    Outline output keys: {list(results["outline"].keys())}')

print('\n' + '='*60)
print('测试完成!')
print('='*60)
