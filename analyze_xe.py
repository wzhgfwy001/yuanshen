import os

os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the xE function and get its full content
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

# Find all specific node type conditions
import re
pattern = r'e\.data\.type==="([^"]+)"'
matches = re.findall(pattern, func_content)
print(f'Found {len(matches)} specific node types with custom UI:')
for m in matches:
    print(f'  - {m}')

# Find the end of the last specific type block
# Look for the pattern where specific types end and the final else/null would be
last_type = matches[-1] if matches else None
print(f'\nLast specific type: {last_type}')

# Find where the specific types section ends
# The structure should be: e.data.type==="X" && O.jsxs(..., then more e.data.type checks
# We want to find the last one and add our generic section after it

# Find the position after the last specific type block
if last_type:
    search = f'e.data.type==="{last_type}"'
    idx = func_content.rfind(search)  # Use rfind to find the LAST occurrence
    if idx >= 0:
        # Find the end of this block (look for }), pattern before the next thing)
        # Just find a safe spot after this block
        end_pos = idx + 500  # Approximate
        print(f'\nLast occurrence of {last_type} at {idx}')
        print('Context after last type:')
        print(repr(func_content[idx+100:idx+400]))