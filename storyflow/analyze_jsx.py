with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the inline script (type=text/babel)
import re
match = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', content, re.DOTALL)
if match:
    jsx = match.group(1)
    print(f'JSX code length: {len(jsx)} chars')
    print('First 1000 chars:')
    print(jsx[:1000])
else:
    print('JSX script not found')