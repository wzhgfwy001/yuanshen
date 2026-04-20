#!/usr/bin/env python3
"""Add ReactFlow test to index.html"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of the inline script
marker = "const root = ReactDOM.createRoot"
idx = content.find(marker)
if idx > 0:
    test_code = '''
// ===== ReactFlow Test =====
console.log('=== ReactFlow Loading Test ===');
console.log('React type:', typeof React);
console.log('ReactDOM type:', typeof ReactDOM);
console.log('ReactFlow type:', typeof ReactFlow);
if (typeof ReactFlow !== 'undefined') {
    console.log('SUCCESS: ReactFlow is available!');
    console.log('ReactFlow.Background:', typeof ReactFlow.Background);
    console.log('ReactFlow.Controls:', typeof ReactFlow.Controls);
} else {
    console.log('FAIL: ReactFlow is NOT available!');
}
// ===== End Test =====

'''
    new_content = content[:idx] + test_code + content[idx:]
    with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Added ReactFlow test')
else:
    print('Could not find marker')
    print('Content[:200]:', content[:200])
