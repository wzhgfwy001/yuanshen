import os
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find the sidebar node list - look for items array
# Search for the pattern that defines the draggable items
search = 'nodeType'
count = content.count(search)
print(f'nodeType found {count} times')

# Find the context of each occurrence
idx = 0
locations = []
while True:
    idx = content.find(search, idx)
    if idx < 0:
        break
    locations.append(idx)
    idx += 1

# Show first 5 occurrences with context
with open('nodetype_contexts.txt', 'w', encoding='utf-8') as out:
    for i, loc in enumerate(locations[:10]):
        start = max(0, loc - 100)
        end = min(len(content), loc + 200)
        out.write(f'--- Occurrence {i+1} at {loc} ---\n')
        out.write(content[start:end])
        out.write('\n\n')

print(f'Wrote {len(locations)} occurrences to nodetype_contexts.txt')