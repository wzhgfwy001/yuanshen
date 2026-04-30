import os
os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find xE function - try different patterns
patterns = ['function xE({selectedNode', 'const xE=', 'xE=P=>', 'xE=']
for p in patterns:
    idx = content.find(p)
    if idx >= 0:
        print(f'Found "{p}" at position {idx}')
        # Write context around it
        start = max(0, idx - 50)
        end = min(len(content), idx + 2000)
        with open('xe_context.txt', 'w', encoding='utf-8') as out:
            out.write(content[start:end])
        print(f'Wrote xe_context.txt ({end-start} chars)')
        break