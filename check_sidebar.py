import os
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all unique node type labels in the sidebar
# Search for pattern like "World Building", "Character", etc.
search_terms = ['World Building', 'Character', 'Chapter Generation', 'Plot Event', 'Scene']
found = []
for term in search_terms:
    if term in content:
        found.append(term)

with open('found_terms.txt', 'w', encoding='utf-8') as out:
    out.write(str(found))

print('Done - wrote found_terms.txt')
print('Found:', found)