import os
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Search for radar
search = 'radar'
idx = content.find(search)
if idx >= 0:
    print('Found radar!')
else:
    print('radar NOT found')

# Search for world_building
search2 = 'world_building'
idx2 = content.find(search2)
if idx2 >= 0:
    print('Found world_building!')
else:
    print('world_building NOT found')

# Find all node types in the sidebar drag source
search3 = '"World Building"'
idx3 = content.find(search3)
if idx3 >= 0:
    print('Found World Building label!')
    # Show context
    start = max(0, idx3 - 200)
    end = min(len(content), idx3 + 300)
    with open('worldbuilding_ctx.txt', 'w', encoding='utf-8') as out:
        out.write(content[start:end])
    print('Wrote worldbuilding_ctx.txt')
else:
    print('World Building NOT found')