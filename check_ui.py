import os, re
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find xE function
idx = content.find('function xE({selectedNode')
if idx >= 0:
    start = idx
    depth = 0
    for i, c in enumerate(content[start:], start):
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    
    func_content = content[start:end]
    
    # Find all node type cases shown in UI
    cases = re.findall(r'e\.data\.type==="([^"]+)"', func_content)
    print('Node types with UI in properties panel:')
    for case in cases:
        print(f'  - {case}')
    
    # Check if world_building is in the list
    if 'world_building' in cases:
        print('\nworld_building IS in the UI list!')
    else:
        print('\nworld_building NOT in the UI list!')
        print('Available types:', cases)