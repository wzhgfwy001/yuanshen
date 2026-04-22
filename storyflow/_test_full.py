import os
os.environ['STORYFLOW_API_KEY'] = 'sk-cp-3n-fXwqj0y26NQku29UDhAEXGVMxkY2DxcX7qxyaBpJOg5WPazgON6D2yaOE0-Q5bTuvyYzSpD6E8CbG2vm7orX-LuMxJGm_WKtZ5EBo6ws3kMS6VPrg8-o'
import requests
import json

print('='*60)
print('StoryFlow 5-Agent 完整测试')
print('='*60)

# Step 1: Check server
print('\n[1] 检查服务器...')
r = requests.get('http://localhost:5001/api/workflow/state', timeout=10)
print(f'    状态: {r.json()["status"]}')

# Step 2: Get template
print('\n[2] 加载 5-Agent 模板...')
r = requests.get('http://localhost:5001/api/storyflow/templates', timeout=10)
template = r.json()['templates']['storyflow_5agent']
print(f'    模板: {template["name"]}')
print(f'    节点: {[n["id"] for n in template["nodes"]]}')

# Step 3: Execute with proper inputs
print('\n[3] 执行 5-Agent 工作流...')
config = {
    'name': template['name'],
    'provider': 'minimax',
    'model': 'MiniMax-M2.7',
    'use_cache': True,
    'use_checkpoint': False,
    'workflow_type': 'storyflow',
    'nodes': [
        {'id': 'radar', 'type': 'radar', 'x': 100, 'y': 100, 'inputs': {'genre': '星际探险', 'platform': '起点'}},
        {'id': 'architect', 'type': 'architect', 'x': 350, 'y': 100, 'inputs': {'chapter_number': 1, 'target_words': 2000}},
        {'id': 'writer', 'type': 'writer', 'x': 600, 'y': 100, 'inputs': {}},
        {'id': 'auditor', 'type': 'audit_33d', 'x': 850, 'y': 100, 'inputs': {}},
        {'id': 'reviser', 'type': 'revise', 'x': 1100, 'y': 100, 'inputs': {}}
    ],
    'connections': template['connections'],
    'loop_config': {'enabled': False}
}

r = requests.post('http://localhost:5001/api/workflow/execute', json={'config': config}, timeout=300)
print(f'    Status: {r.status_code}')

if r.status_code != 200:
    print(f'    Error: {r.text[:1000]}')
else:
    data = r.json()
    print(f'    Success: {data.get("success")}')
    if data.get('success'):
        results = data.get('results', {})
        print(f'    结果节点: {list(results.keys())}')
        if 'writer' in results:
            draft = results['writer'].get('chapter_draft', '')
            print(f'    章节字数: {len(draft)}')
            if draft:
                print(f'    章节预览: {draft[:200]}...')
    else:
        print(f'    Error: {data.get("error", "Unknown")}')

print('\n' + '='*60)
print('测试完成!')
print('='*60)
