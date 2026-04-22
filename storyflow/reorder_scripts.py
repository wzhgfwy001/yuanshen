with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Find the script blocks
# Scripts order: React -> ReactDOM -> ReactFlow -> Babel -> JSX
# We need to move Babel to the very beginning (after <head> or at start of body scripts)

# Find the Babel script tag
babel_match = re.search(r'<script src="/static/babel\.min\.js"></script>\n    ', content)
if babel_match:
    babel_tag = babel_match.group()
    print(f'Found Babel at position {babel_match.start()}: {repr(babel_tag)}')
    
    # Remove Babel from current position
    content_without_babel = content[:babel_match.start()] + content[babel_match.end():]
    
    # Find React script (first script)
    react_match = re.search(r'<script src="/static/react\.production\.min\.js"></script>', content_without_babel)
    if react_match:
        # Insert Babel right before React
        new_content = content_without_babel[:react_match.start()] + babel_tag + content_without_babel[react_match.start():]
        
        with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Moved Babel to front')
    else:
        print('React script not found')
else:
    print('Babel not found')