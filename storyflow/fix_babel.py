with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the Babel script tag with type=text/babel
import re
match = re.search(r'<script type="text/babel"([^>]*)>', content)
if match:
    print('Found:', repr(match.group()))
    # Add defer attribute
    old = '<script type="text/babel" data-presets="react">'
    new = '<script type="text/babel" data-presets="react" defer>'
    new_content = content.replace(old, new)
    with open('C:/Users/DELL/.openclaw/workspace/storyflow/web/index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Added defer attribute')
else:
    print('Not found')