#!/usr/bin/env python3
"""Remove the ReactFlow test code from index.html"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the test code section
marker = "const root = ReactDOM.createRoot"
idx = content.find(marker)
if idx > 0:
    # Find the test code before the marker
    test_marker = '// ===== ReactFlow Test'
    test_idx = content.find(test_marker, 0, idx)
    if test_idx > 0:
        print(f'Found test code at position {test_idx}')
        # Remove the test code (from test_marker to just before marker)
        new_content = content[:test_idx] + content[idx:]
        with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Removed test code')
    else:
        print('Test code not found')
else:
    print('Marker not found')
