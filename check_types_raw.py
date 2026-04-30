import os
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

# Find all e.data.type== patterns
search = 'e.data.type==='
pos = 0
types_found = []
while True:
    pos = func_content.find(search, pos)
    if pos < 0:
        break
    # Get the string after ===
    snippet = func_content[pos:pos+50]
    types_found.append(snippet)
    pos += 1

print(f'Found {len(types_found)} occurrences of e.data.type===')
for t in types_found[:20]:
    print(f'  {t}')