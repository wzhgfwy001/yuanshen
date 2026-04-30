import os
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the main App component - look for id:"app"
search = 'id:"app"'
idx = content.find(search)
if idx >= 0:
    start = max(0, idx - 2000)
    end = min(len(content), idx + 500)
    with open('app_component.txt', 'w', encoding='utf-8') as out:
        out.write(content[start:end])
    print('Wrote app_component.txt')

# Also look for execute button click handler
# Search for the onClick that calls l()
search2 = 'onClick:l'
idx2 = content.find(search2)
if idx2 >= 0:
    start = max(0, idx2 - 100)
    end = min(len(content), idx2 + 200)
    with open('execute_btn.txt', 'w', encoding='utf-8') as out:
        out.write(content[start:end])
    print('Wrote execute_btn.txt')