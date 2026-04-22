import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'
import requests
import json

print('='*60)
print('StoryFlow 5-Agent 工作流测试')
print('='*60)

# Get the template
print('\n[1] 获取模板...')
r = requests.get('http://localhost:5001/api/storyflow/templates')
template = r.json()['templates']['storyflow_5agent']

# Add initial inputs for radar node
template['nodes'][0]['inputs'] = {
    'genre': '星际探险',
    'platform': '起点',
    'trend_keywords': ['星际', '机甲', '科幻']
}

print('    模板:', template['name'])
print('    节点数:', len(template['nodes']))

# Execute with full template
print('\n[2] 执行 5-Agent 工作流...')
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

r = requests.post('http://localhost:5001/api/workflow/execute', json={'config': config}, timeout=120)
print('    Status:', r.status_code)

if r.status_code != 200:
    print('    Error:', r.text[:800])
else:
    data = r.json()
    print('    Success:', data.get('success'))
    if data.get('success'):
        results = data.get('results', {})
        print('    Results keys:', list(results.keys()))
        iteration = data.get('iteration_count', 0)
        print('    迭代次数:', iteration)
    else:
        print('    Error:', data.get('error', 'Unknown'))

print('\n' + '='*60)
print('测试完成!')
print('='*60)
