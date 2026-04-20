#!/usr/bin/env python3
"""
Create a minimal test to check ReactFlow loading
"""

test_html = '''<!DOCTYPE html>
<html>
<head>
    <title>ReactFlow Test</title>
</head>
<body>
    <div id="root"></div>
    <script src="/static/react.production.min.js"></script>
    <script src="/static/react-dom.production.min.js"></script>
    <script src="/static/react-flow.min.js"></script>
    <script>
        console.log('=== ReactFlow Loading Test ===');
        console.log('React type:', typeof React);
        console.log('ReactDOM type:', typeof ReactDOM);
        console.log('ReactFlow type:', typeof ReactFlow);
        if (typeof ReactFlow !== 'undefined') {
            console.log('SUCCESS: ReactFlow is available!');
            console.log('ReactFlow.Background:', typeof ReactFlow.Background);
            console.log('ReactFlow.Controls:', typeof ReactFlow.Controls);
        } else {
            console.log('FAIL: ReactFlow is NOT available');
        }
    </script>
</body>
</html>'''

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/test.html', 'w', encoding='utf-8') as f:
    f.write(test_html)

print("Created test.html")