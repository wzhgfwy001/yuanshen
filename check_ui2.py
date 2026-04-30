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
    
    # Look for patterns around data.type
    pattern = r'data\.type==="[^"]+"'
    matches = re.findall(pattern, func_content)
    print('Matches found:', len(matches))
    for m in matches:
        print(f'  {m}')
    
    # Try single quotes
    pattern2 = r"data\.type==='[^']+'"
    matches2 = re.findall(pattern2, func_content)
    print('\nMatches with single quotes:', len(matches2))
    for m in matches2:
        print(f'  {m}')
    
    # Find the context around e.data.type
    idx2 = func_content.find('data.type')
    if idx2 >= 0:
        start2 = max(0, idx2 - 100)
        end2 = min(len(func_content), idx2 + 500)
        with open('datatype_context.txt', 'w', encoding='utf-8') as out:
            out.write(func_content[start2:end2])
        print('\nWrote datatype_context.txt')