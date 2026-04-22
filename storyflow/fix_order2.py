with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Current order: React -> ReactDOM -> ReactFlow -> Babel -> JSX
# The JSX script has defer, which means it will execute after parsing
# But Babel needs to transpile it first, and Babel loading (3MB) delays everything

# Let's move Babel to the very END (after the JSX script)
# This way: React/ReactDOM/ReactFlow/JSX all load first, THEN Babel transpiles

# First, remove Babel from its current position
import re

babel_pattern = r'    <script src="/static/babel\.min\.js"></script>\n'
babel_match = re.search(babel_pattern, content)

if babel_match:
    print(f'Found Babel at position {babel_match.start()}')
    babel_tag = '    <script src="/static/babel.min.js"></script>\n'
    content_without_babel = content[:babel_match.start()] + content[babel_match.end():]
    
    # Find the end of the JSX script (</script>)
    jsx_match = re.search(r'<script type="text/babel"[^>]*>', content_without_babel)
    if jsx_match:
        jsx_end = content_without_babel.find('</script>', jsx_match.end())
        jsx_end += len('</script>')
        print(f'JSX ends at position {jsx_end}')
        
        # Insert Babel at the very end (before </body> or at end of body)
        # For now, just append it right after JSX script
        new_content = content_without_babel[:jsx_end] + '\n' + babel_tag + content_without_babel[jsx_end:]
        
        with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Moved Babel to after JSX script')
else:
    print('Babel not found')