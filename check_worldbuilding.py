import os
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Search for radar
search = 'radar'
idx = content.find(search)
if idx >= 0:
    start = max(0, idx - 100)
    end = min(len(content), idx + 200)
    print('Found radar! Context:')
    print(repr(content[start:end]))
else:
    print('radar NOT found in the file')

# Search for world_building
search2 = 'world_building'
idx2 = content.find(search2)
if idx2 >= 0:
    print('\nFound world_building! Context:')
    start = max(0, idx2 - 100)
    end = min(len(content), idx2 + 200)
    print(repr(content[start:end]))
else:
    print('\nworld_building NOT found in the file')