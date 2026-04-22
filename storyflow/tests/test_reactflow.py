#!/usr/bin/env python3
"""
Test if ReactFlow is available after script loading
"""

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Create a minimal test version
test_html = '''<!DOCTYPE html>
<html>
<head>
    <script src="/static/react.production.min.js"></script>
    <script src="/static/react-dom.production.min.js"></script>
    <script src="/static/react-flow.min.js"></script>
</head>
<body>
<script>
console.log('React type:', typeof React);
console.log('ReactFlow type:', typeof ReactFlow);
if (typeof ReactFlow !== 'undefined') {
    console.log('ReactFlow available!');
    console.log('ReactFlow has Background:', typeof ReactFlow.Background);
} else {
    console.log('ReactFlow NOT available');
}
</script>
</body>
</html>'''

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/test.html', 'w', encoding='utf-8') as f:
    f.write(test_html)

print("Created test.html")