#!/usr/bin/env python3
"""Create a reliable ReactFlow test using window.onload"""

test_html = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ReactFlow Reliable Test</title>
</head>
<body>
    <h1>ReactFlow Loading Test</h1>
    <div id="result">Loading...</div>
    
    <!-- External scripts first -->
    <script src="/static/react.production.min.js"></script>
    <script src="/static/react-dom.production.min.js"></script>
    <script src="/static/react-flow.min.js"></script>
    
    <!-- Test in window.onload -->
    <script>
        window.addEventListener('load', function() {
            console.log('=== Window loaded ===');
            console.log('React:', typeof React);
            console.log('ReactDOM:', typeof ReactDOM);
            console.log('ReactFlow:', typeof ReactFlow);
            
            var result = document.getElementById('result');
            if (typeof ReactFlow !== 'undefined') {
                result.innerHTML = '<b style="color:green">SUCCESS! ReactFlow loaded</b><br>' +
                    'ReactFlow.Background: ' + (typeof ReactFlow.Background) + '<br>' +
                    'ReactFlow.Controls: ' + (typeof ReactFlow.Controls);
            } else {
                result.innerHTML = '<b style="color:red">FAIL: ReactFlow not loaded</b>';
            }
        });
    </script>
</body>
</html>'''

with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/test-onload.html', 'w', encoding='utf-8') as f:
    f.write(test_html)

print("Created test-onload.html")
print("Access at: http://localhost:5001/static/test-onload.html")
