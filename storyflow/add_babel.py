with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the position after ReactFlow script and before the inline script
import re

# Find the ReactFlow closing script tag
rf_match = re.search(r'<script src="/static/react-flow\.min\.js"></script>', content)
babel_script = '<script src="/static/babel.min.js"></script>\n    '

if rf_match:
    insert_pos = rf_match.end()
    # Check what's after
    after = content[insert_pos:insert_pos+50]
    print(f'After ReactFlow: {repr(after)}')
    
    # Insert Babel before the inline script
    new_content = content[:insert_pos] + babel_script + content[insert_pos:]
    
    with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Babel script added successfully')
else:
    print('ReactFlow script not found')