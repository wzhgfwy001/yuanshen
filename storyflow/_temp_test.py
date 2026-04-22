import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'
import requests
import json

print('='*60)
print('StoryFlow 5-Agent 工作流测试')
print('='*60)

# Get the template first
print('\n[1] 获取 5-Agent 模板...')
r = requests.get('http://localhost:5001/api/storyflow/templates')
templates = r.json()['templates']
template = templates['storyflow_5agent']
print(f'    模板名称: {template["name"]}')
print(f'    节点数: {len(template["nodes"])}')

# Execute with the template
print('\n[2] 执行 StoryFlow 5-Agent 工作流...')
config = {
    'name': template['name'],
    'provider': 'minimax',
    'model': 'MiniMax-M2.7',
    'use_cache': False,
    'use_checkpoint': False,
    'workflow_type': 'storyflow',
    'nodes': template['nodes'],
    'connections': template['connections'],
    'loop_config': template.get('loop_config', {})
}

r = requests.post('http://localhost:5001/api/workflow/execute', json={'config': config}, timeout=180)
print(f'    Status: {r.status_code}')
if r.status_code != 200:
    print(f'    Error: {r.text[:500]}')
else:
    data = r.json()
    print(f'    Success: {data.get("success")}')
    if data.get('success'):
        results = data.get('results', {})
        print(f'    Results keys: {list(results.keys())}')
    else:
        print(f'    Error: {data.get("error", "Unknown error")}')

print('\n' + '='*60)
print('测试完成!')
print('='*60)
