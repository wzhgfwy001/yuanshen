import os, re
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find sidebar items - look for the array with label/icon/nodeType
# The pattern would be something like: {type:"basic",icon:"...","label":"...","nodeType":"..."}
# Let's find the section with sidebar node definitions

# Search for the sidebar node list by looking for "World Building" context
search = 'World Building'
idx = content.find(search)
if idx >= 0:
    start = max(0, idx - 500)
    end = min(len(content), idx + 1000)
    with open('sidebar_nodes.txt', 'w', encoding='utf-8') as out:
        out.write(content[start:end])
    print('Wrote sidebar_nodes.txt')
else:
    print('World Building not found')