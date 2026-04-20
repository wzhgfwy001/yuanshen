with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all component function definitions that return JSX
import re

# Find functions that have return statements with JSX (looking for <div, <span, etc.)
functions = re.findall(r'function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*return\s*\(', content)
print(f'Found {len(functions)} component functions with JSX return:')
for f in functions:
    print(f'  - {f}')

# Count arrow functions with JSX returns
arrow_functions = re.findall(r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\(', content)
print(f'\nFound {len(arrow_functions)} arrow component functions:')
for f in arrow_functions:
    print(f'  - {f}')

# Show line count
lines = content.split('\n')
print(f'\nTotal lines in JSX script: {len(lines)}')