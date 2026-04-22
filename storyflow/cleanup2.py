#!/usr/bin/env python3
"""
Remove Babel and convert the inline script to plain JavaScript
"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# 1. Remove the Babel script tag - more flexible pattern
babel_pattern = r'<script src="/static/babel\.min\.js"></script>\s*'
content = re.sub(babel_pattern, '', content)
print("Removed Babel script")

# 2. Change type="text/babel" to just a regular script
content = re.sub(
    r'<script type="text/babel"[^>]*>',
    '<script>',
    content
)
print("Changed inline script to plain JavaScript")

# Write back
with open('C:/Users/DELL\.openclaw\workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")

# Verify the script tags
print("\nCurrent script tags:")
for m in re.finditer(r'<script', content):
    start = m.start()
    end = content.find('>', start)
    print(f'{start}: {content[start:end+1]}')