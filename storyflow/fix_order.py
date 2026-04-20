with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Current order: React -> ReactDOM -> ReactFlow -> Babel -> JSX
# We want: React -> ReactDOM -> ReactFlow -> JSX -> Babel (at end)

# Find the JSX inline script (type="text/babel")
jsx_match = re.search(r'<script type="text/babel"([^>]*)>', content)
# Find the Babel script
babel_match = re.search(r'<script src="/static/babel\.min\.js"></script>\n    ', content)

if jsx_match and babel_match:
    print(f'JSX at: {jsx_match.start()}')
    print(f'Babel at: {babel_match.start()}')
    
    # Remove Babel from its current position
    content_without_babel = content[:babel_match.start()] + content[babel_match.end():]
    
    # Find the closing </script> of the JSX inline script
    jsx_end = content.find('</script>', jsx_match.end())
    if jsx_end > 0:
        jsx_end += len('</script>')
        print(f'JSX ends at: {jsx_end}')
        
        # Insert Babel right after the JSX script
        new_content = content_without_babel[:jsx_end] + '\n    <script src="/static/babel.min.js"></script>' + content_without_babel[jsx_end:]
        
        with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Moved Babel after JSX script')
else:
    print('Could not find scripts')