#!/usr/bin/env python3
"""
Fix the inline script loading order - ensure proper sequence
"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Ensure there's proper separation between the last script tag and inline script
content = content.replace(
    '</script><script>',
    '</script>\n    <script>'
)

# Write back
with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed script tag separation")

# Verify
with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '<script' in line or '</script>' in line:
        print(f'Line {i+1}: {line.rstrip()}')