import os, re
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find xE function 
idx = content.find('function xE({selectedNode')
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

# Find all data.type comparisons
pattern = r'e\.data\.type==="([^"]+)"'
matches = re.findall(pattern, func_content)
print('Node types WITH UI in properties panel:')
for m in matches:
    print(f'  {m}')

print(f'\nTotal: {len(matches)} node types have custom UI')
print('\nSo world_building has no custom UI - it falls through without inputs!')