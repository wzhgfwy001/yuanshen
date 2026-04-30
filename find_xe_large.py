import os

os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find xE function - look for 'function xE(' or 'const xE='
patterns = ['function xE(', 'const xE=', 'xE=P=>']
for p in patterns:
    idx = content.find(p)
    if idx >= 0:
        print(f'Found pattern "{p}" at {idx}')
        # Extract a larger chunk
        start = idx
        end = min(len(content), idx + 5000)
        with open('xe_large.txt', 'w', encoding='utf-8', errors='ignore') as out:
            out.write(content[start:end])
        print(f'Wrote xe_large.txt ({end-start} chars)')
        break