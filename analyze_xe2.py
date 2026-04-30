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

# Write the full xE function to a file for inspection
with open('xe_full.txt', 'w', encoding='utf-8', errors='ignore') as out:
    out.write(func_content)

print(f'xE function length: {len(func_content)} chars')
print('Wrote xe_full.txt')

# Find occurrences of data.type in the function
search = 'data.type'
pos = 0
count = 0
while True:
    pos = func_content.find(search, pos)
    if pos < 0:
        break
    count += 1
    pos += 1

print(f'Found {count} occurrences of "data.type" in xE function')